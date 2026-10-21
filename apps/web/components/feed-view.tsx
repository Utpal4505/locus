"use client";

import * as React from "react";
import Link from "next/link";
import {
  Zap,
  X,
  CheckCircle2,
  AlertCircle,
  Tv,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { getApiErrorMessage } from "../lib/error-utils";
import { useInfiniteFeedQuery, useSyncVideosMutation } from "../lib/queries";
import { cn } from "../lib/utils";
import { VideoCard } from "./video-card";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export function FeedView() {
  const {
    data,
    isLoading,
    isRefetching,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteFeedQuery({ limit: 20 });

  const syncMutation = useSyncVideosMutation();
  const [syncFeedback, setSyncFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Sentinel ref for automatic cursor-based infinite scroll
  const observerTargetRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const target = observerTargetRef.current;
    if (!target || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      {
        rootMargin: "300px", // Trigger 300px before the user reaches the bottom
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const videos = data?.pages.flatMap((page) => page.items) ?? [];
  const errorMessage = error
    ? getApiErrorMessage(error, "Failed to load chronological feed.")
    : null;

  const handleSyncVideos = async () => {
    setSyncFeedback(null);

    try {
      const syncRes = await syncMutation.mutateAsync();
      setSyncFeedback({
        type: "success",
        message: `Sync completed: ${syncRes.videosSynced} video${
          syncRes.videosSynced === 1 ? "" : "s"
        } synced across ${syncRes.channelsProcessed} channel${
          syncRes.channelsProcessed === 1 ? "" : "s"
        }.`,
      });
    } catch (err) {
      setSyncFeedback({
        type: "error",
        message: getApiErrorMessage(
          err,
          "Failed to sync videos. Please verify your YouTube connection in Settings.",
        ),
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Feed Header & Action Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8 pb-5 border-b-2 border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-foreground m-0 mb-1">
            Chronological Feed
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono m-0">
            Recent videos exclusively from channels you follow, ordered newest first.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Sync Uploads Button */}
          <Button
            variant="default"
            size="sm"
            onClick={handleSyncVideos}
            disabled={syncMutation.isPending || isLoading || isRefetching}
            className="w-full sm:w-auto gap-2"
            aria-label="Sync YouTube uploads"
          >
            {syncMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            <span>{syncMutation.isPending ? "Syncing..." : "Sync Videos"}</span>
          </Button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncFeedback && (
        <div
          role="status"
          className={cn(
            "p-3.5 rounded-md border-2 mb-6 flex items-center justify-between gap-3 text-xs sm:text-sm font-medium shadow-brutal-sm animate-in fade-in",
            syncFeedback.type === "success"
              ? "border-success/50 bg-success/15 text-foreground"
              : "border-destructive/50 bg-destructive/15 text-foreground",
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {syncFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            )}
            <span className="truncate">{syncFeedback.message}</span>
          </div>

          <button
            type="button"
            onClick={() => setSyncFeedback(null)}
            className="p-1 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Query Error Message Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-md border-2 border-destructive/50 bg-destructive/15 text-foreground mb-6 flex items-center justify-between gap-3 text-xs sm:text-sm font-medium shadow-brutal-sm animate-in fade-in"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => refetch()}
            className="shrink-0 h-7 text-xs px-2.5"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Feed Content */}
      {isLoading ? (
        /* Neo-Brutalist Loading Skeletons */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
          {[1, 2, 3, 4, 5, 6].map((key) => (
            <Card key={key} className="flex flex-col overflow-hidden animate-pulse">
              <div className="w-full aspect-video bg-surface-2 border-b-2 border-border" />
              <div className="p-4 sm:p-5 flex-1 space-y-2">
                <div className="h-4 bg-surface-3 rounded-sm w-5/6" />
                <div className="h-4 bg-surface-3 rounded-sm w-3/5" />
              </div>
              <div className="border-t-2 border-border bg-surface-2/60 px-4 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-sm bg-surface-3 border-2 border-border-strong shrink-0" />
                  <div className="h-3.5 bg-surface-3 rounded-sm w-24" />
                </div>
                <div className="h-3 bg-surface-3 rounded-sm w-12" />
              </div>
            </Card>
          ))}
        </div>
      ) : videos.length > 0 ? (
        /* Video Grid (Max 3 Columns for larger readable cards) */
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>

          {/* Cursor-based Infinite Scroll Sentinel & Stream State */}
          {hasNextPage && (
            <div
              ref={observerTargetRef}
              className="mt-10 sm:mt-12 mb-6 flex justify-center items-center min-h-[52px]"
              aria-live="polite"
            >
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-md bg-surface-2 border-2 border-border shadow-brutal-sm text-xs font-mono text-muted-foreground animate-in fade-in">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading older videos...</span>
                </div>
              ) : (
                /* Accessible fallback trigger if scrolling hasn't triggered or user prefers click */
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  className="text-xs font-mono"
                >
                  Load More Videos
                </Button>
              )}
            </div>
          )}

          {!hasNextPage && videos.length > 0 && (
            <p className="text-center font-mono text-xs text-muted-foreground/70 mt-10 mb-6">
              — You have reached the end of your feed —
            </p>
          )}
        </div>
      ) : (
        /* Neo-Brutalist Empty Feed State */
        <Card className="max-w-xl mx-auto p-6 sm:p-10 text-center my-8 sm:my-12 flex flex-col items-center">
          {/* TV Emblem */}
          <div className="w-14 h-14 rounded-md bg-primary/15 border-2 border-primary flex items-center justify-center text-primary mb-5 shadow-brutal-sm select-none">
            <Tv className="w-7 h-7 stroke-[2.2]" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-foreground m-0 mb-2">
            Your feed is empty
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md m-0 mb-6">
            To see videos in your feed, connect your YouTube account, import
            your subscriptions, and select channels to follow.
          </p>

          {/* Step-by-step Onboarding Box */}
          <div className="w-full max-w-sm rounded-md border-2 border-border-strong bg-surface-2 p-4 text-left mb-6 shadow-brutal-sm">
            <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm text-foreground/90 font-mono">
              <li>Connect YouTube in Channels & Settings</li>
              <li>Import your YouTube subscriptions</li>
              <li>Follow channels you want in your feed</li>
              <li>Click &ldquo;Sync Videos&rdquo; to fetch recent uploads</li>
            </ol>
          </div>

          {/* Call to action */}
          <Button variant="default" size="default" asChild className="gap-2">
            <Link href="/settings">
              <span>Go to Channels & Settings</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </Card>
      )}
    </div>
  );
}
