import * as React from "react";
import { Skeleton } from "../ui/skeleton";

export function VideoCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg p-2 sm:p-2.5 bg-surface-1/40 border border-border/40">
      {/* 16:9 Thumbnail Box */}
      <div className="relative w-full aspect-video rounded-md overflow-hidden bg-surface-2 border border-border/60">
        <Skeleton className="w-full h-full rounded-none" />
        {/* Duration Badge Placeholder */}
        <div className="absolute bottom-2 right-2">
          <Skeleton className="w-10 h-4 rounded bg-black/40 border-0" />
        </div>
      </div>

      {/* Meta Container: Avatar + Title Lines + Subtitle */}
      <div className="mt-2.5 sm:mt-3 flex gap-2.5 sm:gap-3 items-start flex-1 px-0.5 sm:px-0">
        <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0 mt-0.5" />
        <div className="flex flex-col flex-1 min-w-0 space-y-1.5 pt-0.5">
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-3.5 w-3/4" />
          <div className="flex items-center gap-2 pt-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

export interface FeedSkeletonProps {
  cardCount?: number;
  showFilterBar?: boolean;
}

export function FeedSkeleton({
  cardCount = 6,
  showFilterBar = true,
}: FeedSkeletonProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-in fade-in duration-150">
      {/* Filter / Mode Header Skeleton */}
      {showFilterBar && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-surface-2/80 rounded-lg border border-border gap-1">
              <Skeleton className="w-24 h-7 rounded-md" />
              <Skeleton className="w-20 h-7 rounded-md" />
              <Skeleton className="w-16 h-7 rounded-md" />
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2.5">
            <Skeleton className="w-32 h-8 rounded-md" />
            <Skeleton className="w-24 h-8 rounded-md" />
          </div>
        </div>
      )}

      {/* Responsive Video Card Grid (1 col mobile, 2 col tablet, 3 col desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
        {Array.from({ length: cardCount }).map((_, index) => (
          <VideoCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

