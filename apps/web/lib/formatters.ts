/**
 * Formats a duration in seconds into a standard HH:MM:SS or MM:SS badge string.
 */
export function formatDuration(seconds?: number | null): string {
  if (seconds == null || isNaN(seconds) || seconds < 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Formats an ISO publication date string or Date object into a readable relative timestamp.
 */
export function formatRelativeTime(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const now = Date.now();
  const diffSec = Math.floor((now - date.getTime()) / 1000);

  if (diffSec < 0) return "just now";
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

/**
 * Formats a sync timestamp into a user-facing sync status label
 * (e.g. "Last synced 12 minutes ago", "Last synced just now").
 */
export function formatSyncRelativeTime(dateInput?: string | Date | null): string {
  if (!dateInput) return "Never synced";
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "Never synced";

  const now = Date.now();
  const diffSec = Math.floor((now - date.getTime()) / 1000);

  if (diffSec < 60) return "Last synced just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return "Last synced 1 minute ago";
  if (diffMin < 60) return `Last synced ${diffMin} minutes ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return "Last synced 1 hour ago";
  if (diffHours < 24) return `Last synced ${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Last synced yesterday";
  return `Last synced ${diffDays} days ago`;
}

