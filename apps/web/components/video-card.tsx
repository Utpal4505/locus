"use client";

import * as React from "react";
import type { FeedItem } from "@locus/contracts";
import { CheckCircle2, Bookmark, Clock } from "lucide-react";
import { formatDuration, formatRelativeTime } from "../lib/formatters";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface VideoCardProps {
  video: FeedItem;
}

export function VideoCard({ video }: VideoCardProps) {
  const durationText = formatDuration(video.durationSeconds);
  const relativeDate = formatRelativeTime(video.publishedAt);
  const targetUrl = video.url || video.videoUrl;

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-150 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:border-border-strong group">
      {/* 16:9 Thumbnail Container */}
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative w-full aspect-video bg-surface-2 overflow-hidden border-b-2 border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
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

        {/* Duration Badge */}
        {durationText && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="duration" className="shadow-[1px_1px_0px_0px_#000000]">
              {durationText}
            </Badge>
          </div>
        )}
      </a>

      {/* Content Meta Container */}
      <div className="p-4 sm:p-5 flex gap-3.5 sm:gap-4 flex-1">
        {/* Channel Avatar */}
        <div className="shrink-0">
          {video.channelThumbnailUrl ? (
            <img
              src={video.channelThumbnailUrl}
              alt={video.channelName}
              loading="lazy"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-md object-cover block border-2 border-border-strong shadow-[1px_1px_0px_0px_#000000]"
            />
          ) : (
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-md bg-surface-3 border-2 border-border-strong flex items-center justify-center text-foreground font-mono font-bold text-sm select-none shadow-[1px_1px_0px_0px_#000000]">
              {video.channelName ? video.channelName[0]?.toUpperCase() : "C"}
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="flex flex-col flex-1 min-w-0">
          <h2 className="m-0 mb-1.5 text-sm sm:text-base font-bold leading-snug line-clamp-2">
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

          <div className="text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center gap-1.5 mb-2.5">
            <span
              className="font-medium text-foreground/90 truncate max-w-[200px]"
              title={video.channelName}
            >
              {video.channelName}
            </span>
            <span>•</span>
            <span className="font-mono text-xs shrink-0">{relativeDate}</span>
          </div>

          {/* User Library State Badges */}
          {video.library && (
            <div className="flex gap-1.5 flex-wrap mt-auto pt-1.5">
              {video.library.isWatched && (
                <Badge variant="success" className="text-[10px] py-0 px-1.5 gap-1">
                  <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                  <span>Watched</span>
                </Badge>
              )}
              {video.library.isBookmarked && (
                <Badge variant="accent" className="text-[10px] py-0 px-1.5 gap-1">
                  <Bookmark className="w-3 h-3 stroke-[2.5]" />
                  <span>Saved</span>
                </Badge>
              )}
              {video.library.isInQueue && (
                <Badge variant="default" className="text-[10px] py-0 px-1.5 gap-1">
                  <Clock className="w-3 h-3 stroke-[2.5]" />
                  <span>Queue</span>
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
