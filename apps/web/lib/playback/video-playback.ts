/**
 * Playback progress and watched status heuristic utilities.
 */

export interface WatchedThresholdOptions {
  /**
   * End-buffer threshold in seconds. If the user stops playback within this
   * many seconds of the end, it counts as watched. Default: 15s (3s for shorts <60s).
   */
  endBufferSeconds?: number;
  /**
   * Percentage threshold (between 0.0 and 1.0). Default: 0.90 (90%).
   */
  completionPercentageThreshold?: number;
}

/**
 * Determines whether playback has crossed the threshold to be automatically
 * marked as "Watched".
 *
 * Designed to accommodate natural viewer behavior, such as skipping or closing
 * a video during end screens, outros, sponsor calls, or with 5-15 seconds remaining.
 *
 * @param progressSeconds - Current playback position in seconds.
 * @param durationSeconds - Total duration of the video in seconds.
 * @param options - Custom threshold configuration.
 * @returns boolean - True if the video should be marked as watched.
 */
export function shouldMarkAsWatched(
  progressSeconds: number,
  durationSeconds: number | null | undefined,
  options?: WatchedThresholdOptions,
): boolean {
  if (
    !durationSeconds ||
    durationSeconds <= 0 ||
    progressSeconds === null ||
    progressSeconds === undefined ||
    progressSeconds < 0
  ) {
    return false;
  }

  const isShortVideo = durationSeconds < 60;
  const endBuffer =
    options?.endBufferSeconds ?? (isShortVideo ? 3 : 15);
  const percentageThreshold =
    options?.completionPercentageThreshold ?? (isShortVideo ? 0.85 : 0.9);

  // Condition 1: Within end-buffer of the end (e.g. within 15 seconds)
  if (progressSeconds >= durationSeconds - endBuffer) {
    return true;
  }

  // Condition 2: Reached completion percentage (e.g. 90%)
  if (progressSeconds / durationSeconds >= percentageThreshold) {
    return true;
  }

  return false;
}

/**
 * Calculates display progress percentage for progress bar rendering.
 * Returns 0 if progress is negligible (< 2 seconds) or not present.
 */
export function calculateProgressPercentage(
  progressSeconds: number | null | undefined,
  durationSeconds: number | null | undefined,
): number {
  if (
    !progressSeconds ||
    !durationSeconds ||
    progressSeconds <= 2 ||
    durationSeconds <= 0
  ) {
    return 0;
  }

  const rawPercent = (progressSeconds / durationSeconds) * 100;
  return Math.min(100, Math.max(0, Math.round(rawPercent)));
}

