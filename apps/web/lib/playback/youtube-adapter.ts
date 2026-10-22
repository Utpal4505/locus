import type { PlaybackAdapter } from "./playback-adapter";

export class YouTubePlaybackAdapter implements PlaybackAdapter {
  private player: any;
  private containerElementId: string;
  private onTimeUpdateCallback?: (currentTime: number, duration: number) => void;

  constructor(
    player: any,
    containerElementId: string,
    onTimeUpdate?: (currentTime: number, duration: number) => void,
  ) {
    this.player = player;
    this.containerElementId = containerElementId;
    this.onTimeUpdateCallback = onTimeUpdate;
  }

  play(): void {
    try {
      this.player?.playVideo?.();
    } catch (err) {
      console.warn("YouTubePlaybackAdapter.play failed:", err);
    }
  }

  pause(): void {
    try {
      this.player?.pauseVideo?.();
    } catch (err) {
      console.warn("YouTubePlaybackAdapter.pause failed:", err);
    }
  }

  togglePlay(): void {
    try {
      const state = this.player?.getPlayerState?.();
      // 1 = YT.PlayerState.PLAYING
      if (state === 1) {
        this.pause();
      } else {
        this.play();
      }
    } catch (err) {
      console.warn("YouTubePlaybackAdapter.togglePlay failed:", err);
    }
  }

  seekTo(seconds: number): void {
    try {
      const clamped = Math.max(0, seconds);
      this.player?.seekTo?.(clamped, true);
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(clamped, this.getDuration());
      }
    } catch (err) {
      console.warn("YouTubePlaybackAdapter.seekTo failed:", err);
    }
  }

  seekRelative(deltaSeconds: number): void {
    try {
      const current = this.getCurrentTime();
      const dur = this.getDuration();
      const target = Math.max(0, Math.min(dur > 0 ? dur : 999999, current + deltaSeconds));
      this.seekTo(target);
    } catch (err) {
      console.warn("YouTubePlaybackAdapter.seekRelative failed:", err);
    }
  }

  getCurrentTime(): number {
    try {
      const time = this.player?.getCurrentTime?.();
      return typeof time === "number" && !isNaN(time) ? time : 0;
    } catch {
      return 0;
    }
  }

  getDuration(): number {
    try {
      const dur = this.player?.getDuration?.();
      return typeof dur === "number" && !isNaN(dur) ? dur : 0;
    } catch {
      return 0;
    }
  }

  setVolume(volume: number): void {
    try {
      const clamped = Math.max(0, Math.min(100, volume));
      this.player?.setVolume?.(clamped);
      if (clamped > 0 && this.isMuted()) {
        this.unMute();
      }
    } catch (err) {
      console.warn("YouTubePlaybackAdapter.setVolume failed:", err);
    }
  }

  getVolume(): number {
    try {
      const vol = this.player?.getVolume?.();
      return typeof vol === "number" && !isNaN(vol) ? vol : 100;
    } catch {
      return 100;
    }
  }

  mute(): void {
    try {
      this.player?.mute?.();
    } catch (err) {
      console.warn("YouTubePlaybackAdapter.mute failed:", err);
    }
  }

  unMute(): void {
    try {
      this.player?.unMute?.();
    } catch (err) {
      console.warn("YouTubePlaybackAdapter.unMute failed:", err);
    }
  }

  toggleMute(): void {
    if (this.isMuted()) {
      this.unMute();
    } else {
      this.mute();
    }
  }

  isMuted(): boolean {
    try {
      return Boolean(this.player?.isMuted?.());
    } catch {
      return false;
    }
  }

  setPlaybackRate(rate: number): void {
    try {
      this.player?.setPlaybackRate?.(rate);
    } catch (err) {
      console.warn("YouTubePlaybackAdapter.setPlaybackRate failed:", err);
    }
  }

  getPlaybackRate(): number {
    try {
      const rate = this.player?.getPlaybackRate?.();
      return typeof rate === "number" && !isNaN(rate) ? rate : 1;
    } catch {
      return 1;
    }
  }

  requestFullscreen(): void {
    try {
      const element = document.getElementById(this.containerElementId);
      if (element?.requestFullscreen) {
        element.requestFullscreen();
      }
    } catch (err) {
      console.warn("YouTubePlaybackAdapter.requestFullscreen failed:", err);
    }
  }

  destroy(): void {
    try {
      this.player?.destroy?.();
    } catch {
      // ignore destruction errors
    }
  }
}
