"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Zap,
  X,
  CheckCircle2,
  AlertCircle,
  Tv,
  ArrowRight,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { getApiErrorMessage, isReauthRequiredError } from "@/lib/error-utils";
import {
  useInfiniteFeedQuery,
  useSyncVideosMutation,
  useUserPreferencesQuery,
  useAutoSyncOnOpen,
  useYoutubeStatusQuery,
  useChannelListQuery,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { VideoCard } from "./video-card";
import { VideoCardSkeleton } from "./feed-skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SyncStatusIndicator } from "@/components/layout/sync-status-indicator";
import { TopicFilterChips } from "./topic-filter-chips";
import { FeedModeToggle } from "./feed-mode-toggle";
import { motion } from "motion/react";
import { useThemeStore } from "@/lib/stores/theme.store";

function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export function FeedView() {
  const isAiTaggingEnabled =
    process.env.NEXT_PUBLIC_AI_VIDEO_TAGGING_ENABLED === "true";

  const searchParams = useSearchParams();
  const { data: preferences } = useUserPreferencesQuery();
  const itemsPerPage = preferences?.itemsPerPage ?? 20;
  const theme = useThemeStore((s) => s.theme);

  const {
    data: ytStatus,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useYoutubeStatusQuery();
  const isConnected = Boolean(ytStatus?.connected);

  const { data: channelData, isLoading: channelsLoading } = useChannelListQuery({
    enabled: isConnected,
  });
  const followedChannels = React.useMemo(
    () => channelData?.channels.filter((c) => c.isFollowed) ?? [],
    [channelData?.channels],
  );

  const [connecting, setConnecting] = React.useState(false);

  // Auto-sync on open if connected and last sync is > 2 hours old
  useAutoSyncOnOpen(isConnected);

  const [feedTab, setFeedTab] = React.useState<"unwatched" | "watched" | "all">(
    "unwatched",
  );

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("locus_feed_tab");
      if (stored === "unwatched" || stored === "watched" || stored === "all") {
        setFeedTab(stored);
      }
    } catch {
      // Safe fallback if localStorage is disabled or restricted
    }
  }, []);

  const handleTabChange = (newTab: "unwatched" | "watched" | "all") => {
    setFeedTab(newTab);
    try {
      localStorage.setItem("locus_feed_tab", newTab);
    } catch {
      // Safe fallback if localStorage is disabled or restricted
    }
  };
  const [feedMode, setFeedMode] = React.useState<"normal" | "tagged_only">("normal");
  const [selectedTopics, setSelectedTopics] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (preferences?.feedMode) {
      setFeedMode(preferences.feedMode);
    }
  }, [preferences?.feedMode]);

  const handleToggleTopic = (slug: string) => {
    setSelectedTopics((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const handleClearTopics = () => {
    setSelectedTopics([]);
  };

  const {
    data,
    isLoading,
    isRefetching,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteFeedQuery({
    limit: itemsPerPage,
    status: feedTab,
    feedMode: isAiTaggingEnabled ? feedMode : undefined,
    topics: isAiTaggingEnabled && selectedTopics.length > 0 ? selectedTopics : undefined,
    enabled: isConnected,
  });

  const syncMutation = useSyncVideosMutation();
  const [syncFeedback, setSyncFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
    action?: {
      label: string;
      href: string;
    };
  } | null>(null);

  // Check URL query parameters for YouTube OAuth return
  React.useEffect(() => {
    const youtubeParam = searchParams.get("youtube");
    const errorParam = searchParams.get("youtube_error");

    if (youtubeParam === "connected") {
      setSyncFeedback({
        type: "success",
        message: "YouTube account connected successfully!",
      });
      refetchStatus();
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        access_denied: "YouTube authorization was canceled or access was denied.",
        oauth_denied: "Google OAuth authorization failed.",
        invalid_request: "Invalid OAuth request parameters.",
        invalid_state: "OAuth session verification failed or expired. Please try connecting again.",
        user_mismatch: "The authorized Google account does not match your current Locus session.",
        channel_not_found: "No active YouTube channel was found for that Google account.",
        internal_error: "An internal error occurred during YouTube connection.",
      };
      setSyncFeedback({
        type: "error",
        message: errorMessages[errorParam] || `YouTube connection failed: ${errorParam}`,
        action: {
          label: "Try Connecting",
          href: "/settings",
        },
      });
    }
  }, [searchParams, refetchStatus]);

  const handleConnectYouTube = async () => {
    setConnecting(true);
    setSyncFeedback(null);
    try {
      const res = await apiClient.get<{ url: string }>("/api/youtube/connect?returnPath=/");
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      setSyncFeedback({
        type: "error",
        message: getApiErrorMessage(
          err,
          "Failed to initiate YouTube connection. Please check server configuration.",
        ),
      });
      setConnecting(false);
    }
  };

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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6">
      {/* Feed Header & Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4 mb-5 md:mb-7 pb-4 md:pb-5 border-b border-border/60">
        <div className="w-full md:w-auto">
          <div className="hidden md:block mb-3">
            <h1 className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-foreground m-0 flex items-center gap-2.5">
              <span>Chronological Feed</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-mono m-0 mt-1">
              Recent videos exclusively from channels you follow, ordered newest first.
            </p>
          </div>

          {/* View Filter Segmented Tabs: Unwatched / Watched / All */}
          {isConnected && (
            <div
              role="tablist"
              aria-label="Feed filter tabs"
              className="sticky top-14 z-30 pt-1 pb-1 bg-background/95 backdrop-blur-md md:static md:bg-transparent md:backdrop-blur-none -mx-3 px-3 md:mx-0 md:px-0"
            >
              <div className="grid grid-cols-3 md:inline-flex items-center p-1 gap-1 rounded-xl bg-surface-2/70 border border-border/60 shadow-xs select-none">
                <button
                  type="button"
                  role="tab"
                  aria-selected={feedTab === "unwatched"}
                  onClick={() => handleTabChange("unwatched")}
                  className={cn(
                    "relative px-3.5 py-1.5 md:py-1 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer select-none rounded-lg",
                    feedTab === "unwatched"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {feedTab === "unwatched" && (
                    <motion.span
                      layoutId="activeFeedTab"
                      className="absolute inset-0 bg-surface-1 rounded-lg border border-border/80 shadow-xs"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Unwatched</span>
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={feedTab === "watched"}
                  onClick={() => handleTabChange("watched")}
                  className={cn(
                    "relative px-3.5 py-1.5 md:py-1 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer select-none rounded-lg",
                    feedTab === "watched"
                      ? "text-success"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {feedTab === "watched" && (
                    <motion.span
                      layoutId="activeFeedTab"
                      className="absolute inset-0 bg-surface-1 rounded-lg border border-border/80 shadow-xs"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    <span>Watched</span>
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={feedTab === "all"}
                  onClick={() => handleTabChange("all")}
                  className={cn(
                    "relative px-3.5 py-1.5 md:py-1 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer select-none rounded-lg",
                    feedTab === "all"
                      ? "text-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {feedTab === "all" && (
                    <motion.span
                      layoutId="activeFeedTab"
                      className="absolute inset-0 bg-surface-1 rounded-lg border border-border/80 shadow-xs"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">All</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls & Sync Status Indicator (Desktop only for manual sync; backend auto-syncs) */}
        {isConnected && (
          <div className="hidden md:flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            {isAiTaggingEnabled && (
              <FeedModeToggle feedMode={feedMode} onChange={setFeedMode} />
            )}
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
        )}
      </div>

      {/* Technical Topic Filter Chips (when Classic theme is active and AI tagging is enabled) */}
      {isConnected && theme !== "seren" && isAiTaggingEnabled && (
        <div className="mb-4">
          <TopicFilterChips
            selectedTopics={selectedTopics}
            onToggleTopic={handleToggleTopic}
            onClearTopics={handleClearTopics}
          />
        </div>
      )}

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
      {statusLoading || (isConnected && (isLoading || channelsLoading)) ? (
        /* Video Skeletons */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
          {Array.from({ length: 6 }).map((_, index) => (
            <VideoCardSkeleton key={index} />
          ))}
        </div>
      ) : !isConnected ? (
        /* YouTube Not Connected State */
        <Card className="max-w-xl mx-auto p-6 sm:p-10 text-center my-8 sm:my-12 flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mb-4 shadow-xs select-none">
            <YoutubeIcon className="w-6 h-6" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-foreground m-0 mb-2">
            Connect YouTube to view your feed
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md m-0 mb-6">
            Locus builds a chronological, algorithm-free timeline strictly from channels you follow. Connect your YouTube account to get started.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="default"
              size="default"
              onClick={handleConnectYouTube}
              disabled={connecting}
              className="gap-2 cursor-pointer bg-destructive hover:bg-destructive/90 text-white shadow-md active:scale-[0.98]"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <YoutubeIcon className="w-4 h-4" />
                  <span>Connect YouTube</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
            <Button variant="outline" size="default" asChild className="cursor-pointer">
              <Link href="/onboarding">Launch Setup Wizard</Link>
            </Button>
          </div>

          <p className="text-center text-[11px] font-mono text-muted-foreground/80 mt-6 max-w-sm m-0">
            Encrypted token security • Read-only access • Zero algorithm noise
          </p>
        </Card>
      ) : videos.length > 0 ? (
        /* Video Grid (Max 3 Columns for larger readable cards) */
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
            {videos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.28,
                  delay: Math.min(index * 0.04, 0.35),
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
              >
                <VideoCard video={video} />
              </motion.div>
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
      ) : followedChannels.length === 0 ? (
        /* No Channels Followed State */
        <Card className="max-w-xl mx-auto p-6 sm:p-10 text-center my-8 sm:my-12 flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-4 shadow-xs select-none">
            <SlidersHorizontal className="w-6 h-6 stroke-[2.2]" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-foreground m-0 mb-2">
            No followed creators yet
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md m-0 mb-6">
            Your YouTube account is connected, but you haven&apos;t selected any creators to follow. Curate your subscriptions to populate your feed.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="default" size="sm" asChild className="gap-2 cursor-pointer">
              <Link href="/settings?tab=channels">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Curate Channels</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="cursor-pointer">
              <Link href="/onboarding">Re-open Onboarding</Link>
            </Button>
          </div>
        </Card>
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
            onClick={() => handleTabChange("unwatched")}
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
              onClick={() => handleTabChange("watched")}
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
            To see videos in your feed, select channels to follow and sync recent uploads.
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
            <Button variant="outline" size="sm" asChild className="cursor-pointer">
              <Link href="/settings?tab=channels">Curate Channels</Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
