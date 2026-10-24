"use client";

import * as React from "react";
import Link from "next/link";
import type { FeedItem } from "@locus/contracts";
import {
  CheckCircle2,
  Star,
  Clock,
  MoreVertical,
  Share2,
  Check,
} from "lucide-react";
import { formatDuration, formatRelativeTime } from "../lib/formatters";
import { calculateProgressPercentage } from "../lib/video-playback";
import { useUpdateVideoLibraryStateMutation } from "../lib/queries";
import { cn } from "../lib/utils";

interface VideoCardProps {
  video: FeedItem;
  onRemove?: () => void;
}

export function VideoCard({ video, onRemove }: VideoCardProps) {
  const durationText = formatDuration(video.durationSeconds);
  const relativeDate = formatRelativeTime(video.publishedAt);
  const watchUrl = `/watch/${video.id}`;

  const updateMutation = useUpdateVideoLibraryStateMutation();

  const isWatched = Boolean(video.library?.isWatched);
  const isFavorite = Boolean(video.library?.isFavorite);
  const isInQueue = Boolean(video.library?.isInQueue);

  const isShorts =
    video.durationSeconds !== null &&
    video.durationSeconds > 0 &&
    video.durationSeconds < 60;

  const progressSeconds = video.library?.progressSeconds ?? 0;
  const progressPercent = !isWatched
    ? calculateProgressPercentage(progressSeconds, video.durationSeconds)
    : 0;

  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== "undefined") {
      const fullUrl = `${window.location.origin}/watch/${video.id}`;
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsMenuOpen(false);
      }, 1500);
    }
  };

  const handleToggleWatched = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateMutation.mutate({
      videoId: video.id,
      updates: { isWatched: !isWatched },
    });
    if (onRemove && !isWatched) {
      onRemove();
    }
  };

  const handleToggleQueue = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateMutation.mutate({
      videoId: video.id,
      updates: { isInQueue: !isInQueue },
    });
    if (onRemove && isInQueue) {
      onRemove();
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateMutation.mutate({
      videoId: video.id,
      updates: { isFavorite: !isFavorite },
    });
    if (onRemove && isFavorite) {
      onRemove();
    }
  };

  return (
    <article className="group flex flex-col p-0 sm:p-3 sm:rounded-xl sm:border sm:border-border/80 sm:bg-surface-1 transition-all duration-200 hover:border-border-strong hover:shadow-md hover:-translate-y-0.5 relative pb-3 border-b sm:border-b-0 border-border/40">
      {/* 16:9 Thumbnail Container */}
      <Link
        href={watchUrl}
        className="block relative w-full aspect-video bg-surface-2 overflow-hidden rounded-2xl sm:rounded-md border border-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        aria-label={`Watch ${video.title} by ${video.channelName}`}
      >
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            loading="lazy"
            className={cn(
              "w-full h-full object-cover block group-hover:scale-[1.02] transition-all duration-200",
              isWatched ? "opacity-75 contrast-90" : "opacity-100",
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-mono">
            No Thumbnail
          </div>
        )}

        {/* Watched Status Indicator Badge on Thumbnail */}
        {isWatched && (
          <div className="absolute top-2 left-2 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider bg-black/75 backdrop-blur-md text-success border border-success/40 shadow-xs select-none">
              <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
              <span>WATCHED</span>
            </span>
          </div>
        )}

        {/* Top-Right Quick Action Capsule (Touch-friendly & accessible) */}
        <div
          className="absolute top-2 right-2 flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 z-20 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 shadow-md"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* Watch Later / Queue Button */}
          <button
            type="button"
            onClick={handleToggleQueue}
            title={isInQueue ? "In Queue (click to remove)" : "Add to Queue"}
            aria-label={isInQueue ? "In Queue (click to remove)" : "Add to Queue"}
            className={cn(
              "p-1 sm:p-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center select-none active:scale-90",
              isInQueue
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-white/80 hover:text-white hover:bg-white/20",
            )}
          >
            <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>

          {/* Favorite Button */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            title={isFavorite ? "Favorited (click to remove)" : "Add to Favorites"}
            aria-label={isFavorite ? "Favorited (click to remove)" : "Add to Favorites"}
            className={cn(
              "p-1 sm:p-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center select-none active:scale-90",
              isFavorite
                ? "bg-rose-600 text-white shadow-xs font-bold"
                : "text-white/80 hover:text-rose-400 hover:bg-white/20",
            )}
          >
            <Star
              className={cn(
                "w-3.5 h-3.5 stroke-[2.2]",
                isFavorite && "fill-current text-white",
              )}
            />
          </button>

          {/* Watched Button */}
          <button
            type="button"
            onClick={handleToggleWatched}
            title={isWatched ? "Watched (click to mark unwatched)" : "Mark as Watched"}
            aria-label={isWatched ? "Watched (click to mark unwatched)" : "Mark as Watched"}
            className={cn(
              "p-1 sm:p-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center select-none active:scale-90",
              isWatched
                ? "bg-success text-success-foreground shadow-xs font-bold"
                : "text-white/80 hover:text-emerald-400 hover:bg-white/20",
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Shorts Tag */}
        {isShorts && (
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/80 text-white border border-white/20 select-none">
              #SHORTS
            </span>
          </div>
        )}

        {/* Duration Badge */}
        {durationText && (
          <div className="absolute bottom-2 right-2 z-10 pointer-events-none">
            <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-black/85 backdrop-blur-xs text-white border border-white/20 shadow-xs select-none">
              {durationText}
            </span>
          </div>
        )}

        {/* YouTube-Style Playback Progress Bar */}
        {progressPercent > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 overflow-hidden z-10"
            title={`${progressPercent}% watched`}
          >
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </Link>

      {/* Content Meta Container (Avatar + Title + Channel Info + 3-Dots Menu) */}
      <div className="mt-2.5 sm:mt-3 flex gap-2.5 sm:gap-3 items-start flex-1 px-0.5 sm:px-0">
        {/* Channel Avatar */}
        <div className="shrink-0 mt-0.5">
          {video.channelThumbnailUrl ? (
            <img
              src={video.channelThumbnailUrl}
              alt={video.channelName}
              loading="lazy"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover block border border-border/70"
            />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface-3 border border-border/70 flex items-center justify-center text-foreground font-mono font-bold text-xs select-none">
              {video.channelName ? video.channelName[0]?.toUpperCase() : "C"}
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="flex flex-col flex-1 min-w-0">
          <h2 className="m-0 mb-1 text-sm sm:text-base font-bold leading-snug line-clamp-2">
            <Link
              href={watchUrl}
              className="text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline"
              title={video.title}
            >
              {video.title}
            </Link>
          </h2>

          <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <span
              className="font-medium text-foreground/90 truncate hover:text-foreground transition-colors max-w-[180px]"
              title={video.channelName}
            >
              {video.channelName}
            </span>
            <span className="text-muted-foreground/40 select-none">•</span>
            <span className="font-mono text-[11px] text-muted-foreground/75 whitespace-nowrap">
              {relativeDate}
            </span>
          </div>

          {/* AI Topic Badges (only when AI tagging is enabled) */}
          {process.env.NEXT_PUBLIC_AI_VIDEO_TAGGING_ENABLED === "true" &&
            video.tags &&
            video.tags.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {video.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 tracking-wide select-none"
                    title={tag.name}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
        </div>

        {/* 3-Dots Action Menu */}
        <div className="relative shrink-0 mt-0.5" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors cursor-pointer select-none"
            aria-label="More video options"
            title="Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border bg-surface-1 shadow-lg p-1 z-30 animate-in fade-in space-y-0.5 text-xs font-medium"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <button
                type="button"
                onClick={handleToggleQueue}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-surface-2 text-foreground transition-colors text-left cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{isInQueue ? "Remove from Queue" : "Save to Queue"}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleFavorite}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-surface-2 text-foreground transition-colors text-left cursor-pointer"
              >
                <Star
                  className={cn(
                    "w-3.5 h-3.5 text-muted-foreground",
                    isFavorite && "fill-current text-rose-500",
                  )}
                />
                <span>
                  {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleToggleWatched}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-surface-2 text-foreground transition-colors text-left cursor-pointer"
              >
                <CheckCircle2
                  className={cn(
                    "w-3.5 h-3.5 text-muted-foreground",
                    isWatched && "text-success",
                  )}
                />
                <span>
                  {isWatched ? "Mark as Unwatched" : "Mark as Watched"}
                </span>
              </button>

              <div className="h-px bg-border my-1" />

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-surface-2 text-foreground transition-colors text-left cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-success" />
                    <span className="text-success font-bold">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Share Video Link</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
