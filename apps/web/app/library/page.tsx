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
} from "lucide-react";
import type { LibraryTab } from "@locus/contracts";
import { authClient } from "../../lib/auth-client";
import {
  useLibraryQuery,
  useClearQueueMutation,
  useClearHistoryMutation,
} from "../../lib/queries";
import { AppShell } from "../../components/app-shell";
import { VideoCard } from "../../components/video-card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { cn } from "../../lib/utils";

function LibraryContent() {
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const tabParam = searchParams.get("tab") as string | null;
  const initialTab: LibraryTab =
    tabParam === "favorites" || tabParam === "bookmarks"
      ? "favorites"
      : tabParam === "history"
        ? "history"
        : "queue";

  const [activeTab, setActiveTab] = useState<LibraryTab>(initialTab);

  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab === "queue" || currentTab === "favorites" || currentTab === "history") {
      setActiveTab(currentTab as LibraryTab);
    } else if (currentTab === "bookmarks") {
      setActiveTab("favorites");
    }
  }, [searchParams]);

  const handleTabChange = (tab: LibraryTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const { data, isLoading, isRefetching } = useLibraryQuery(activeTab, {
    enabled: Boolean(session),
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
          <div className="w-12 h-12 rounded-md bg-accent/15 border-2 border-accent text-accent flex items-center justify-center mb-4 shadow-brutal-sm">
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8 pb-5 border-b-2 border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-foreground m-0 mb-1">
            Personal Library
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono m-0">
            Manage your watch queue, favorite videos, and watch history.
          </p>
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
                className="gap-2 text-xs font-mono font-semibold text-destructive border-destructive/40 hover:bg-destructive/10 hover:border-destructive hover:text-destructive cursor-pointer"
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

      {/* Segmented Navigation Tab Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-surface-2 border-2 border-border-strong rounded-md shadow-brutal-sm mb-6 sm:mb-8 w-full sm:w-fit">
        {/* Queue Tab */}
        <button
          type="button"
          onClick={() => handleTabChange("queue")}
          className={cn(
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-sm transition-all cursor-pointer select-none",
            activeTab === "queue"
              ? "bg-primary text-primary-foreground shadow-brutal-sm border-2 border-border-strong -translate-x-0.5 -translate-y-0.5"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-3",
          )}
        >
          <Clock className="w-4 h-4" />
          <span>Watch Later</span>
          {activeTab === "queue" && !isLoading && items.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-full font-bold bg-primary-foreground text-primary">
              {items.length}
            </span>
          )}
        </button>

        {/* Favorites Tab */}
        <button
          type="button"
          onClick={() => handleTabChange("favorites")}
          className={cn(
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-sm transition-all cursor-pointer select-none",
            activeTab === "favorites"
              ? "bg-accent text-accent-foreground shadow-brutal-sm border-2 border-border-strong -translate-x-0.5 -translate-y-0.5"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-3",
          )}
        >
          <Star className="w-4 h-4 fill-current stroke-[2.2]" />
          <span>Favorites</span>
          {activeTab === "favorites" && !isLoading && items.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-full font-bold bg-accent-foreground text-accent">
              {items.length}
            </span>
          )}
        </button>

        {/* History Tab */}
        <button
          type="button"
          onClick={() => handleTabChange("history")}
          className={cn(
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-sm transition-all cursor-pointer select-none",
            activeTab === "history"
              ? "bg-success text-success-foreground shadow-brutal-sm border-2 border-border-strong -translate-x-0.5 -translate-y-0.5"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-3",
          )}
        >
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          <span>History</span>
          {activeTab === "history" && !isLoading && items.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-full font-bold bg-success-foreground text-success">
              {items.length}
            </span>
          )}
        </button>
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
        /* Tailored Neo-Brutalist Empty States */
        <Card className="max-w-xl mx-auto p-6 sm:p-10 text-center my-8 sm:my-12 flex flex-col items-center">
          {activeTab === "queue" ? (
            <>
              <div className="w-14 h-14 rounded-md bg-primary/15 border-2 border-primary flex items-center justify-center text-primary mb-5 shadow-brutal-sm select-none">
                <Clock className="w-7 h-7 stroke-[2.2]" />
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
              <div className="w-14 h-14 rounded-md bg-accent/15 border-2 border-accent flex items-center justify-center text-accent mb-5 shadow-brutal-sm select-none">
                <Star className="w-7 h-7 fill-current stroke-[2.2]" />
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
              <div className="w-14 h-14 rounded-md bg-success/15 border-2 border-success flex items-center justify-center text-success mb-5 shadow-brutal-sm select-none">
                <CheckCircle2 className="w-7 h-7 stroke-[2.2]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-foreground m-0 mb-2">
                No watch history recorded
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md m-0 mb-6 font-mono">
                Videos you watch or mark as completed will automatically appear here so you can re-watch them anytime.
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

