"use client";

import * as React from "react";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Search,
  RefreshCw,
  DownloadCloud,
  Zap,
  ExternalLink,
  Lock,
  Plus,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ImportedChannel } from "@locus/contracts";
import { authClient } from "../../lib/auth-client";
import { apiClient } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { getApiErrorMessage, isReauthRequiredError } from "../../lib/error-utils";
import {
  useYoutubeStatusQuery,
  useChannelListQuery,
  useImportSubscriptionsMutation,
  useToggleFollowMutation,
  useSyncVideosMutation,
  useBulkFollowChannelsMutation,
} from "../../lib/queries";
import { useChannelSelectionStore } from "../../lib/stores/channel-selection.store";
import { AppShell } from "../../components/app-shell";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { cn } from "../../lib/utils";

function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function SettingsContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  // YouTube status & channel queries via TanStack Query
  const { data: ytStatus, isLoading: statusLoading } = useYoutubeStatusQuery({
    enabled: Boolean(session),
  });

  const { data: channelData, isLoading: channelsLoading } = useChannelListQuery(
    {
      enabled: Boolean(session),
    },
  );

  const channels = channelData?.channels ?? [];

  // Mutations
  const importMutation = useImportSubscriptionsMutation();
  const toggleFollowMutation = useToggleFollowMutation();
  const syncMutation = useSyncVideosMutation();
  const bulkFollowMutation = useBulkFollowChannelsMutation();

  const importing = importMutation.isPending;
  const syncing = syncMutation.isPending;

  // Bulk channel selection state via focused Zustand store
  const {
    selectedChannelIds,
    toggleChannel,
    selectMany,
    deselectMany,
    pruneInvalidSelections,
    clearSelection,
  } = useChannelSelectionStore();

  // Synchronize selection store with current eligible channels:
  // Prunes any selected channel that has become followed (e.g. via individual follow or refetch)
  // or that is no longer present in imported channels, while preserving valid selections across filters.
  useEffect(() => {
    if (!channelsLoading) {
      const eligibleIds = channels
        .filter((ch) => !ch.isFollowed)
        .map((ch) => ch.id);
      pruneInvalidSelections(eligibleIds);
    }
  }, [channelsLoading, channels, pruneInvalidSelections]);

  // Clear selections when session ends / user logs out
  useEffect(() => {
    if (!sessionLoading && !session) {
      clearSelection();
    }
  }, [sessionLoading, session, clearSelection]);

  // Search filter (component-local UI state synced with URL search query if provided)
  const [searchFilter, setSearchFilter] = useState(
    searchParams.get("search") || searchParams.get("q") || "",
  );

  useEffect(() => {
    const query = searchParams.get("search") || searchParams.get("q");
    if (query !== null) {
      setSearchFilter(query);
    }
  }, [searchParams]);

  // Action states
  const [connecting, setConnecting] = useState(false);
  const [followingChannelId, setFollowingChannelId] = useState<string | null>(
    null,
  );

  // User feedback (transient banner state with optional actionable button)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  } | null>(null);

  // Unified error handler that detects YOUTUBE_REAUTH_REQUIRED, refreshes status,
  // and provides an immediate 1-click Reconnect action
  const handleActionError = (err: unknown, defaultMessage: string) => {
    if (isReauthRequiredError(err)) {
      queryClient.invalidateQueries({ queryKey: queryKeys.youtube.status() });
      setFeedback({
        type: "error",
        message:
          "Your YouTube authorization has expired or was revoked. Please reconnect your YouTube account.",
        action: {
          label: "Reconnect YouTube",
          onClick: handleConnect,
        },
      });
      return;
    }

    setFeedback({
      type: "error",
      message: getApiErrorMessage(err, defaultMessage),
    });
  };

  // 1. Process URL query parameters from OAuth callback
  useEffect(() => {
    const youtubeParam = searchParams.get("youtube");
    const errorParam = searchParams.get("youtube_error");

    if (youtubeParam === "connected") {
      setFeedback({
        type: "success",
        message:
          "YouTube account connected successfully! Next, import your subscriptions to select channels.",
      });
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        access_denied:
          "YouTube authorization was canceled or access was denied.",
        oauth_denied: "Google OAuth authorization failed.",
        invalid_request: "Invalid OAuth request parameters.",
        invalid_state:
          "OAuth session verification failed or expired. Please try connecting again.",
        user_mismatch:
          "The authorized Google account does not match your current Locus session.",
        channel_not_found:
          "No active YouTube channel was found for that Google account.",
        internal_error: "An internal error occurred during YouTube connection.",
      };
      setFeedback({
        type: "error",
        message:
          errorMessages[errorParam] ||
          `YouTube connection failed: ${errorParam}`,
        action: {
          label: "Try Again",
          onClick: handleConnect,
        },
      });
    }
  }, [searchParams]);

  // 2. Connect to YouTube OAuth
  const handleConnect = async () => {
    setConnecting(true);
    setFeedback(null);
    try {
      const res = await apiClient.get<{ url: string }>("/api/youtube/connect");
      if (res && res.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(
          err,
          "Failed to initiate YouTube connection. Please ensure YouTube OAuth is configured.",
        ),
      });
      setConnecting(false);
    }
  };

  // 3. Import Subscriptions
  const handleImportSubscriptions = async () => {
    setFeedback(null);
    try {
      const res = await importMutation.mutateAsync();
      setFeedback({
        type: "success",
        message: `Successfully imported ${res.importedCount} subscriptions (${res.totalAvailable} total channels available to follow).`,
      });
    } catch (err) {
      handleActionError(err, "Failed to import YouTube subscriptions.");
    }
  };

  // 4. Follow / Unfollow Toggle
  const handleToggleFollow = async (channel: ImportedChannel) => {
    const isCurrentlyFollowed = channel.isFollowed;
    setFollowingChannelId(channel.id);
    try {
      await toggleFollowMutation.mutateAsync({
        channelId: channel.id,
        isCurrentlyFollowed,
      });
    } catch (err) {
      handleActionError(
        err,
        `Failed to ${isCurrentlyFollowed ? "unfollow" : "follow"} ${channel.name}.`,
      );
    } finally {
      setFollowingChannelId(null);
    }
  };

  // 5. Sync Videos
  const handleSyncVideos = async () => {
    setFeedback(null);
    try {
      const res = await syncMutation.mutateAsync();
      setFeedback({
        type: "success",
        message: `Synced ${res.videosSynced} videos from ${res.channelsProcessed} followed channels!`,
      });
    } catch (err) {
      handleActionError(err, "Failed to sync videos.");
    }
  };

  // 6. Bulk Follow Selected Channels
  const handleBulkFollow = async () => {
    if (selectedChannelIds.length === 0) return;
    setFeedback(null);
    try {
      const res = await bulkFollowMutation.mutateAsync({
        channelIds: selectedChannelIds,
      });
      setFeedback({
        type: "success",
        message: `Successfully followed ${res.followedCount} channel${
          res.followedCount === 1 ? "" : "s"
        }!${
          res.alreadyFollowedCount > 0
            ? ` (${res.alreadyFollowedCount} already followed)`
            : ""
        }`,
      });
      clearSelection();
    } catch (err) {
      handleActionError(
        err,
        "Failed to follow selected channels. Please try again.",
      );
    }
  };

  // Unauthenticated view
  if (!sessionLoading && !session) {
    return (
      <div className="max-w-md mx-auto my-16 sm:my-24 px-4">
        <Card className="p-6 sm:p-8 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-md bg-accent/15 border-2 border-accent text-accent flex items-center justify-center mb-4 shadow-brutal-sm">
            <Lock className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-sans tracking-tight text-foreground m-0 mb-2">
            Authentication Required
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed m-0 mb-6 font-mono">
            Please sign in to manage your YouTube connection and followed channels.
          </p>
          <Button variant="default" size="default" asChild className="gap-2">
            <Link href="/">
              <span>Go to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  const followedCount = channels.filter((ch) => ch.isFollowed).length;

  const eligibleFilteredChannels = filteredChannels.filter(
    (ch) => !ch.isFollowed,
  );
  const eligibleChannelIds = eligibleFilteredChannels.map((ch) => ch.id);
  const allEligibleSelected =
    eligibleChannelIds.length > 0 &&
    eligibleChannelIds.every((id) => selectedChannelIds.includes(id));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Page Header */}
      <div className="mb-6 sm:mb-8 pb-5 border-b-2 border-border">
        <h1 className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-foreground m-0 mb-1">
          Channels & Settings
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground font-mono m-0">
          Manage your YouTube connection, imported subscriptions, and followed channels.
        </p>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={cn(
            "p-3.5 sm:p-4 rounded-md border-2 mb-6 flex items-center justify-between gap-3 text-xs sm:text-sm font-medium shadow-brutal-sm animate-in fade-in",
            feedback.type === "success" &&
              "border-success/50 bg-success/15 text-foreground",
            feedback.type === "error" &&
              "border-destructive/50 bg-destructive/15 text-foreground",
            feedback.type === "info" &&
              "border-primary/50 bg-primary/15 text-foreground",
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {feedback.type === "success" && (
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            )}
            {feedback.type === "error" && (
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            )}
            {feedback.type === "info" && (
              <Info className="w-4 h-4 text-primary shrink-0" />
            )}
            <span className="truncate">{feedback.message}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {feedback.action && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={feedback.action.onClick}
                className="h-7 text-xs font-semibold px-2.5 cursor-pointer"
              >
                {feedback.action.label}
              </Button>
            )}
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              aria-label="Dismiss feedback message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Section 1: YouTube Account Integration */}
      <Card className="mb-6">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 pb-4 sm:pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <YoutubeIcon className="w-5 h-5 text-destructive" />
                <span>YouTube Account</span>
              </CardTitle>
              {!statusLoading && (
                <Badge
                  variant={
                    ytStatus?.connected
                      ? "success"
                      : ytStatus?.status === "error"
                      ? "destructive"
                      : "secondary"
                  }
                  className="gap-1 text-[11px] font-bold"
                >
                  {ytStatus?.connected && (
                    <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                  )}
                  {ytStatus?.status === "error" && (
                    <AlertCircle className="w-3 h-3 stroke-[2.5]" />
                  )}
                  <span>
                    {ytStatus?.connected
                      ? "Connected"
                      : ytStatus?.status === "error"
                      ? "Re-auth Required"
                      : "Not Connected"}
                  </span>
                </Badge>
              )}
            </div>

            <CardDescription className="text-xs sm:text-sm text-muted-foreground font-mono">
              {ytStatus?.connected ? (
                <>
                  Authorized with read-only access for channel:{" "}
                  <code className="text-foreground bg-surface-2 px-1.5 py-0.5 rounded border border-border">
                    {ytStatus.externalAccountId || "Active Channel"}
                  </code>
                </>
              ) : ytStatus?.status === "error" ? (
                <span className="text-destructive font-medium">
                  Your YouTube authorization has expired or was revoked. Please reconnect your account below.
                </span>
              ) : (
                "Authorize Locus to read your subscriptions so you can select channels for your feed."
              )}
            </CardDescription>
          </div>

          <Button
            variant={ytStatus?.connected ? "outline" : "default"}
            size="sm"
            onClick={handleConnect}
            disabled={connecting}
            className="w-full sm:w-auto gap-2 shrink-0 cursor-pointer"
          >
            {connecting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : ytStatus?.connected ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reconnect YouTube</span>
              </>
            ) : ytStatus?.status === "error" ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reconnect YouTube</span>
              </>
            ) : (
              <>
                <YoutubeIcon className="w-3.5 h-3.5" />
                <span>Connect YouTube</span>
              </>
            )}
          </Button>
        </CardHeader>
      </Card>

      {/* Section 2: Subscription Workflow Management */}
      <Card className="mb-6">
        <CardHeader className="p-5 sm:p-6 pb-3 sm:pb-4">
          <CardTitle className="text-lg sm:text-xl font-bold">
            Subscription Management
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground font-semibold">
              Important distinction:
            </strong>{" "}
            Importing fetches your channel list from YouTube into your local catalog.{" "}
            <em className="text-foreground not-italic font-semibold">Following</em>{" "}
            a channel is what adds its uploads to your Chronological Feed.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 pt-0 flex flex-wrap items-center gap-3">
          {/* Import Subscriptions */}
          <Button
            variant="default"
            size="sm"
            onClick={handleImportSubscriptions}
            disabled={importing || !ytStatus?.connected}
            className="w-full sm:w-auto gap-2"
          >
            {importing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <DownloadCloud className="w-3.5 h-3.5" />
            )}
            <span>
              {importing ? "Importing Subscriptions..." : "Import Subscriptions"}
            </span>
          </Button>

          {/* Sync Recent Videos */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncVideos}
            disabled={syncing || !ytStatus?.connected || followedCount === 0}
            className="w-full sm:w-auto gap-2"
          >
            {syncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-primary" />
            )}
            <span>{syncing ? "Syncing Videos..." : "Sync Recent Videos"}</span>
          </Button>

          {/* View Feed Direct Shortcut */}
          <Button
            variant="secondary"
            size="sm"
            asChild
            className="w-full sm:w-auto sm:ml-auto gap-1.5"
          >
            <Link href="/">
              <span>View Feed</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Section 3: Channel Catalog & Follow Management */}
      <Card>
        <CardHeader className="p-5 sm:p-6 pb-4 sm:pb-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <span>Available Channels</span>
                <Badge variant="outline" className="text-xs font-mono font-bold">
                  {channels.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground font-mono mt-1">
                {followedCount} channel{followedCount === 1 ? "" : "s"} currently followed.
              </CardDescription>
            </div>

            {/* Catalog Toolbar: Select All & Search Filter */}
            <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
              {eligibleFilteredChannels.length > 0 && (
                <Button
                  type="button"
                  variant={allEligibleSelected ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (allEligibleSelected) {
                      deselectMany(eligibleChannelIds);
                    } else {
                      selectMany(eligibleChannelIds);
                    }
                  }}
                  className="gap-2 text-xs font-mono font-semibold"
                >
                  <span
                    className={cn(
                      "w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-colors pointer-events-none",
                      allEligibleSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border-strong bg-surface-1",
                    )}
                    aria-hidden="true"
                  >
                    {allEligibleSelected && (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                  </span>
                  <span>
                    {allEligibleSelected
                      ? "Deselect All"
                      : `Select All (${eligibleFilteredChannels.length})`}
                  </span>
                </Button>
              )}

              {/* Channel Search Input */}
              {channels.length > 0 && (
                <div className="relative flex-1 sm:flex-initial min-w-[200px] sm:min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="search"
                    placeholder="Filter channels..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    aria-label="Filter channels"
                    className="h-9 pl-9 pr-8 text-xs sm:text-sm"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter("")}
                      aria-label="Clear filter"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 pt-0">
          {/* Loading Channels State */}
          {channelsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((key) => (
                <div
                  key={key}
                  className="p-3.5 rounded-md border-2 border-border/50 bg-surface-1 flex items-center justify-between gap-4 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-sm bg-surface-3" />
                    <div className="w-10 h-10 rounded-md bg-surface-3 border-2 border-border-strong shrink-0" />
                    <div className="space-y-2">
                      <div className="h-4 bg-surface-3 rounded-sm w-36" />
                      <div className="h-3 bg-surface-3 rounded-sm w-24" />
                    </div>
                  </div>
                  <div className="w-24 h-8 bg-surface-3 rounded-md" />
                </div>
              ))}
            </div>
          ) : filteredChannels.length > 0 ? (
            /* Channel Item List */
            <div className="space-y-2.5">
              {filteredChannels.map((channel) => {
                const isSelected = selectedChannelIds.includes(channel.id);
                return (
                  <div
                    key={channel.id}
                    className={cn(
                      "p-3 sm:p-3.5 rounded-md border-2 flex items-center justify-between gap-3 sm:gap-4 transition-all duration-150",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-brutal-sm"
                        : "border-border/60 hover:border-border hover:bg-surface-2/50",
                    )}
                  >
                    {/* Left: Checkbox, Avatar & Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      {!channel.isFollowed && (
                        <Checkbox
                          id={`select-${channel.id}`}
                          aria-label={`Select ${channel.name} to follow`}
                          checked={isSelected}
                          onCheckedChange={() => toggleChannel(channel.id)}
                        />
                      )}

                      {/* Channel Avatar */}
                      <div className="shrink-0">
                        {channel.thumbnailUrl ? (
                          <img
                            src={channel.thumbnailUrl}
                            alt={channel.name}
                            loading="lazy"
                            className="w-10 h-10 rounded-md object-cover block border-2 border-border-strong shadow-[1px_1px_0px_0px_#000000]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-surface-3 border-2 border-border-strong flex items-center justify-center text-foreground font-mono font-bold text-sm select-none shadow-[1px_1px_0px_0px_#000000]">
                            {channel.name[0]?.toUpperCase() || "C"}
                          </div>
                        )}
                      </div>

                      {/* Channel Info */}
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-foreground truncate flex items-center gap-1.5 group">
                          <a
                            href={channel.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline"
                            title={channel.name}
                          >
                            {channel.name}
                          </a>
                          <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        <div className="font-mono text-xs text-muted-foreground truncate">
                          {channel.externalId}
                        </div>
                      </div>
                    </div>

                    {/* Right: Follow / Unfollow Toggle Action */}
                    <Button
                      type="button"
                      variant={channel.isFollowed ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleToggleFollow(channel)}
                      disabled={followingChannelId === channel.id}
                      className={cn(
                        "shrink-0 min-w-[100px] gap-1.5 text-xs font-semibold",
                        channel.isFollowed &&
                          "border-success/50 text-success hover:bg-destructive/15 hover:text-destructive hover:border-destructive/50 transition-colors",
                      )}
                    >
                      {followingChannelId === channel.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : channel.isFollowed ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Follow</span>
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty Channel State */
            <div className="p-8 sm:p-12 text-center rounded-md border-2 border-dashed border-border-strong bg-surface-1 flex flex-col items-center">
              {searchFilter ? (
                <>
                  <p className="text-sm font-semibold text-foreground m-0 mb-1">
                    No channels matching &ldquo;{searchFilter}&rdquo;
                  </p>
                  <p className="text-xs text-muted-foreground font-mono m-0 mb-4">
                    Try adjusting your filter keyword or clear search.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchFilter("")}
                  >
                    Clear Filter
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-foreground m-0 mb-1">
                    No channels imported yet
                  </p>
                  <p className="text-xs text-muted-foreground font-mono leading-relaxed max-w-sm m-0 mb-5">
                    Click &ldquo;Import Subscriptions&rdquo; above to load channels from your
                    authorized YouTube account.
                  </p>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleImportSubscriptions}
                    disabled={importing || !ytStatus?.connected}
                    className="gap-2"
                  >
                    <DownloadCloud className="w-3.5 h-3.5" />
                    <span>Import Subscriptions</span>
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Sticky Bulk Action Bar */}
      {selectedChannelIds.length > 0 && (
        <aside
          role="region"
          aria-label="Bulk follow actions"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-3 sm:gap-6 p-3 sm:px-5 sm:py-3.5 rounded-md bg-card border-2 border-border shadow-brutal-lg max-w-[92vw] w-[460px] animate-in slide-in-from-bottom-4"
        >
          {/* Selected Count Indicator */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Badge
              variant="default"
              className="h-5 px-2 font-mono font-bold text-xs"
            >
              {selectedChannelIds.length}
            </Badge>
            <span className="text-xs sm:text-sm font-bold text-foreground truncate">
              channel{selectedChannelIds.length === 1 ? "" : "s"} selected
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearSelection()}
              disabled={bulkFollowMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleBulkFollow}
              disabled={bulkFollowMutation.isPending}
              className="gap-1.5 text-xs font-bold"
            >
              {bulkFollowMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Following...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Follow Selected</span>
                </>
              )}
            </Button>
          </div>
        </aside>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center text-muted-foreground font-mono text-sm">
            Loading settings...
          </div>
        }
      >
        <SettingsContent />
      </Suspense>
    </AppShell>
  );
}
