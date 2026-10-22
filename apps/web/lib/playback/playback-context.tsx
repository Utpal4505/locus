"use client";

import * as React from "react";
import type { PlaybackAdapter } from "./playback-adapter";

export type ControlsMode = "locus" | "native";

export interface PlaybackContextValue {
  adapter: PlaybackAdapter | null;
  currentTime: number;
  duration: number;
  progressPercent: number;
  isPlaying: boolean;
  isBuffering: boolean;
  isEnded: boolean;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  controlsMode: ControlsMode;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seekTo: (seconds: number) => void;
  seekRelative: (deltaSeconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  requestFullscreen: () => void;
  setControlsMode: (mode: ControlsMode) => void;
  registerAdapter: (adapter: PlaybackAdapter | null) => void;
  handleTimeTick: (current: number, dur: number) => void;
  handleStateChange: (state: number) => void;
}

const PlaybackContext = React.createContext<PlaybackContextValue | null>(null);

interface PlaybackProviderProps {
  children: React.ReactNode;
  initialDuration?: number;
  onAutoMarkWatched?: () => void;
  onVideoEnded?: () => void;
  onThrottledProgressSync?: (seconds: number) => void;
}

export function PlaybackProvider({
  children,
  initialDuration = 0,
  onAutoMarkWatched,
  onVideoEnded,
  onThrottledProgressSync,
}: PlaybackProviderProps) {
  const [adapter, setAdapter] = React.useState<PlaybackAdapter | null>(null);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(initialDuration);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isBuffering, setIsBuffering] = React.useState(false);
  const [isEnded, setIsEnded] = React.useState(false);
  const [volume, setVolumeState] = React.useState(100);
  const [isMuted, setIsMutedState] = React.useState(false);
  const [playbackRate, setPlaybackRateState] = React.useState(1);
  const [controlsMode, setControlsMode] = React.useState<ControlsMode>("locus");

  // Keep references to callbacks to avoid stale closures
  const onAutoMarkWatchedRef = React.useRef(onAutoMarkWatched);
  const onVideoEndedRef = React.useRef(onVideoEnded);
  const onProgressSyncRef = React.useRef(onThrottledProgressSync);

  React.useEffect(() => {
    onAutoMarkWatchedRef.current = onAutoMarkWatched;
    onVideoEndedRef.current = onVideoEnded;
    onProgressSyncRef.current = onThrottledProgressSync;
  });

  const registerAdapter = React.useCallback((newAdapter: PlaybackAdapter | null) => {
    setAdapter(newAdapter);
    if (newAdapter) {
      setVolumeState(newAdapter.getVolume());
      setIsMutedState(newAdapter.isMuted());
      setPlaybackRateState(newAdapter.getPlaybackRate());
    }
  }, []);

  const handleTimeTick = React.useCallback(
    (current: number, totalDur: number) => {
      setCurrentTime(current);
      if (totalDur > 0 && duration === 0) {
        setDuration(totalDur);
      }
      onProgressSyncRef.current?.(current);
    },
    [duration],
  );

  const handleStateChange = React.useCallback(
    (state: number) => {
      // YouTube Player States:
      // -1: UNSTARTED, 0: ENDED, 1: PLAYING, 2: PAUSED, 3: BUFFERING, 5: CUED
      if (state === 1) {
        setIsPlaying(true);
        setIsBuffering(false);
        setIsEnded(false);
      } else if (state === 2) {
        setIsPlaying(false);
        setIsBuffering(false);
      } else if (state === 3) {
        setIsBuffering(true);
      } else if (state === 0) {
        setIsPlaying(false);
        setIsBuffering(false);
        setIsEnded(true);
        onVideoEndedRef.current?.();
      }
    },
    [],
  );

  const play = React.useCallback(() => {
    adapter?.play();
  }, [adapter]);

  const pause = React.useCallback(() => {
    adapter?.pause();
  }, [adapter]);

  const togglePlay = React.useCallback(() => {
    adapter?.togglePlay();
  }, [adapter]);

  const seekTo = React.useCallback(
    (seconds: number) => {
      adapter?.seekTo(seconds);
      setCurrentTime(seconds);
    },
    [adapter],
  );

  const seekRelative = React.useCallback(
    (deltaSeconds: number) => {
      adapter?.seekRelative(deltaSeconds);
    },
    [adapter],
  );

  const setVolume = React.useCallback(
    (vol: number) => {
      adapter?.setVolume(vol);
      setVolumeState(vol);
      if (vol > 0 && isMuted) {
        setIsMutedState(false);
      }
    },
    [adapter, isMuted],
  );

  const toggleMute = React.useCallback(() => {
    adapter?.toggleMute();
    setIsMutedState((prev) => !prev);
  }, [adapter]);

  const setPlaybackRate = React.useCallback(
    (rate: number) => {
      adapter?.setPlaybackRate(rate);
      setPlaybackRateState(rate);
    },
    [adapter],
  );

  const requestFullscreen = React.useCallback(() => {
    adapter?.requestFullscreen();
  }, [adapter]);

  const total = duration > 0 ? duration : initialDuration;
  const progressPercent = total > 0 ? Math.min(100, Math.max(0, (currentTime / total) * 100)) : 0;

  const value: PlaybackContextValue = {
    adapter,
    currentTime,
    duration: total,
    progressPercent,
    isPlaying,
    isBuffering,
    isEnded,
    volume,
    isMuted,
    playbackRate,
    controlsMode,
    play,
    pause,
    togglePlay,
    seekTo,
    seekRelative,
    setVolume,
    toggleMute,
    setPlaybackRate,
    requestFullscreen,
    setControlsMode,
    registerAdapter,
    handleTimeTick,
    handleStateChange,
  };

  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback(): PlaybackContextValue {
  const context = React.useContext(PlaybackContext);
  if (!context) {
    throw new Error("usePlayback must be used within a PlaybackProvider");
  }
  return context;
}
