"use client";

import * as React from "react";
import Link from "next/link";
import {
  RefreshCw,
  Zap,
  X,
  CheckCircle2,
  AlertCircle,
  Tv,
  ArrowRight,
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
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching || syncMutation.isPending}
            className="flex-1 sm:flex-initial gap-2"
            aria-label="Refresh feed"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", isRefetching && "animate-spin")}
            />
            <span>{isRefetching ? "Refreshing..." : "Refresh"}</span>
          </Button>

          {/* Sync Uploads Button */}
          <Button
            variant="default"
            size="sm"
            onClick={handleSyncVideos}
            disabled={syncMutation.isPending || isLoading || isRefetching}
            className="flex-1 sm:flex-initial gap-2"
            aria-label="Sync YouTube uploads"
          >
            <Zap
              className={cn(
                "w-3.5 h-3.5",
                syncMutation.isPending && "animate-pulse",
              )}
            />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((key) => (
            <Card key={key} className="flex flex-col overflow-hidden animate-pulse">
              <div className="w-full aspect-video bg-surface-2 border-b-2 border-border" />
              <div className="p-4 flex gap-3">
                <div className="w-9 h-9 rounded-sm bg-surface-3 border-2 border-border-strong shrink-0" />
                <div className="flex-1 space-y-2 pt-0.5">
                  <div className="h-4 bg-surface-3 rounded-sm w-5/6" />
                  <div className="h-3 bg-surface-3 rounded-sm w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : videos.length > 0 ? (
        /* Video Grid */
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>

          {/* Load More Pagination */}
          {hasNextPage && (
            <div className="mt-10 sm:mt-12 flex justify-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="min-w-[200px]"
              >
                {isFetchingNextPage
                  ? "Loading older videos..."
                  : "Load More Videos"}
              </Button>
            </div>
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
