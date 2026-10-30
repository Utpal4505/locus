import * as React from "react";
import { Skeleton } from "../ui/skeleton";

export function WatchSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 animate-in fade-in duration-150">
      {/* Navigation Breadcrumb Skeleton */}
      <div className="flex items-center gap-2 mb-3.5">
        <Skeleton className="w-16 h-4" />
        <Skeleton className="w-3 h-4" />
        <Skeleton className="w-32 h-4" />
      </div>

      {/* Main 12-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Player Column (8 cols) */}
        <div className="flex flex-col lg:col-span-8 space-y-4">
          {/* Aspect-Video Player Placeholder */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-surface-2 border-2 border-border/80 shadow-brutal-sm">
            <Skeleton className="w-full h-full rounded-none" />
          </div>

          {/* Video Title Lines */}
          <div className="space-y-2 pt-1">
            <Skeleton className="h-6 w-11/12" />
            <Skeleton className="h-5 w-2/3" />
          </div>

          {/* Channel Row & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 pb-3 border-b border-border/70">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Skeleton className="w-24 h-8 rounded-lg" />
              <Skeleton className="w-24 h-8 rounded-lg" />
              <Skeleton className="w-20 h-8 rounded-lg" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
          </div>

          {/* Description Box Skeleton */}
          <div className="p-4 rounded-xl bg-surface-1 border border-border/70 space-y-2.5">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="w-20 h-4" />
              <Skeleton className="w-16 h-4" />
            </div>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="h-3.5 w-4/6" />
          </div>
        </div>

        {/* Right Sidebar Column (4 cols on desktop) */}
        <div className="hidden lg:flex flex-col lg:col-span-4 space-y-3">
          {/* Tab Header Skeleton */}
          <div className="flex items-center gap-2 p-1 bg-surface-2 rounded-xl border border-border">
            <Skeleton className="flex-1 h-8 rounded-lg" />
            <Skeleton className="flex-1 h-8 rounded-lg" />
          </div>

          {/* Sidebar Content Card */}
          <div className="p-4 rounded-xl bg-surface-1 border border-border/70 space-y-3 h-[480px]">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <Skeleton className="w-28 h-4" />
              <Skeleton className="w-16 h-4" />
            </div>
            <div className="space-y-2.5 pt-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

