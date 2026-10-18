"use client";

import type { FeedItem } from "@locus/contracts";
import { formatDuration, formatRelativeTime } from "../lib/formatters";

interface VideoCardProps {
  video: FeedItem;
}

export function VideoCard({ video }: VideoCardProps) {
  const durationText = formatDuration(video.durationSeconds);
  const relativeDate = formatRelativeTime(video.publishedAt);
  const targetUrl = video.url || video.videoUrl;

  return (
    <article
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: "12px",
        overflow: "hidden",
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        transition: "transform 0.15s ease, border-color 0.15s ease",
      }}
    >
      {/* Thumbnail Container */}
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          background: "#18181b",
          overflow: "hidden",
        }}
      >
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            loading="lazy"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255, 255, 255, 0.4)",
              fontSize: "14px",
            }}
          >
            No Thumbnail
          </div>
        )}

        {/* Duration Badge */}
        {durationText && (
          <span
            style={{
              position: "absolute",
              bottom: "8px",
              right: "8px",
              padding: "2px 6px",
              borderRadius: "4px",
              background: "rgba(0, 0, 0, 0.8)",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "var(--font-geist-mono, monospace)",
              letterSpacing: "0.02em",
            }}
          >
            {durationText}
          </span>
        )}
      </a>

      {/* Content Meta Container */}
      <div
        style={{ padding: "14px 16px", display: "flex", gap: "12px", flex: 1 }}
      >
        {/* Channel Avatar */}
        <div style={{ flexShrink: 0 }}>
          {video.channelThumbnailUrl ? (
            <img
              src={video.channelThumbnailUrl}
              alt={video.channelName}
              loading="lazy"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                objectFit: "cover",
                display: "block",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            />
          ) : (
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#3f3f46",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              {video.channelName ? video.channelName[0]?.toUpperCase() : "C"}
            </div>
          )}
        </div>

        {/* Video Info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
          }}
        >
          <h2
            style={{
              margin: "0 0 6px 0",
              fontSize: "14px",
              fontWeight: 600,
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#fff", textDecoration: "none" }}
              title={video.title}
            >
              {video.title}
            </a>
          </h2>

          <div
            style={{
              fontSize: "12px",
              color: "rgba(255, 255, 255, 0.6)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "6px",
              marginBottom: "6px",
            }}
          >
            <span
              style={{ fontWeight: 500, color: "rgba(255, 255, 255, 0.85)" }}
            >
              {video.channelName}
            </span>
            <span>•</span>
            <span>{relativeDate}</span>
          </div>

          {/* User Library State Badges */}
          {video.library && (
            <div
              style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
                marginTop: "auto",
                paddingTop: "6px",
              }}
            >
              {video.library.isWatched && (
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    color: "#34d399",
                    fontWeight: 500,
                  }}
                >
                  ✓ Watched
                </span>
              )}
              {video.library.isBookmarked && (
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    color: "#fbbf24",
                    fontWeight: 500,
                  }}
                >
                  ★ Saved
                </span>
              )}
              {video.library.isInQueue && (
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(99, 102, 241, 0.15)",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                    color: "#818cf8",
                    fontWeight: 500,
                  }}
                >
                  ⧖ Queue
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
