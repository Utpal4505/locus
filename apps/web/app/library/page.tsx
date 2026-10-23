"use client";

import * as React from "react";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  Star,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Lock,
  Loader2,
  Tv,
  Play,
} from "lucide-react";
import type { LibraryTab, HistoryStatus } from "@locus/contracts";
import { authClient } from "../../lib/auth-client";
import {
  useLibraryQuery,
  useClearQueueMutation,
  useClearHistoryMutation,
} from "../../lib/queries";
import { AppShell } from "../../components/app-shell";
import { VideoCard } from "../../components/video-card";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { cn } from "../../lib/utils";

function LibraryContent() {
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const tabParam = searchParams.get("tab") as string | null;
  const statusParam = searchParams.get("status") as HistoryStatus | null;

  const initialTab: LibraryTab =
    tabParam === "favorites" || tabParam === "bookmarks"
      ? "favorites"
      : tabParam === "history"
        ? "history"
        : "queue";

  const initialStatus: HistoryStatus =
    statusParam === "in_progress" || statusParam === "completed"
      ? statusParam
      : "all";

  const [activeTab, setActiveTab] = useState<LibraryTab>(initialTab);
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>(initialStatus);

  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab === "queue" || currentTab === "favorites" || currentTab === "history") {
      setActiveTab(currentTab as LibraryTab);
    } else if (currentTab === "bookmarks") {
      setActiveTab("favorites");
    }

    const currentStatus = searchParams.get("status") as HistoryStatus | null;
    if (currentStatus === "in_progress" || currentStatus === "completed" || currentStatus === "all") {
      setHistoryStatus(currentStatus);
    }
  }, [searchParams]);

  const handleTabChange = (tab: LibraryTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      if (tab !== "history") {
        url.searchParams.delete("status");
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  const handleHistoryStatusChange = (status: HistoryStatus) => {
    setHistoryStatus(status);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("status", status);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const { data, isLoading, isRefetching } = useLibraryQuery(activeTab, {
    enabled: Boolean(session),
    status: activeTab === "history" ? historyStatus : undefined,
  });

  const clearQueueMutation = useClearQueueMutation();
  const clearHistoryMutation = useClearHistoryMutation();

  const [confirmClear, setConfirmClear] = useState<LibraryTab | null>(null);

  const handleClear = async () => {
    if (activeTab === "queue") {
      await clearQueueMutation.mutateAsync();
    } else if (activeTab === "history") {
      await clearHistoryMutation.mutateAsync();
    }
    setConfirmClear(null);
  };

  // Unauthenticated view
  if (!sessionLoading && !session) {
    return (
      <div className="max-w-md mx-auto my-16 sm:my-24 px-4">
        <Card className="p-6 sm:p-8 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/40 text-accent flex items-center justify-center mb-4 shadow-xs select-none">
            <Lock className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-sans tracking-tight text-foreground m-0 mb-2">
            Authentication Required
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed m-0 mb-6 font-mono">
            Please sign in to access your Watch Later queue, favorites, and watch history.
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

  const items = data?.items ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Page Header */}
      <div className="mb-6 pb-5 border-b border-border">
        <h1 className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-foreground m-0 mb-1">
          Personal Library
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground font-mono m-0">
          Manage your watch queue, favorite videos, and watch history.
        </p>
      </div>

      {/* Control Toolbar: Master Segmented Tabs + Contextual Sub-Filters + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 mb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented Navigation Tab Bar */}
          <div
            role="tablist"
            aria-label="Library tabs"
            className="inline-flex items-center p-1 rounded-lg bg-surface-2/70 border border-border/80 gap-1"
          >
            {/* Queue Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "queue"}
              onClick={() => handleTabChange("queue")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none",
                activeTab === "queue"
                  ? "bg-surface-1 text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
              )}
            >
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Watch Later</span>
              {activeTab === "queue" && !isLoading && items.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-mono rounded-full font-bold bg-surface-3 text-foreground">
                  {items.length}
                </span>
              )}
            </button>

            {/* Favorites Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "favorites"}
              onClick={() => handleTabChange("favorites")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none",
                activeTab === "favorites"
                  ? "bg-surface-1 text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
              )}
            >
              <Star className="w-3.5 h-3.5 text-rose-500 fill-current" />
              <span>Favorites</span>
              {activeTab === "favorites" && !isLoading && items.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-mono rounded-full font-bold bg-surface-3 text-foreground">
                  {items.length}
                </span>
              )}
            </button>

            {/* History Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "history"}
              onClick={() => handleTabChange("history")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none",
                activeTab === "history"
                  ? "bg-surface-1 text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>History</span>
              {activeTab === "history" && !isLoading && items.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-mono rounded-full font-bold bg-surface-3 text-foreground">
                  {items.length}
                </span>
              )}
            </button>
          </div>

          {/* History Sub-Filter Segmented Capsule */}
          {activeTab === "history" && (
            <div
              role="tablist"
              aria-label="History filter"
              className="inline-flex items-center p-1 rounded-lg bg-surface-2/50 border border-border/60 gap-1 animate-in fade-in"
            >
              <button
                type="button"
                role="tab"
                aria-selected={historyStatus === "all"}
                onClick={() => handleHistoryStatusChange("all")}
                className={cn(
                  "px-2.5 py-1 text-xs font-mono rounded-md font-semibold transition-all cursor-pointer select-none",
                  historyStatus === "all"
                    ? "bg-surface-1 text-foreground shadow-xs border border-border/70 font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
                )}
              >
                All
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={historyStatus === "in_progress"}
                onClick={() => handleHistoryStatusChange("in_progress")}
                className={cn(
                  "px-2.5 py-1 text-xs font-mono rounded-md font-semibold transition-all cursor-pointer select-none flex items-center gap-1.5",
                  historyStatus === "in_progress"
                    ? "bg-surface-1 text-foreground shadow-xs border border-border/70 font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
                )}
              >
                <Play className="w-3 h-3 fill-current text-primary" />
                <span>In Progress</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={historyStatus === "completed"}
                onClick={() => handleHistoryStatusChange("completed")}
                className={cn(
                  "px-2.5 py-1 text-xs font-mono rounded-md font-semibold transition-all cursor-pointer select-none flex items-center gap-1.5",
                  historyStatus === "completed"
                    ? "bg-surface-1 text-foreground shadow-xs border border-border/70 font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
                )}
              >
                <CheckCircle2 className="w-3 h-3 stroke-[2.5] text-success" />
                <span>Completed</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Controls for Current Tab (Clear Queue / Clear History) */}
        {items.length > 0 && (activeTab === "queue" || activeTab === "history") && (
          <div>
            {confirmClear === activeTab ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">
                  Confirm clear?
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClear}
                  disabled={
                    clearQueueMutation.isPending || clearHistoryMutation.isPending
                  }
                  className="h-8 text-xs font-bold px-3 cursor-pointer"
                >
                  {clearQueueMutation.isPending || clearHistoryMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Yes, Clear"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmClear(null)}
                  className="h-8 text-xs font-bold px-2.5 cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmClear(activeTab)}
                className="gap-2 text-xs font-mono font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive hover:text-destructive cursor-pointer h-8"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {activeTab === "queue" ? "Clear Queue" : "Clear History"}
                </span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {isLoading ? (
        <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs sm:text-sm font-mono text-muted-foreground">
            Loading library videos...
          </span>
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
          {items.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        /* Tailored Empty States */
        <Card className="max-w-xl mx-auto p-6 sm:p-10 text-center my-8 sm:my-12 flex flex-col items-center">
          {activeTab === "queue" ? (
            <>
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mb-4 shadow-xs select-none">
                <Clock className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-foreground m-0 mb-2">
                Your queue is empty
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md m-0 mb-6 font-mono">
                Add videos from your feed to line them up for focused, uninterrupted viewing.
              </p>
              <Button variant="default" size="default" asChild className="gap-2">
                <Link href="/">
                  <Tv className="w-4 h-4" />
                  <span>Browse Feed</span>
                </Link>
              </Button>
            </>
          ) : activeTab === "favorites" ? (
            <>
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-4 shadow-xs select-none">
                <Star className="w-6 h-6 fill-current stroke-[2.2]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-foreground m-0 mb-2">
                No favorite videos yet
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md m-0 mb-6 font-mono">
                Mark standout videos from your feed or watch page as favorites to keep them in your permanent collection.
              </p>
              <Button variant="default" size="default" asChild className="gap-2">
                <Link href="/">
                  <Tv className="w-4 h-4" />
                  <span>Browse Feed</span>
                </Link>
              </Button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-success/10 border border-success/30 flex items-center justify-center text-success mb-4 shadow-xs select-none">
                <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-foreground m-0 mb-2">
                {historyStatus === "in_progress"
                  ? "No videos in progress"
                  : historyStatus === "completed"
                    ? "No completed videos"
                    : "No watch history recorded"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md m-0 mb-6 font-mono">
                {historyStatus === "in_progress"
                  ? "Videos you start watching and leave unfinished will show up here with live progress so you can resume."
                  : historyStatus === "completed"
                    ? "Videos you finish or manually mark as watched will be archived here for easy reference."
                    : "Videos you play on Locus will automatically appear here so you can re-watch them anytime."}
              </p>
              <Button variant="default" size="default" asChild className="gap-2">
                <Link href="/">
                  <Tv className="w-4 h-4" />
                  <span>Browse Feed</span>
                </Link>
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center text-muted-foreground font-mono text-sm">
            Loading library...
          </div>
        }
      >
        <LibraryContent />
      </Suspense>
    </AppShell>
  );
}

