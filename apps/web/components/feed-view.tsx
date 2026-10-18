"use client";

import { useState } from "react";
import Link from "next/link";
import { getApiErrorMessage } from "../lib/error-utils";
import { useInfiniteFeedQuery, useSyncVideosMutation } from "../lib/queries";
import { VideoCard } from "./video-card";

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
  const [syncFeedback, setSyncFeedback] = useState<{
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
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 24px" }}>
      {/* Feed Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              margin: "0 0 6px 0",
              color: "#fff",
            }}
          >
            Chronological Feed
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255, 255, 255, 0.6)",
              margin: 0,
            }}
          >
            Recent videos exclusively from channels you follow, ordered newest
            first.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching || syncMutation.isPending}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              background: "rgba(255, 255, 255, 0.05)",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              cursor:
                isLoading || isRefetching || syncMutation.isPending
                  ? "not-allowed"
                  : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>⟳</span>
            {isRefetching ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={handleSyncVideos}
            disabled={syncMutation.isPending || isLoading || isRefetching}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              border: "1px solid #4f46e5",
              background: "#4f46e5",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              cursor:
                syncMutation.isPending || isLoading || isRefetching
                  ? "not-allowed"
                  : "pointer",
              boxShadow: "0 2px 8px rgba(79, 70, 229, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>⚡</span>
            {syncMutation.isPending ? "Syncing Uploads..." : "Sync Videos"}
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncFeedback && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "24px",
            background:
              syncFeedback.type === "success"
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${
              syncFeedback.type === "success"
                ? "rgba(16, 185, 129, 0.3)"
                : "rgba(239, 68, 68, 0.3)"
            }`,
            color: syncFeedback.type === "success" ? "#34d399" : "#f87171",
            fontSize: "13px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{syncFeedback.message}</span>
          <button
            onClick={() => setSyncFeedback(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "8px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#f87171",
            fontSize: "14px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{errorMessage}</span>
          <button
            onClick={() => refetch()}
            style={{
              padding: "4px 12px",
              borderRadius: "4px",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              background: "transparent",
              color: "#f87171",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Feed Content */}
      {isLoading ? (
        /* Loading Skeletons */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "24px",
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((key) => (
            <div
              key={key}
              style={{
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16 / 9",
                  background: "rgba(255, 255, 255, 0.06)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
              <div style={{ padding: "16px" }}>
                <div
                  style={{
                    height: "16px",
                    background: "rgba(255, 255, 255, 0.06)",
                    borderRadius: "4px",
                    marginBottom: "8px",
                    width: "85%",
                  }}
                />
                <div
                  style={{
                    height: "12px",
                    background: "rgba(255, 255, 255, 0.04)",
                    borderRadius: "4px",
                    width: "50%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length > 0 ? (
        /* Video Grid */
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "24px",
            }}
          >
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>

          {/* Load More Pagination */}
          {hasNextPage && (
            <div
              style={{
                marginTop: "40px",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                style={{
                  padding: "10px 24px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: isFetchingNextPage ? "not-allowed" : "pointer",
                  transition: "background 0.15s ease",
                }}
              >
                {isFetchingNextPage
                  ? "Loading older videos..."
                  : "Load More Videos"}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty Feed State */
        <div
          style={{
            padding: "64px 24px",
            borderRadius: "16px",
            border: "1px dashed rgba(255, 255, 255, 0.15)",
            background: "rgba(255, 255, 255, 0.02)",
            textAlign: "center",
            maxWidth: "600px",
            margin: "40px auto",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(99, 102, 241, 0.15)",
              color: "#818cf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              margin: "0 auto 20px auto",
            }}
          >
            📺
          </div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              margin: "0 0 10px 0",
              color: "#fff",
            }}
          >
            Your feed is empty
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255, 255, 255, 0.6)",
              lineHeight: 1.6,
              margin: "0 0 24px 0",
            }}
          >
            To see videos in your feed, connect your YouTube account, import
            your subscriptions, and select channels to follow.
          </p>

          <ol
            style={{
              textAlign: "left",
              fontSize: "13px",
              color: "rgba(255, 255, 255, 0.7)",
              lineHeight: 1.8,
              margin: "0 auto 28px auto",
              maxWidth: "360px",
              paddingLeft: "20px",
            }}
          >
            <li>Connect YouTube in Channels & Settings</li>
            <li>Import your YouTube subscriptions</li>
            <li>Follow channels you want in your feed</li>
            <li>Click &ldquo;Sync Videos&rdquo; to fetch recent uploads</li>
          </ol>

          <Link
            href="/settings"
            style={{
              display: "inline-block",
              padding: "10px 20px",
              borderRadius: "8px",
              background: "#4f46e5",
              color: "#fff",
              fontWeight: 600,
              fontSize: "14px",
              textDecoration: "none",
              boxShadow: "0 2px 10px rgba(79, 70, 229, 0.3)",
            }}
          >
            Go to Channels & Settings →
          </Link>
        </div>
      )}
    </div>
  );
}
