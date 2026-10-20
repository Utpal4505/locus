"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { ImportedChannel } from "@locus/contracts";
import { authClient } from "../../lib/auth-client";
import { apiClient } from "../../lib/api-client";
import { getApiErrorMessage } from "../../lib/error-utils";
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

function SettingsContent() {
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

  // User feedback (transient banner state)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

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
      setFeedback({
        type: "error",
        message: getApiErrorMessage(
          err,
          "Failed to import YouTube subscriptions.",
        ),
      });
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
      setFeedback({
        type: "error",
        message: getApiErrorMessage(
          err,
          `Failed to ${isCurrentlyFollowed ? "unfollow" : "follow"} ${channel.name}.`,
        ),
      });
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
      setFeedback({
        type: "error",
        message: getApiErrorMessage(err, "Failed to sync videos."),
      });
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
      setFeedback({
        type: "error",
        message: getApiErrorMessage(
          err,
          "Failed to follow selected channels. Please try again.",
        ),
      });
      // Preserve selection on failure so the user can retry
    }
  };

  // Unauthenticated view
  if (!sessionLoading && !session) {
    return (
      <div
        style={{
          maxWidth: "600px",
          margin: "80px auto",
          padding: "0 24px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 700,
            marginBottom: "12px",
            color: "#fff",
          }}
        >
          Authentication Required
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "rgba(255, 255, 255, 0.6)",
            marginBottom: "24px",
          }}
        >
          Please sign in to manage your YouTube connection and followed
          channels.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "10px 20px",
            borderRadius: "8px",
            background: "#fff",
            color: "#000",
            fontWeight: 600,
            fontSize: "14px",
            textDecoration: "none",
          }}
        >
          Go to Sign In
        </Link>
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
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "32px 24px" }}>
      {/* Page Title */}
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            margin: "0 0 6px 0",
            color: "#fff",
          }}
        >
          Channels & Settings
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "rgba(255, 255, 255, 0.6)",
            margin: 0,
          }}
        >
          Manage your YouTube connection, imported subscriptions, and followed
          channels.
        </p>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "8px",
            marginBottom: "24px",
            background:
              feedback.type === "success"
                ? "rgba(16, 185, 129, 0.15)"
                : feedback.type === "error"
                  ? "rgba(239, 68, 68, 0.15)"
                  : "rgba(99, 102, 241, 0.15)",
            border: `1px solid ${
              feedback.type === "success"
                ? "rgba(16, 185, 129, 0.3)"
                : feedback.type === "error"
                  ? "rgba(239, 68, 68, 0.3)"
                  : "rgba(99, 102, 241, 0.3)"
            }`,
            color:
              feedback.type === "success"
                ? "#34d399"
                : feedback.type === "error"
                  ? "#f87171"
                  : "#818cf8",
            fontSize: "13px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Section 1: YouTube Integration */}
      <section
        style={{
          padding: "24px",
          borderRadius: "12px",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "6px",
              }}
            >
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  margin: 0,
                  color: "#fff",
                }}
              >
                YouTube Account
              </h2>
              {!statusLoading && (
                <span
                  style={{
                    fontSize: "12px",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    background: ytStatus?.connected
                      ? "rgba(16, 185, 129, 0.2)"
                      : "rgba(255, 255, 255, 0.1)",
                    color: ytStatus?.connected
                      ? "#34d399"
                      : "rgba(255, 255, 255, 0.6)",
                    fontWeight: 600,
                  }}
                >
                  {ytStatus?.connected ? "Connected" : "Not Connected"}
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: "13px",
                color: "rgba(255, 255, 255, 0.6)",
                margin: 0,
              }}
            >
              {ytStatus?.connected
                ? `Authorized with read-only access for channel: ${ytStatus.externalAccountId || "Active"}`
                : "Authorize Locus to read your subscriptions so you can select channels for your feed."}
            </p>
          </div>

          <button
            onClick={handleConnect}
            disabled={connecting}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              background: ytStatus?.connected
                ? "rgba(255, 255, 255, 0.05)"
                : "#fff",
              color: ytStatus?.connected ? "#fff" : "#000",
              fontWeight: 600,
              fontSize: "13px",
              cursor: connecting ? "not-allowed" : "pointer",
            }}
          >
            {connecting
              ? "Connecting..."
              : ytStatus?.connected
                ? "Reconnect YouTube"
                : "Connect YouTube"}
          </button>
        </div>
      </section>

      {/* Section 2: Subscription Actions */}
      <section
        style={{
          padding: "24px",
          borderRadius: "12px",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          marginBottom: "24px",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
              margin: "0 0 6px 0",
              color: "#fff",
            }}
          >
            Subscription Management
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255, 255, 255, 0.6)",
              margin: 0,
            }}
          >
            <strong>Important distinction:</strong> Importing fetches your
            subscriptions from YouTube into your catalog. <em>Following</em> a
            channel is what places its videos in your Chronological Feed.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            onClick={handleImportSubscriptions}
            disabled={importing || !ytStatus?.connected}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              border: "1px solid #4f46e5",
              background: "#4f46e5",
              color: "#fff",
              fontWeight: 600,
              fontSize: "13px",
              cursor:
                importing || !ytStatus?.connected ? "not-allowed" : "pointer",
              opacity: !ytStatus?.connected ? 0.5 : 1,
            }}
          >
            {importing ? "Importing Subscriptions..." : "Import Subscriptions"}
          </button>

          <button
            onClick={handleSyncVideos}
            disabled={syncing || !ytStatus?.connected || followedCount === 0}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              background: "rgba(255, 255, 255, 0.05)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "13px",
              cursor:
                syncing || !ytStatus?.connected || followedCount === 0
                  ? "not-allowed"
                  : "pointer",
              opacity: followedCount === 0 ? 0.5 : 1,
            }}
          >
            {syncing ? "Syncing Videos..." : "Sync Recent Videos"}
          </button>

          <Link
            href="/"
            style={{
              marginLeft: "auto",
              padding: "10px 18px",
              borderRadius: "8px",
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            View Feed →
          </Link>
        </div>
      </section>

      {/* Section 3: Channel Catalog & Follow Toggles */}
      <section
        style={{
          padding: "24px",
          borderRadius: "12px",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                margin: "0 0 4px 0",
                color: "#fff",
              }}
            >
              Available Channels ({channels.length})
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "rgba(255, 255, 255, 0.6)",
                margin: 0,
              }}
            >
              {followedCount} channel{followedCount === 1 ? "" : "s"} currently
              followed.
            </p>
          </div>

          {/* Actions & Search Filter */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {eligibleFilteredChannels.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (allEligibleSelected) {
                    deselectMany(eligibleChannelIds);
                  } else {
                    selectMany(eligibleChannelIds);
                  }
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: allEligibleSelected
                    ? "rgba(99, 102, 241, 0.2)"
                    : "rgba(255, 255, 255, 0.05)",
                  color: allEligibleSelected ? "#818cf8" : "#fff",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{allEligibleSelected ? "☑" : "☐"}</span>
                <span>
                  {allEligibleSelected
                    ? "Deselect All"
                    : `Select All (${eligibleFilteredChannels.length})`}
                </span>
              </button>
            )}

            {channels.length > 0 && (
              <input
                type="text"
                placeholder="Filter channels..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "rgba(0, 0, 0, 0.3)",
                  color: "#fff",
                  fontSize: "13px",
                  minWidth: "220px",
                }}
              />
            )}
          </div>
        </div>

        {/* Channel List */}
        {channelsLoading ? (
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255, 255, 255, 0.6)",
              padding: "20px 0",
            }}
          >
            Loading channels...
          </p>
        ) : filteredChannels.length > 0 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {filteredChannels.map((channel) => {
              const isSelected = selectedChannelIds.includes(channel.id);
              return (
                <div
                  key={channel.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    background: isSelected
                      ? "rgba(99, 102, 241, 0.08)"
                      : "rgba(255, 255, 255, 0.02)",
                    border: isSelected
                      ? "1px solid rgba(99, 102, 241, 0.4)"
                      : "1px solid rgba(255, 255, 255, 0.05)",
                    gap: "16px",
                    transition: "border-color 0.15s ease, background 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      minWidth: 0,
                    }}
                  >
                    {!channel.isFollowed && (
                      <input
                        type="checkbox"
                        aria-label={`Select ${channel.name} to follow`}
                        checked={isSelected}
                        onChange={() => toggleChannel(channel.id)}
                        style={{
                          width: "18px",
                          height: "18px",
                          cursor: "pointer",
                          accentColor: "#4f46e5",
                          flexShrink: 0,
                        }}
                      />
                    )}

                    {channel.thumbnailUrl ? (
                      <img
                        src={channel.thumbnailUrl}
                        alt={channel.name}
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: "#3f3f46",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 600,
                          fontSize: "15px",
                          flexShrink: 0,
                        }}
                      >
                        {channel.name[0]?.toUpperCase()}
                      </div>
                    )}

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#fff",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <a
                          href={channel.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {channel.name}
                        </a>
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "rgba(255, 255, 255, 0.5)",
                          fontFamily: "var(--font-geist-mono, monospace)",
                        }}
                      >
                        {channel.externalId}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleFollow(channel)}
                    disabled={followingChannelId === channel.id}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      border: channel.isFollowed
                        ? "1px solid rgba(16, 185, 129, 0.4)"
                        : "1px solid rgba(255, 255, 255, 0.2)",
                      background: channel.isFollowed
                        ? "rgba(16, 185, 129, 0.15)"
                        : "transparent",
                      color: channel.isFollowed ? "#34d399" : "#fff",
                      fontWeight: 600,
                      fontSize: "13px",
                      cursor:
                        followingChannelId === channel.id
                          ? "not-allowed"
                          : "pointer",
                      flexShrink: 0,
                      minWidth: "90px",
                    }}
                  >
                    {followingChannelId === channel.id
                      ? "Updating..."
                      : channel.isFollowed
                        ? "✓ Following"
                        : "+ Follow"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "rgba(255, 255, 255, 0.6)",
              fontSize: "14px",
            }}
          >
            {searchFilter ? (
              <p>No channels matching &ldquo;{searchFilter}&rdquo;</p>
            ) : (
              <div>
                <p style={{ marginBottom: "12px" }}>
                  No channels imported yet.
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "rgba(255, 255, 255, 0.4)",
                  }}
                >
                  Click &ldquo;Import Subscriptions&rdquo; above to load
                  channels from your YouTube account.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Sticky Action Bar for Bulk Channel Selection */}
      {selectedChannelIds.length > 0 && (
        <div
          role="region"
          aria-label="Bulk follow actions"
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            padding: "12px 20px",
            borderRadius: "12px",
            background: "#18181b",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4)",
            color: "#fff",
            maxWidth: "90vw",
            width: "480px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "22px",
                height: "22px",
                padding: "0 6px",
                borderRadius: "11px",
                background: "#4f46e5",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              {selectedChannelIds.length}
            </span>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>
              channel{selectedChannelIds.length === 1 ? "" : "s"} selected
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => clearSelection()}
              disabled={bulkFollowMutation.isPending}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "transparent",
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "13px",
                cursor: bulkFollowMutation.isPending
                  ? "not-allowed"
                  : "pointer",
                fontWeight: 500,
              }}
            >
              Cancel
            </button>

            <button
              onClick={handleBulkFollow}
              disabled={bulkFollowMutation.isPending}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "1px solid #4f46e5",
                background: "#4f46e5",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: bulkFollowMutation.isPending
                  ? "not-allowed"
                  : "pointer",
                boxShadow: "0 2px 8px rgba(79, 70, 229, 0.4)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {bulkFollowMutation.isPending ? "Following..." : "Follow Selected"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div
            style={{
              maxWidth: "1000px",
              margin: "40px auto",
              padding: "0 24px",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Loading settings...
          </div>
        }
      >
        <SettingsContent />
      </Suspense>
    </AppShell>
  );
}
