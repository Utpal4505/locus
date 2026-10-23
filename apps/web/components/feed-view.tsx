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
import { getApiErrorMessage, isReauthRequiredError } from "../lib/error-utils";
import {
  useInfiniteFeedQuery,
  useSyncVideosMutation,
  useUserPreferencesQuery,
  useAutoSyncOnOpen,
} from "../lib/queries";
import { cn } from "../lib/utils";
import { VideoCard } from "./video-card";
import { Button, buttonVariants } from "./ui/button";
import { Card } from "./ui/card";
import { SyncStatusIndicator } from "./sync-status-indicator";

export function FeedView() {
  const { data: preferences } = useUserPreferencesQuery();
  const itemsPerPage = preferences?.itemsPerPage ?? 20;

  // Auto-sync on open if last sync is > 2 hours old
  useAutoSyncOnOpen(true);

  const [feedTab, setFeedTab] = React.useState<"unwatched" | "watched" | "all">(
    "unwatched",
  );

  const {
    data,
    isLoading,
    isRefetching,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteFeedQuery({ limit: itemsPerPage, status: feedTab });

  const syncMutation = useSyncVideosMutation();
  const [syncFeedback, setSyncFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
    action?: {
      label: string;
      href: string;
    };
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

  const videos = React.useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

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
      if (isReauthRequiredError(err)) {
        setSyncFeedback({
          type: "error",
          message:
            "Your YouTube authorization has expired or was revoked. Please reconnect your account.",
          action: {
            label: "Reconnect in Settings",
            href: "/settings",
          },
        });
        return;
      }

      setSyncFeedback({
        type: "error",
        message: getApiErrorMessage(
          err,
          "Failed to sync videos. Please check your network connection and try again.",
        ),
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Feed Header & Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-5 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-foreground m-0">
            Chronological Feed
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono m-0 mt-1">
            Recent videos exclusively from channels you follow, ordered newest first.
          </p>

          {/* View Filter Segmented Capsule: Unwatched / Watched / All */}
          <div
            role="tablist"
            aria-label="Feed filter tabs"
            className="inline-flex items-center p-1 rounded-lg bg-surface-2/70 border border-border/80 gap-1 mt-4"
          >
            <button
              type="button"
              role="tab"
              aria-selected={feedTab === "unwatched"}
              onClick={() => setFeedTab("unwatched")}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none",
                feedTab === "unwatched"
                  ? "bg-surface-1 text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
              )}
            >
              <span>Unwatched</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={feedTab === "watched"}
              onClick={() => setFeedTab("watched")}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none",
                feedTab === "watched"
                  ? "bg-surface-1 text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>Watched</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={feedTab === "all"}
              onClick={() => setFeedTab("all")}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none",
                feedTab === "all"
                  ? "bg-surface-1 text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
              )}
            >
              <span>All Videos</span>
            </button>
          </div>
        </div>

        {/* Action Controls & Sync Status Indicator */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <SyncStatusIndicator
            variant="full"
            onSyncComplete={({ channelsProcessed, videosSynced }) => {
              setSyncFeedback({
                type: "success",
                message: `Sync completed: ${videosSynced} video${
                  videosSynced === 1 ? "" : "s"
                } synced across ${channelsProcessed} channel${
                  channelsProcessed === 1 ? "" : "s"
                }.`,
              });
            }}
            onSyncError={(err) => {
              if (isReauthRequiredError(err)) {
                setSyncFeedback({
                  type: "error",
                  message:
                    "Your YouTube authorization has expired or was revoked. Please reconnect your account.",
                  action: {
                    label: "Reconnect in Settings",
                    href: "/settings",
                  },
                });
                return;
              }

              setSyncFeedback({
                type: "error",
                message: getApiErrorMessage(
                  err,
                  "Failed to sync videos. Please check your network connection and try again.",
                ),
              });
            }}
          />
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncFeedback && (
        <div
          role="status"
          className={cn(
            "p-3 rounded-lg border mb-6 flex items-center justify-between gap-3 text-xs sm:text-sm font-medium shadow-xs animate-in fade-in",
            syncFeedback.type === "success"
              ? "border-success/40 bg-success/10 text-foreground"
              : "border-destructive/40 bg-destructive/10 text-foreground",
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

          <div className="flex items-center gap-2 shrink-0">
            {syncFeedback.action && (
              <Link
                href={syncFeedback.action.href}
                className={cn(
                  buttonVariants({ variant: "destructive", size: "sm" }),
                  "h-7 text-xs font-semibold px-2.5 cursor-pointer",
                )}
              >
                {syncFeedback.action.label}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setSyncFeedback(null)}
              className="p-1 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              aria-label="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Query Error Message Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-foreground mb-6 flex items-center justify-between gap-3 text-xs sm:text-sm font-medium shadow-xs animate-in fade-in"
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
        /* Video Skeletons */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
          {[1, 2, 3, 4, 5, 6].map((key) => (
            <div key={key} className="flex flex-col p-2.5 sm:p-3 rounded-lg animate-pulse">
              <div className="w-full aspect-video bg-surface-2 rounded-md border border-border/50" />
              <div className="mt-3 flex gap-3 items-start">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface-3 border border-border/70 shrink-0" />
                <div className="flex-1 space-y-2 pt-0.5">
                  <div className="h-4 bg-surface-3 rounded-sm w-5/6" />
                  <div className="h-3.5 bg-surface-3 rounded-sm w-1/2" />
                </div>
              </div>
            </div>
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
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface-2 border border-border shadow-xs text-xs font-mono text-muted-foreground animate-in fade-in">
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
      ) : feedTab === "watched" ? (
        /* Empty Watched Tab State */
        <Card className="max-w-xl mx-auto p-6 sm:p-10 text-center my-8 sm:my-12 flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-success/15 border border-success/30 flex items-center justify-center text-success mb-4 shadow-xs select-none">
            <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-foreground m-0 mb-2">
            No watched videos yet
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md m-0 mb-6">
            Videos from channels you follow that you finish or mark as watched will appear here.
          </p>

          <Button
            variant="default"
            size="sm"
            onClick={() => setFeedTab("unwatched")}
            className="cursor-pointer"
          >
            Back to Unwatched Feed
          </Button>
        </Card>
      ) : feedTab === "unwatched" ? (
        /* All Caught Up State */
        <Card className="max-w-xl mx-auto p-6 sm:p-10 text-center my-8 sm:my-12 flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-success/15 border border-success/30 flex items-center justify-center text-success mb-4 shadow-xs select-none">
            <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-foreground m-0 mb-2">
            All caught up!
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md m-0 mb-6">
            You have no unwatched videos in your feed right now. You can sync recent uploads or revisit your watched videos.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={handleSyncVideos}
              disabled={syncMutation.isPending}
              className="gap-2 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Sync Recent Videos</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFeedTab("watched")}
              className="cursor-pointer"
            >
              View Watched Videos
            </Button>
          </div>
        </Card>
      ) : (
        /* Empty Feed State */
        <Card className="max-w-xl mx-auto p-6 sm:p-10 text-center my-8 sm:my-12 flex flex-col items-center">
          {/* TV Emblem */}
          <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-4 shadow-xs select-none">
            <Tv className="w-6 h-6 stroke-[2.2]" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-foreground m-0 mb-2">
            Your feed is empty
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md m-0 mb-6">
            To see videos in your feed, connect your YouTube account, import
            your subscriptions, and select channels to follow.
          </p>

          {/* Step-by-step Onboarding Box */}
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface-2/70 p-4 text-left mb-6 shadow-xs">
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
