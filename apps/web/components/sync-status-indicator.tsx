"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { useSyncStatusQuery, useSyncVideosMutation } from "../lib/queries";
import { formatSyncRelativeTime } from "../lib/formatters";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

export interface SyncStatusIndicatorProps {
  /**
   * Layout variant:
   * - "full": displays status text + dedicated fallback sync button (ideal for Feed Header).
   * - "compact": condensed micro-capsule pill (ideal for Navbar).
   */
  variant?: "full" | "compact";
  className?: string;
  onSyncComplete?: (summary: { channelsProcessed: number; videosSynced: number }) => void;
  onSyncError?: (error: unknown) => void;
}

export function SyncStatusIndicator({
  variant = "full",
  className,
  onSyncComplete,
  onSyncError,
}: SyncStatusIndicatorProps) {
  const { data: statusData, isLoading: statusLoading } = useSyncStatusQuery();
  const syncMutation = useSyncVideosMutation();

  // Tick state to recompute relative time every 30 seconds
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 30000); // 30s interval
    return () => clearInterval(timer);
  }, []);

  const isSyncing = syncMutation.isPending || Boolean(statusData?.isSyncing);
  const isFailed = statusData?.lastStatus === "failed" && !isSyncing;
  const lastSyncedAt = statusData?.lastSyncedAt;

  // Generate exact user-facing status label
  const relativeTimeLabel = isSyncing
    ? "Syncing..."
    : isFailed
      ? "Sync failed"
      : formatSyncRelativeTime(lastSyncedAt);

  const handleManualSync = async () => {
    if (isSyncing) return;
    try {
      const res = await syncMutation.mutateAsync({
        trigger: "manual",
        force: true,
      });
      if (onSyncComplete) {
        onSyncComplete({
          channelsProcessed: res.channelsProcessed,
          videosSynced: res.videosSynced,
        });
      }
    } catch (err) {
      if (onSyncError) {
        onSyncError(err);
      }
    }
  };

  // Compact variant for Navbar
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium transition-all select-none border",
          isSyncing
            ? "bg-primary/10 border-primary/30 text-primary animate-pulse"
            : isFailed
              ? "bg-destructive/10 border-destructive/30 text-destructive"
              : "bg-surface-2/80 border-border/70 text-muted-foreground hover:text-foreground",
          className,
        )}
        title={
          isFailed && statusData?.lastError
            ? `Sync error: ${statusData.lastError}. Click to retry.`
            : relativeTimeLabel
        }
      >
        {isSyncing ? (
          <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
        ) : isFailed ? (
          <AlertCircle className="w-3 h-3 text-destructive shrink-0" />
        ) : (
          <Clock className="w-3 h-3 opacity-70 shrink-0" />
        )}

        <span className="truncate max-w-[140px] sm:max-w-[200px]">
          {relativeTimeLabel}
        </span>

        {/* 1-click sync/retry button in compact pill */}
        <button
          type="button"
          onClick={handleManualSync}
          disabled={isSyncing}
          className="hover:opacity-100 opacity-60 hover:text-primary transition-opacity cursor-pointer p-0.5 rounded-xs ml-0.5"
          aria-label="Trigger manual sync"
          title="Manual sync"
        >
          <RefreshCw
            className={cn("w-2.5 h-2.5", isSyncing && "animate-spin")}
          />
        </button>
      </div>
    );
  }

  // Full variant for Feed View Header
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto",
        className,
      )}
    >
      {/* Status Badge */}
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-colors select-none",
          isSyncing
            ? "bg-primary/10 border-primary/30 text-primary animate-pulse"
            : isFailed
              ? "bg-destructive/10 border-destructive/40 text-destructive"
              : "bg-surface-2/80 border-border text-muted-foreground",
        )}
      >
        {isSyncing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
        ) : isFailed ? (
          <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
        ) : lastSyncedAt ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-success/80 shrink-0" />
        ) : (
          <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
        )}

        <span>{relativeTimeLabel}</span>

        {/* Retry button on failure */}
        {isFailed && (
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="ml-1 text-[11px] underline underline-offset-2 font-bold hover:text-foreground cursor-pointer transition-colors"
          >
            Retry
          </button>
        )}
      </div>

      {/* Manual Sync Fallback Button */}
      <Button
        variant="default"
        size="sm"
        onClick={handleManualSync}
        disabled={isSyncing || statusLoading}
        className="gap-2 h-9 text-xs font-bold"
        aria-label="Sync YouTube uploads"
      >
        {isSyncing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Zap className="w-3.5 h-3.5" />
        )}
        <span>{isSyncing ? "Syncing..." : "Sync Videos"}</span>
      </Button>
    </div>
  );
}

