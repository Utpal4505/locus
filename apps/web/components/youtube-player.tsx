"use client";

import * as React from "react";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

export interface YouTubePlayerRef {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  play: () => void;
  pause: () => void;
  replay: () => void;
}

interface YouTubePlayerProps {
  youtubeVideoId: string;
  title: string;
  url: string;
  startSeconds?: number;
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

  // Expose player imperative controls
  React.useImperativeHandle(
    ref,
    () => ({
      seekTo: (seconds: number) => {
        if (playerRef.current?.seekTo) {
          playerRef.current.seekTo(seconds, true);
        }
      },
      getCurrentTime: () => {
        return playerRef.current?.getCurrentTime
          ? playerRef.current.getCurrentTime()
          : 0;
      },
      getDuration: () => {
        return playerRef.current?.getDuration
          ? playerRef.current.getDuration()
          : 0;
      },
      play: () => {
        playerRef.current?.playVideo?.();
      },
      pause: () => {
        playerRef.current?.pauseVideo?.();
      },
      replay: () => {
        if (playerRef.current?.seekTo) {
          playerRef.current.seekTo(0, true);
          playerRef.current.playVideo?.();
        }
      },
    }),
    [],
  );

  // Time update polling while playing
  const startTimePolling = React.useCallback(() => {
    if (timeUpdateIntervalRef.current) return;

    timeUpdateIntervalRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime && onTimeUpdate) {
        const current = playerRef.current.getCurrentTime() || 0;
        const duration = playerRef.current.getDuration?.() || 0;
        onTimeUpdate(current, duration);
      }
    }, 1000);
  }, [onTimeUpdate]);

  const stopTimePolling = React.useCallback(() => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => {
      stopTimePolling();
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [stopTimePolling]);

  // Load YouTube IFrame API script once
  React.useEffect(() => {
    let isCancelled = false;

    const initPlayer = () => {
      if (isCancelled || !window.YT || !window.YT.Player) return;

      try {
        playerRef.current = new window.YT.Player(`yt-embed-${containerId}`, {
          videoId: youtubeVideoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
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
            },
            onStateChange: (event) => {
              if (isCancelled) return;
              const state = event.data;
              onStateChange?.(state);

              if (window.YT && state === window.YT.PlayerState.PLAYING) {
                startTimePolling();
              } else {
                stopTimePolling();
                // Send immediate time update on pause
                if (playerRef.current?.getCurrentTime && onTimeUpdate) {
                  const current = playerRef.current.getCurrentTime() || 0;
                  const duration = playerRef.current.getDuration?.() || 0;
                  onTimeUpdate(current, duration);
                }
              }

              if (window.YT && state === window.YT.PlayerState.ENDED) {
                onEnded?.();
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
    };
  }, [youtubeVideoId, containerId, startSeconds, onStateChange, onTimeUpdate, onEnded, startTimePolling, stopTimePolling]);

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

