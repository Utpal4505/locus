"use client";

import * as React from "react";
import Link from "next/link";
import type { FeedItem } from "@locus/contracts";
import { CheckCircle2, Star, Clock } from "lucide-react";
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
    <article className="group flex flex-col p-2.5 sm:p-3 rounded-lg border border-border/80 bg-surface-1 transition-all duration-200 hover:border-border-strong hover:shadow-md hover:-translate-y-0.5 relative">
      {/* 16:9 Thumbnail Container */}
      <Link
        href={watchUrl}
        className="block relative w-full aspect-video bg-surface-2 overflow-hidden rounded-md border border-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
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

        {/* Passive Micro-Chips when not hovering (shows active status without obscuring thumbnail) */}
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10 transition-opacity duration-150 group-hover:opacity-0 pointer-events-none">
          {isInQueue && (
            <span
              title="In Queue"
              className="p-1 rounded bg-black/75 backdrop-blur-md border border-white/20 text-primary shadow-xs"
            >
              <Clock className="w-3 h-3 stroke-[2.5]" />
            </span>
          )}
          {isFavorite && (
            <span
              title="Favorited"
              className="p-1 rounded bg-black/75 backdrop-blur-md border border-white/20 text-rose-500 shadow-xs"
            >
              <Star className="w-3 h-3 fill-current stroke-[2.5]" />
            </span>
          )}
        </div>

        {/* Top-Right Interactive Action Pill (Revealed smoothly on card hover/focus) */}
        <div
          className="absolute top-2 right-2 flex items-center gap-1 p-1 rounded-md bg-black/85 backdrop-blur-md border border-white/20 z-20 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 shadow-md"
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
              "p-1.5 rounded transition-all cursor-pointer border flex items-center justify-center select-none",
              isInQueue
                ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                : "border-transparent text-white/80 hover:text-white hover:bg-white/15",
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
              "p-1.5 rounded transition-all cursor-pointer border flex items-center justify-center select-none",
              isFavorite
                ? "bg-rose-600 text-white border-rose-600 shadow-xs font-bold"
                : "border-transparent text-white/80 hover:text-white hover:bg-white/15",
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
              "p-1.5 rounded transition-all cursor-pointer border flex items-center justify-center select-none",
              isWatched
                ? "bg-success text-success-foreground border-success shadow-xs font-bold"
                : "border-transparent text-white/80 hover:text-white hover:bg-white/15",
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

      {/* Content Meta Container (Avatar + Title + Channel Info) */}
      <div className="mt-3 flex gap-3 items-start flex-1">
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
        </div>
      </div>
    </article>
  );
}
