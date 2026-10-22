export interface PlaybackAdapter {
  play(): void;
  pause(): void;
  togglePlay(): void;
  seekTo(seconds: number): void;
  seekRelative(deltaSeconds: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(volume: number): void; // 0 - 100
  getVolume(): number;
  mute(): void;
  unMute(): void;
  toggleMute(): void;
  isMuted(): boolean;
  setPlaybackRate(rate: number): void; // 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2
  getPlaybackRate(): number;
  requestFullscreen(): void;
  destroy(): void;
}

