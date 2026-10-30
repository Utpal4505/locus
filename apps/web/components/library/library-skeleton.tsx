import * as React from "react";
import { Skeleton } from "../ui/skeleton";
import { VideoCardSkeleton } from "../feed/feed-skeleton";

export function NoteCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-2xl bg-surface-1 border border-border/80 p-3.5 sm:p-5">
      {/* Top Source Reference Bar */}
      <div className="flex items-center justify-between gap-2.5 sm:gap-3 pb-2.5 sm:pb-3 mb-3 border-b border-border/60">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <Skeleton className="w-11 sm:w-12 aspect-video rounded-md shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
        <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
      </div>

      {/* Note Body Placeholder Lines */}
      <div className="space-y-2 my-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-3/4" />
      </div>

      {/* Footer Meta */}
      <div className="pt-3 mt-1 border-t border-border/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function LibrarySkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-in fade-in duration-150">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Skeleton className="w-6 h-6 rounded-md" />
            <Skeleton className="w-36 h-7 rounded-md" />
            <Skeleton className="w-14 h-5 rounded-full" />
          </div>
          <Skeleton className="w-64 h-4 mt-2" />
        </div>

        {/* Search Bar Placeholder */}
        <div className="w-full md:w-72">
          <Skeleton className="w-full h-9 rounded-lg" />
        </div>
      </div>

      {/* Tabs Capsule */}
      <div className="flex items-center gap-1.5 p-1 bg-surface-2 rounded-xl border border-border w-fit mb-6 sm:mb-8">
        <Skeleton className="w-20 sm:w-24 h-8 rounded-lg" />
        <Skeleton className="w-24 sm:w-28 h-8 rounded-lg" />
        <Skeleton className="w-20 sm:w-24 h-8 rounded-lg" />
        <Skeleton className="w-20 sm:w-24 h-8 rounded-lg" />
        <Skeleton className="w-24 sm:w-28 h-8 rounded-lg" />
      </div>

      {/* Shelf Sections */}
      <div className="space-y-8">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded-full" />
              <Skeleton className="w-28 h-5" />
            </div>
            <Skeleton className="w-16 h-4" />
          </div>
          <div className="flex items-center gap-3 overflow-hidden py-1">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                className="w-44 sm:w-52 aspect-video rounded-xl shrink-0"
              />
            ))}
          </div>
        </section>

        <section className="space-y-3 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded-full" />
              <Skeleton className="w-36 h-5" />
            </div>
            <Skeleton className="w-16 h-4" />
          </div>
          <div className="flex items-center gap-3 overflow-hidden py-1">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                className="w-44 sm:w-52 aspect-video rounded-xl shrink-0"
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

