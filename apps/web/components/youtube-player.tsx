"use client";

import * as React from "react";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import type { PlaybackAdapter } from "../lib/playback/playback-adapter";
import { YouTubePlaybackAdapter } from "../lib/playback/youtube-adapter";

export interface YouTubePlayerRef {
  seekTo: (seconds: number) => void;
  seekRelative: (deltaSeconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  replay: () => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  getPlaybackRate: () => number;
  requestFullscreen: () => void;
}

interface YouTubePlayerProps {
  youtubeVideoId: string;
  title: string;
  url: string;
  startSeconds?: number;
  controlsMode?: "locus" | "native";
  onAdapterReady?: (adapter: PlaybackAdapter) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onStateChange?: (state: number) => void;
  onEnded?: () => void;
}

// Global declaration for YouTube IFrame API
declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: any }) => void;
            onStateChange?: (event: { data: number; target: any }) => void;
            onError?: (event: { data: number }) => void;
          };
        },
      ) => any;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const YouTubePlayer = React.forwardRef<
  YouTubePlayerRef,
  YouTubePlayerProps
>(function YouTubePlayer(
  {
    youtubeVideoId,
    title,
    url,
    startSeconds = 0,
    controlsMode = "native",
    onAdapterReady,
    onTimeUpdate,
    onStateChange,
    onEnded,
  },
  ref,
) {
  const containerId = React.useId().replace(/:/g, "_");
  const playerRef = React.useRef<any>(null);
  const [isReady, setIsReady] = React.useState(false);
  const [hasError, setHasError] = React.useState<number | null>(null);
  const timeUpdateIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Stable callback refs so changes in parent render never re-initialize the YouTube player
  const onTimeUpdateRef = React.useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  const onStateChangeRef = React.useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const onEndedRef = React.useRef(onEnded);
  onEndedRef.current = onEnded;

  const onAdapterReadyRef = React.useRef(onAdapterReady);
  onAdapterReadyRef.current = onAdapterReady;

  // Expose player imperative controls
  React.useImperativeHandle(
    ref,
    () => ({
      seekTo: (seconds: number) => {
        try {
          if (playerRef.current?.seekTo) {
            playerRef.current.seekTo(Math.max(0, seconds), true);
            const totalDur = playerRef.current.getDuration?.() || 0;
            onTimeUpdateRef.current?.(Math.max(0, seconds), totalDur);
          }
        } catch {}
      },
      seekRelative: (deltaSeconds: number) => {
        try {
          if (playerRef.current?.getCurrentTime && playerRef.current?.seekTo) {
            const current = playerRef.current.getCurrentTime() || 0;
            const totalDur = playerRef.current.getDuration?.() || 0;
            const target = Math.max(
              0,
              Math.min(totalDur > 0 ? totalDur : 999999, current + deltaSeconds),
            );
            playerRef.current.seekTo(target, true);
            onTimeUpdateRef.current?.(target, totalDur);
          }
        } catch {}
      },
      getCurrentTime: () => {
        try {
          return playerRef.current?.getCurrentTime
            ? playerRef.current.getCurrentTime()
            : 0;
        } catch {
          return 0;
        }
      },
      getDuration: () => {
        try {
          return playerRef.current?.getDuration
            ? playerRef.current.getDuration()
            : 0;
        } catch {
          return 0;
        }
      },
      play: () => {
        try {
          playerRef.current?.playVideo?.();
        } catch {}
      },
      pause: () => {
        try {
          playerRef.current?.pauseVideo?.();
        } catch {}
      },
      togglePlay: () => {
        try {
          if (playerRef.current?.getPlayerState) {
            const state = playerRef.current.getPlayerState();
            if (window.YT && state === window.YT.PlayerState.PLAYING) {
              playerRef.current.pauseVideo?.();
            } else {
              playerRef.current.playVideo?.();
            }
          }
        } catch {}
      },
      replay: () => {
        try {
          if (playerRef.current?.seekTo) {
            playerRef.current.seekTo(0, true);
            playerRef.current.playVideo?.();
            const totalDur = playerRef.current.getDuration?.() || 0;
            onTimeUpdateRef.current?.(0, totalDur);
          }
        } catch {}
      },
      setVolume: (volume: number) => {
        try {
          const clamped = Math.max(0, Math.min(100, volume));
          playerRef.current?.setVolume?.(clamped);
        } catch {}
      },
      getVolume: () => {
        try {
          return playerRef.current?.getVolume?.() ?? 100;
        } catch {
          return 100;
        }
      },
      toggleMute: () => {
        try {
          if (playerRef.current?.isMuted) {
            if (playerRef.current.isMuted()) {
              playerRef.current.unMute?.();
            } else {
              playerRef.current.mute?.();
            }
          }
        } catch {}
      },
      setPlaybackRate: (rate: number) => {
        try {
          playerRef.current?.setPlaybackRate?.(rate);
        } catch {}
      },
      getPlaybackRate: () => {
        try {
          return playerRef.current?.getPlaybackRate?.() ?? 1;
        } catch {
          return 1;
        }
      },
      requestFullscreen: () => {
        try {
          const iframe = document.getElementById(`yt-embed-${containerId}`);
          if (iframe?.requestFullscreen) {
            iframe.requestFullscreen();
          }
        } catch {}
      },
    }),
    [containerId],
  );

  // Time update polling while playing
  const startTimePolling = React.useCallback(() => {
    if (timeUpdateIntervalRef.current) return;

    timeUpdateIntervalRef.current = setInterval(() => {
      try {
        if (playerRef.current?.getCurrentTime) {
          const current = playerRef.current.getCurrentTime() || 0;
          const duration = playerRef.current.getDuration?.() || 0;
          onTimeUpdateRef.current?.(current, duration);
        }
      } catch {}
    }, 500);
  }, []);

  const stopTimePolling = React.useCallback(() => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
  }, []);

  // Load YouTube IFrame API script once and initialize player
  React.useEffect(() => {
    let isCancelled = false;

    const initPlayer = () => {
      if (isCancelled || !window.YT || !window.YT.Player) return;

      try {
        if (playerRef.current?.destroy) {
          try {
            playerRef.current.destroy();
          } catch {}
        }

        playerRef.current = new window.YT.Player(`yt-embed-${containerId}`, {
          videoId: youtubeVideoId,
          playerVars: {
            autoplay: 0,
            controls: controlsMode === "locus" ? 0 : 1,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            playsinline: 1,
            enablejsapi: 1,
            start: startSeconds > 0 ? Math.floor(startSeconds) : undefined,
          },
          events: {
            onReady: (event) => {
              if (isCancelled) return;
              setIsReady(true);
              if (startSeconds > 0) {
                event.target.seekTo(Math.floor(startSeconds), true);
              }
              try {
                const current = event.target.getCurrentTime?.() || startSeconds || 0;
                const duration = event.target.getDuration?.() || 0;
                if (current > 0 || duration > 0) {
                  onTimeUpdateRef.current?.(current, duration);
                }
              } catch {}
              const adapterInstance = new YouTubePlaybackAdapter(
                event.target,
                `yt-embed-${containerId}`,
                (curr, dur) => onTimeUpdateRef.current?.(curr, dur),
              );
              onAdapterReadyRef.current?.(adapterInstance);
            },
            onStateChange: (event) => {
              if (isCancelled) return;
              const state = event.data;
              onStateChangeRef.current?.(state);

              if (window.YT && state === window.YT.PlayerState.PLAYING) {
                startTimePolling();
              } else {
                stopTimePolling();
                try {
                  if (playerRef.current?.getCurrentTime) {
                    const current = playerRef.current.getCurrentTime() || 0;
                    const duration = playerRef.current.getDuration?.() || 0;
                    onTimeUpdateRef.current?.(current, duration);
                  }
                } catch {}
              }

              if (window.YT && state === window.YT.PlayerState.ENDED) {
                onEndedRef.current?.();
              }
            },
            onError: (event) => {
              if (isCancelled) return;
              setHasError(event.data);
            },
          },
        });
      } catch (err) {
        console.error("Failed to initialize YouTube IFrame Player:", err);
      }
    };

    if (!window.YT || !window.YT.Player) {
      const existingScript = document.getElementById("youtube-iframe-api");
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevCallback?.();
        initPlayer();
      };
    } else {
      initPlayer();
    }

    return () => {
      isCancelled = true;
      stopTimePolling();
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch {}
      }
    };
  }, [youtubeVideoId, containerId, startSeconds, controlsMode, startTimePolling, stopTimePolling]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border-2 border-border-strong shadow-brutal">
      {/* YouTube Player Mount Container */}
      <div
        id={`yt-embed-${containerId}`}
        className="w-full h-full object-cover"
        aria-label={`Video player for ${title}`}
      />

      {/* Loading Skeleton */}
      {!isReady && !hasError && (
        <div className="absolute inset-0 bg-surface-1 flex flex-col items-center justify-center gap-3 select-none">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-mono text-muted-foreground">
            Loading distraction-free player...
          </p>
        </div>
      )}

      {/* Fallback for blocked or restricted embeds (e.g. error 101/150) */}
      {hasError !== null && (
        <div className="absolute inset-0 bg-surface-1 p-6 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-destructive/15 text-destructive border-2 border-destructive flex items-center justify-center shadow-brutal-sm">
            <AlertCircle className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground m-0">
              Embedding Unavailable
            </h3>
            <p className="text-xs text-muted-foreground font-mono max-w-sm mt-1 mb-4">
              The creator of this video has restricted playback on third-party sites.
            </p>
          </div>
          <Button variant="default" size="sm" asChild className="gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <span>Watch on YouTube</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
});

