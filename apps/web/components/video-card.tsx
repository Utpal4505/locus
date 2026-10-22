"use client";

import * as React from "react";
import type { FeedItem } from "@locus/contracts";
import { CheckCircle2, Bookmark, Clock, Loader2 } from "lucide-react";
import { formatDuration, formatRelativeTime } from "../lib/formatters";
import { useUpdateVideoLibraryStateMutation } from "../lib/queries";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

interface VideoCardProps {
  video: FeedItem;
  onRemove?: () => void;
}

export function VideoCard({ video, onRemove }: VideoCardProps) {
  const durationText = formatDuration(video.durationSeconds);
  const relativeDate = formatRelativeTime(video.publishedAt);
  const targetUrl = video.url || video.videoUrl;

  const updateMutation = useUpdateVideoLibraryStateMutation();

  const isWatched = Boolean(video.library?.isWatched);
  const isBookmarked = Boolean(video.library?.isBookmarked);
  const isInQueue = Boolean(video.library?.isInQueue);

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

  const handleToggleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateMutation.mutate({
      videoId: video.id,
      updates: { isBookmarked: !isBookmarked },
    });
    if (onRemove && isBookmarked) {
      onRemove();
    }
  };

  return (
    <article className="group flex flex-col p-2.5 sm:p-3 rounded-lg border-2 border-transparent bg-transparent transition-all duration-150 hover:bg-card hover:border-border hover:shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 relative">
      {/* 16:9 Thumbnail Container */}
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative w-full aspect-video bg-surface-2 overflow-hidden rounded-md border border-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        aria-label={`Watch ${video.title} by ${video.channelName}`}
      >
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            loading="lazy"
            className="w-full h-full object-cover block group-hover:scale-[1.02] transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-mono">
            No Thumbnail
          </div>
        )}

        {/* Hover Action Overlay on Thumbnail (Queue, Bookmark, Watched) */}
        <div
          className="absolute top-2 right-2 flex items-center gap-1.5 z-10"
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
              "p-1.5 rounded-sm border-2 border-border-strong text-xs font-bold transition-all shadow-brutal-sm cursor-pointer",
              isInQueue
                ? "bg-primary text-primary-foreground opacity-100 -translate-x-0.5 -translate-y-0.5"
                : "bg-surface-1/95 text-foreground hover:bg-surface-2 opacity-0 group-hover:opacity-100 focus:opacity-100",
            )}
          >
            <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={handleToggleBookmark}
            title={isBookmarked ? "Bookmarked (click to remove)" : "Bookmark for later"}
            aria-label={isBookmarked ? "Bookmarked (click to remove)" : "Bookmark for later"}
            className={cn(
              "p-1.5 rounded-sm border-2 border-border-strong text-xs font-bold transition-all shadow-brutal-sm cursor-pointer",
              isBookmarked
                ? "bg-accent text-accent-foreground opacity-100 -translate-x-0.5 -translate-y-0.5"
                : "bg-surface-1/95 text-foreground hover:bg-surface-2 opacity-0 group-hover:opacity-100 focus:opacity-100",
            )}
          >
            <Bookmark className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>

          {/* Watched Button */}
          <button
            type="button"
            onClick={handleToggleWatched}
            title={isWatched ? "Watched (click to mark unwatched)" : "Mark as Watched"}
            aria-label={isWatched ? "Watched (click to mark unwatched)" : "Mark as Watched"}
            className={cn(
              "p-1.5 rounded-sm border-2 border-border-strong text-xs font-bold transition-all shadow-brutal-sm cursor-pointer",
              isWatched
                ? "bg-success text-success-foreground opacity-100 -translate-x-0.5 -translate-y-0.5"
                : "bg-surface-1/95 text-foreground hover:bg-surface-2 opacity-0 group-hover:opacity-100 focus:opacity-100",
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Duration Badge */}
        {durationText && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="duration" className="shadow-[1px_1px_0px_0px_#000000]">
              {durationText}
            </Badge>
          </div>
        )}
      </a>

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
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline"
              title={video.title}
            >
              {video.title}
            </a>
          </h2>

          <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
            <span
              className="font-medium text-foreground/85 truncate hover:text-foreground transition-colors"
              title={video.channelName}
            >
              {video.channelName}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground/75">
              {relativeDate}
            </span>
          </div>

          {/* User Library State Interactive Badges */}
          {(isWatched || isBookmarked || isInQueue) && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {isWatched && (
                <button
                  type="button"
                  onClick={handleToggleWatched}
                  className="cursor-pointer"
                  title="Click to mark unwatched"
                >
                  <Badge variant="success" className="text-[10px] py-0 px-1.5 gap-1 hover:opacity-85 transition-opacity">
                    <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                    <span>Watched</span>
                  </Badge>
                </button>
              )}
              {isBookmarked && (
                <button
                  type="button"
                  onClick={handleToggleBookmark}
                  className="cursor-pointer"
                  title="Click to remove bookmark"
                >
                  <Badge variant="accent" className="text-[10px] py-0 px-1.5 gap-1 hover:opacity-85 transition-opacity">
                    <Bookmark className="w-3 h-3 stroke-[2.5]" />
                    <span>Saved</span>
                  </Badge>
                </button>
              )}
              {isInQueue && (
                <button
                  type="button"
                  onClick={handleToggleQueue}
                  className="cursor-pointer"
                  title="Click to remove from queue"
                >
                  <Badge variant="default" className="text-[10px] py-0 px-1.5 gap-1 hover:opacity-85 transition-opacity">
                    <Clock className="w-3 h-3 stroke-[2.5]" />
                    <span>In Queue</span>
                  </Badge>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
