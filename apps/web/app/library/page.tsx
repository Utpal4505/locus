"use client";

import * as React from "react";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  FileText,
  Search,
  X,
  Download,
  ExternalLink,
  Copy,
  Check,
  BookOpen,
  Filter,
  Sparkles,
} from "lucide-react";
import type { LibraryTab, HistoryStatus, LibraryNoteItem, FeedItem } from "@locus/contracts";
import { calculateProgressPercentage } from "../../lib/video-playback";
import { authClient } from "../../lib/auth-client";
import {
  useLibraryQuery,
  useClearQueueMutation,
  useClearHistoryMutation,
  useLibraryNotesQuery,
} from "../../lib/queries";
import { formatDuration, formatRelativeTime } from "../../lib/formatters";
import { downloadSingleNote, downloadNotesAsZip } from "../../lib/export-notes";
import { AppShell } from "../../components/app-shell";
import { VideoCard } from "../../components/video-card";
import { NotesReadingDrawer } from "../../components/notes-reading-drawer";
import { MarkdownRenderer } from "../../components/markdown-renderer";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { cn } from "../../lib/utils";

// Parses timestamps like 04:20, [04:20], 01:23:45 into seconds
function parseTimestampToSeconds(text: string): number | null {
  const clean = text.replace(/[\[\]]/g, "").trim();
  const parts = clean.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) {
    return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  }
  if (parts.length === 3) {
    return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  }
  return null;
}

function ShelfVideoCard({ video }: { video: FeedItem }) {
  const durationText = formatDuration(video.durationSeconds);
  const relativeDate = formatRelativeTime(video.publishedAt);
  const isWatched = Boolean(video.library?.isWatched);
  const progressSeconds = video.library?.progressSeconds ?? 0;
  const progressPercent = !isWatched
    ? calculateProgressPercentage(progressSeconds, video.durationSeconds)
    : 0;

  return (
    <div className="w-44 sm:w-52 shrink-0 flex flex-col space-y-1.5 p-2 rounded-xl bg-surface-1 border border-border/80 hover:border-border-strong transition-all shadow-xs group">
      <Link
        href={`/watch/${video.id}`}
        className="relative w-full aspect-video bg-surface-2 rounded-lg overflow-hidden border border-border/50 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-muted-foreground">
            No Thumbnail
          </div>
        )}
        {durationText && (
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/85 text-white">
            {durationText}
          </span>
        )}
        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-primary"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </Link>
      <Link
        href={`/watch/${video.id}`}
        className="text-xs font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors"
        title={video.title}
      >
        {video.title}
      </Link>
      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <span className="truncate max-w-[100px]">{video.channelName}</span>
        <span>{relativeDate}</span>
      </div>
    </div>
  );
}

function ShelfNoteCard({
  note,
  onOpenReading,
}: {
  note: LibraryNoteItem;
  onOpenReading: (note: LibraryNoteItem) => void;
}) {
  const rawTimestamps =
    note.content.match(
      /(\[\d{1,2}:\d{2}(?::\d{2})?\]|\b\d{1,2}:\d{2}(?::\d{2})?\b)/g,
    ) || [];
  const uniqueTimestamps = Array.from(new Set(rawTimestamps)).slice(0, 3);

  return (
    <div
      onClick={() => onOpenReading(note)}
      className="w-56 sm:w-64 shrink-0 p-3 rounded-xl bg-surface-1 border border-border/80 hover:border-primary/50 transition-all shadow-xs cursor-pointer flex flex-col justify-between space-y-2 group"
    >
      <div>
        <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-muted-foreground mb-1">
          <span className="font-semibold text-foreground truncate max-w-[130px]">{note.channelName}</span>
          <span>{formatRelativeTime(note.updatedAt)}</span>
        </div>
        <h5
          className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors"
          title={note.videoTitle}
        >
          {note.videoTitle}
        </h5>
        <p className="text-[11px] text-muted-foreground font-sans line-clamp-2 mt-1 leading-snug">
          {note.content.replace(/[#*`_\[\]]/g, "").slice(0, 100)}
        </p>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px] font-mono">
        <div className="flex items-center gap-1">
          {uniqueTimestamps.map((ts, idx) => (
            <span key={idx} className="px-1 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 font-bold">
              {ts}
            </span>
          ))}
        </div>
        <span className="text-primary font-bold group-hover:underline">Read →</span>
      </div>
    </div>
  );
}

type ActiveLibraryTab = "overview" | LibraryTab;

function LibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const tabParam = searchParams.get("tab") as string | null;
  const statusParam = searchParams.get("status") as HistoryStatus | null;

  const initialTab: ActiveLibraryTab =
    tabParam === "favorites" || tabParam === "bookmarks"
      ? "favorites"
      : tabParam === "history"
        ? "history"
        : tabParam === "notes"
          ? "notes"
          : tabParam === "queue"
            ? "queue"
            : "overview";

  const initialStatus: HistoryStatus =
    statusParam === "in_progress" || statusParam === "completed"
      ? statusParam
      : "all";

  const [activeTab, setActiveTab] = useState<ActiveLibraryTab>(initialTab);
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>(initialStatus);

  // Notes Hub UI State
  const [notesSearch, setNotesSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCreatorId, setSelectedCreatorId] = useState("");
  const [selectedNoteForReading, setSelectedNoteForReading] = useState<LibraryNoteItem | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"updated" | "title" | "timestamps">("updated");

  // Debounce search query by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(notesSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [notesSearch]);

  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (
      currentTab === "queue" ||
      currentTab === "favorites" ||
      currentTab === "history" ||
      currentTab === "notes"
    ) {
      setActiveTab(currentTab as LibraryTab);
    } else if (currentTab === "bookmarks") {
      setActiveTab("favorites");
    } else if (currentTab === "overview" || !currentTab) {
      setActiveTab("overview");
    }

    const currentStatus = searchParams.get("status") as HistoryStatus | null;
    if (currentStatus === "in_progress" || currentStatus === "completed" || currentStatus === "all") {
      setHistoryStatus(currentStatus);
    }
  }, [searchParams]);

  const handleTabChange = (tab: ActiveLibraryTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tab === "overview") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab);
      }
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

  // Standard Library query for Queue, Favorites, History
  const isOverview = activeTab === "overview";
  const { data, isLoading } = useLibraryQuery(
    activeTab === "notes" || isOverview ? "queue" : (activeTab as LibraryTab),
    {
      enabled: Boolean(session) && activeTab !== "notes" && !isOverview,
      status: activeTab === "history" ? historyStatus : undefined,
    },
  );

  // Overview shelves queries
  const { data: queueShelfData, isLoading: queueShelfLoading } = useLibraryQuery(
    "queue",
    { enabled: Boolean(session) && isOverview },
  );
  const { data: historyShelfData, isLoading: historyShelfLoading } = useLibraryQuery(
    "history",
    { enabled: Boolean(session) && isOverview },
  );
  const { data: favoritesShelfData, isLoading: favoritesShelfLoading } = useLibraryQuery(
    "favorites",
    { enabled: Boolean(session) && isOverview },
  );
  const { data: notesShelfData, isLoading: notesShelfLoading } = useLibraryNotesQuery(
    { limit: 6 },
    { enabled: Boolean(session) && isOverview },
  );

  // Summary query to fetch total count of notes for the tab badge
  const { data: notesSummary } = useLibraryNotesQuery(
    { limit: 1 },
    { enabled: Boolean(session) && activeTab !== "notes" },
  );

  // Active notes query with search and creator filter when on notes tab
  const {
    data: notesData,
    isLoading: notesLoading,
  } = useLibraryNotesQuery(
    {
      search: debouncedSearch,
      channelId: selectedCreatorId || undefined,
      limit: 50,
    },
    { enabled: Boolean(session) && activeTab === "notes" },
  );

  const totalNotesCount =
    (activeTab === "notes" ? notesData?.total : notesSummary?.total) ??
    notesData?.total ??
    notesSummary?.total ??
    0;

  // Memoized client-side sort for notes
  const sortedNotes = React.useMemo(() => {
    if (!notesData?.items) return [];
    const list = [...notesData.items];
    if (sortBy === "title") {
      return list.sort((a, b) => a.videoTitle.localeCompare(b.videoTitle));
    }
    if (sortBy === "timestamps") {
      const countTs = (str: string) =>
        (str.match(/(\[\d{1,2}:\d{2}(?::\d{2})?\]|\b\d{1,2}:\d{2}(?::\d{2})?\b)/g) || []).length;
      return list.sort((a, b) => countTs(b.content) - countTs(a.content));
    }
    return list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [notesData?.items, sortBy]);

  // Auto-open reading drawer when navigated with ?noteId=... (e.g. from Command Palette)
  useEffect(() => {
    const noteId = searchParams.get("noteId");
    if (noteId && notesData?.items) {
      const match = notesData.items.find((n) => n.id === noteId);
      if (match && selectedNoteForReading?.id !== match.id) {
        setSelectedNoteForReading(match);
      }
    }
  }, [searchParams, notesData?.items, selectedNoteForReading]);

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

  const handleCopyNote = async (note: LibraryNoteItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(note.content);
      setCopiedNoteId(note.id);
      setTimeout(() => setCopiedNoteId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleExportAllZip = () => {
    if (notesData?.items && notesData.items.length > 0) {
      downloadNotesAsZip(notesData.items);
    }
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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-8">
      {/* Page Header (Hidden on mobile for maximum content visibility) */}
      <div className="hidden md:block mb-6 pb-5 border-b border-border">
        <h1 className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-foreground m-0 mb-1">
          Personal Library
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground font-mono m-0">
          Manage your watch queue, favorite videos, and watch history.
        </p>
      </div>

      {/* Control Toolbar: Master Segmented Tabs + Contextual Sub-Filters + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 mb-6">
        <div className="flex flex-wrap items-center gap-2.5 max-w-full">
          {/* Segmented Navigation Tab Bar */}
          <div
            role="tablist"
            aria-label="Library tabs"
            className="inline-flex items-center p-1 rounded-xl bg-surface-2/70 border border-border/80 gap-1 max-w-full overflow-x-auto no-scrollbar touch-pan-x"
          >
            {/* Overview Tab (YouTube-Style Glanceable Shelves) */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "overview"}
              onClick={() => handleTabChange("overview")}
              className={cn(
                "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none shrink-0",
                activeTab === "overview"
                  ? "bg-surface-1 text-primary shadow-sm border border-border/80 font-black"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Overview</span>
            </button>

            {/* Queue Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "queue"}
              onClick={() => handleTabChange("queue")}
              className={cn(
                "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none shrink-0",
                activeTab === "queue"
                  ? "bg-surface-1 text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
              )}
            >
              <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="hidden sm:inline">Watch Later</span>
              <span className="sm:hidden">Later</span>
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
                "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none shrink-0",
                activeTab === "favorites"
                  ? "bg-surface-1 text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
              )}
            >
              <Star className="w-3.5 h-3.5 text-rose-500 fill-current shrink-0" />
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
                "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none shrink-0",
                activeTab === "history"
                  ? "bg-surface-1 text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              <span>History</span>
              {activeTab === "history" && !isLoading && items.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-mono rounded-full font-bold bg-surface-3 text-foreground">
                  {items.length}
                </span>
              )}
            </button>

            {/* Study Notes Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "notes"}
              onClick={() => handleTabChange("notes")}
              className={cn(
                "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none shrink-0",
                activeTab === "notes"
                  ? "bg-surface-1 text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
              )}
            >
              <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden sm:inline">Study Notes</span>
              <span className="sm:hidden">Notes</span>
              {totalNotesCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-mono rounded-full font-bold bg-surface-3 text-foreground">
                  {totalNotesCount}
                </span>
              )}
            </button>
          </div>

          {/* History Sub-Filter Segmented Capsule */}
          {activeTab === "history" && (
            <div
              role="tablist"
              aria-label="History filter"
              className="inline-flex items-center p-1 rounded-xl bg-surface-2/50 border border-border/60 gap-1 animate-in fade-in max-w-full overflow-x-auto no-scrollbar touch-pan-x"
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

      {/* Search, Sort, Export & Creator Filter Hub */}
      {activeTab === "notes" && (
        <div className="flex flex-col gap-3 mb-6">
          {/* Main Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-surface-1 border border-border/80 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={notesSearch}
                onChange={(e) => setNotesSearch(e.target.value)}
                placeholder="Search notes, code, video..."
                className="w-full bg-surface-2/60 border border-border/70 text-foreground placeholder:text-muted-foreground/60 text-xs font-mono rounded-xl pl-9 pr-9 py-2 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all h-9 sm:h-auto"
              />
              {notesSearch && (
                <button
                  type="button"
                  onClick={() => setNotesSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-md"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Controls: Sort Dropdown + Export ZIP Button */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "updated" | "title" | "timestamps")
                }
                className="flex-1 sm:flex-initial h-9 sm:h-8 bg-surface-2/70 border border-border/80 text-foreground text-xs font-mono rounded-lg px-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all cursor-pointer select-none"
                aria-label="Sort notes"
              >
                <option value="updated">Recently Updated</option>
                <option value="title">Title (A-Z)</option>
                <option value="timestamps">Most Timestamps</option>
              </select>

              {/* Bulk Export ZIP */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAllZip}
                disabled={!notesData?.items || notesData.items.length === 0}
                className="flex-1 sm:flex-initial h-9 sm:h-8 text-xs font-mono font-semibold gap-1.5 border-border/80 hover:bg-surface-2 cursor-pointer px-3"
                title="Download all matching notes as a ZIP archive"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                <span>Export<span className="hidden xs:inline"> (.zip)</span></span>
              </Button>
            </div>
          </div>

          {/* Interactive Creator Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar touch-pan-x -mx-1 px-1">
            <button
              type="button"
              onClick={() => setSelectedCreatorId("")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap cursor-pointer select-none flex items-center gap-1.5 shrink-0",
                !selectedCreatorId
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-surface-2/70 text-muted-foreground hover:text-foreground hover:bg-surface-3/80 border border-border/60",
              )}
            >
              <span>All Creators</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                  !selectedCreatorId
                    ? "bg-primary-foreground/20 text-primary-foreground font-bold"
                    : "bg-surface-3 text-muted-foreground",
                )}
              >
                {notesData?.total ?? totalNotesCount}
              </span>
            </button>

            {notesData?.creators?.map((creator) => {
              const isSelected = selectedCreatorId === creator.id;
              return (
                <button
                  key={creator.id}
                  type="button"
                  onClick={() => setSelectedCreatorId(isSelected ? "" : creator.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap cursor-pointer select-none flex items-center gap-1.5 shrink-0",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "bg-surface-2/70 text-muted-foreground hover:text-foreground hover:bg-surface-3/80 border border-border/60",
                  )}
                >
                  <span>{creator.name}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground font-bold"
                        : "bg-surface-3 text-muted-foreground",
                    )}
                  >
                    {creator.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === "overview" ? (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in">
          {/* SHELF 1: WATCH LATER / QUEUE */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-wider">
                  Watch Later
                </h2>
                {queueShelfData?.items && queueShelfData.items.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                    {queueShelfData.items.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleTabChange("queue")}
                className="text-xs text-primary font-mono font-bold hover:underline cursor-pointer"
              >
                View all →
              </button>
            </div>

            {queueShelfLoading ? (
              <div className="flex items-center gap-3 overflow-hidden py-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-44 sm:w-52 aspect-video bg-surface-2 rounded-xl animate-pulse shrink-0"
                  />
                ))}
              </div>
            ) : queueShelfData?.items && queueShelfData.items.length > 0 ? (
              <div className="flex items-start gap-3 overflow-x-auto no-scrollbar py-1 -mx-3 px-3 sm:mx-0 sm:px-0">
                {queueShelfData.items.map((video) => (
                  <ShelfVideoCard key={video.id} video={video} />
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-border/80 bg-surface-1/50 text-xs text-muted-foreground font-mono flex items-center justify-between">
                <span>Your watch queue is empty. Add videos from feed to watch next.</span>
                <Link
                  href="/"
                  className="text-primary font-bold hover:underline shrink-0 ml-2"
                >
                  Browse Feed →
                </Link>
              </div>
            )}
          </section>

          {/* SHELF 2: RECENTLY WATCHED / HISTORY */}
          <section className="space-y-3 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <h2 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-wider">
                  Recently Watched
                </h2>
                {historyShelfData?.items && historyShelfData.items.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-success/10 text-success border border-success/20">
                    {historyShelfData.items.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleTabChange("history")}
                className="text-xs text-primary font-mono font-bold hover:underline cursor-pointer"
              >
                View all →
              </button>
            </div>

            {historyShelfLoading ? (
              <div className="flex items-center gap-3 overflow-hidden py-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-44 sm:w-52 aspect-video bg-surface-2 rounded-xl animate-pulse shrink-0"
                  />
                ))}
              </div>
            ) : historyShelfData?.items && historyShelfData.items.length > 0 ? (
              <div className="flex items-start gap-3 overflow-x-auto no-scrollbar py-1 -mx-3 px-3 sm:mx-0 sm:px-0">
                {historyShelfData.items.map((video) => (
                  <ShelfVideoCard key={video.id} video={video} />
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-border/80 bg-surface-1/50 text-xs text-muted-foreground font-mono">
                No watch history yet. Videos you play will show up here with live progress bars.
              </div>
            )}
          </section>

          {/* SHELF 3: FAVORITES */}
          <section className="space-y-3 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-rose-500 fill-current" />
                <h2 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-wider">
                  Favorites
                </h2>
                {favoritesShelfData?.items && favoritesShelfData.items.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    {favoritesShelfData.items.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleTabChange("favorites")}
                className="text-xs text-primary font-mono font-bold hover:underline cursor-pointer"
              >
                View all →
              </button>
            </div>

            {favoritesShelfLoading ? (
              <div className="flex items-center gap-3 overflow-hidden py-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-44 sm:w-52 aspect-video bg-surface-2 rounded-xl animate-pulse shrink-0"
                  />
                ))}
              </div>
            ) : favoritesShelfData?.items && favoritesShelfData.items.length > 0 ? (
              <div className="flex items-start gap-3 overflow-x-auto no-scrollbar py-1 -mx-3 px-3 sm:mx-0 sm:px-0">
                {favoritesShelfData.items.map((video) => (
                  <ShelfVideoCard key={video.id} video={video} />
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-border/80 bg-surface-1/50 text-xs text-muted-foreground font-mono">
                No favorites yet. Star standout videos to curate your personal collection.
              </div>
            )}
          </section>

          {/* SHELF 4: STUDY NOTES & KEYFRAMES */}
          <section className="space-y-3 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-wider">
                  Study Notes & Keyframes
                </h2>
                {notesShelfData?.total ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    {notesShelfData.total}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => handleTabChange("notes")}
                className="text-xs text-primary font-mono font-bold hover:underline cursor-pointer"
              >
                Notes Hub →
              </button>
            </div>

            {notesShelfLoading ? (
              <div className="flex items-center gap-3 overflow-hidden py-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-56 sm:w-64 h-32 bg-surface-2 rounded-xl animate-pulse shrink-0"
                  />
                ))}
              </div>
            ) : notesShelfData?.items && notesShelfData.items.length > 0 ? (
              <div className="flex items-start gap-3 overflow-x-auto no-scrollbar py-1 -mx-3 px-3 sm:mx-0 sm:px-0">
                {notesShelfData.items.map((note) => (
                  <ShelfNoteCard
                    key={note.id}
                    note={note}
                    onOpenReading={(n) => setSelectedNoteForReading(n)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-border/80 bg-surface-1/50 text-xs text-muted-foreground font-mono">
                No study notes taken yet. Use the Notes Studio while watching videos to capture timestamped takeaways.
              </div>
            )}
          </section>
        </div>
      ) : activeTab === "notes" ? (
        notesLoading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs sm:text-sm font-mono text-muted-foreground">
              Searching and loading study notes...
            </span>
          </div>
        ) : sortedNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {sortedNotes.map((note) => {
              const rawTimestamps =
                note.content.match(
                  /(\[\d{1,2}:\d{2}(?::\d{2})?\]|\b\d{1,2}:\d{2}(?::\d{2})?\b)/g,
                ) || [];
              const uniqueTimestamps = Array.from(new Set(rawTimestamps));
              const wordCount = note.content.trim().split(/\s+/).filter(Boolean).length;

              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteForReading(note)}
                  className="group relative flex flex-col justify-between rounded-2xl bg-surface-1 border border-border/80 hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer p-3.5 sm:p-5 active:scale-[0.99]"
                >
                  {/* Top Source Reference Bar */}
                  <div className="flex items-center justify-between gap-2.5 sm:gap-3 pb-2.5 sm:pb-3 mb-3 border-b border-border/60">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      {/* Mini Video Thumbnail */}
                      <div className="relative w-11 sm:w-12 aspect-video rounded-md overflow-hidden bg-surface-3 shrink-0 border border-border/60">
                        {note.thumbnailUrl ? (
                          <img
                            src={note.thumbnailUrl}
                            alt={note.videoTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Tv className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {note.durationSeconds != null && note.durationSeconds > 0 && (
                          <span className="absolute bottom-0.5 right-0.5 px-0.5 py-0.2 rounded bg-black/85 text-[8px] font-mono font-bold text-white leading-none">
                            {formatDuration(note.durationSeconds)}
                          </span>
                        )}
                      </div>

                      {/* Video Title & Channel Info */}
                      <div className="min-w-0 flex-1">
                        <h4
                          className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors m-0 leading-tight"
                          title={note.videoTitle}
                        >
                          {note.videoTitle}
                        </h4>
                        <div className="text-[10px] font-mono text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                          <span className="font-semibold text-foreground/80 truncate max-w-[120px] sm:max-w-none">{note.channelName}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(note.updatedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Studio Shortcut */}
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 w-8 sm:h-7 sm:w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-surface-2 shrink-0 cursor-pointer rounded-lg"
                      title="Open in Watch Studio"
                    >
                      <Link href={`/watch/${note.videoId}?tab=notes`}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </div>

                  {/* Note Body (The Hero - Clean Markdown) */}
                  <div className="flex-1 my-0.5 sm:my-1">
                    <div className="text-xs text-foreground/90 leading-relaxed font-sans line-clamp-3 sm:line-clamp-4 select-text">
                      <MarkdownRenderer
                        content={note.content}
                        onSeek={(seconds) => {
                          router.push(`/watch/${note.videoId}?t=${seconds}&tab=notes`);
                        }}
                      />
                    </div>

                    {/* Dedicated Keyframe Timeline Strip */}
                    {uniqueTimestamps.length > 0 && (
                      <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-border/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1 mr-0.5">
                          <Clock className="w-2.5 h-2.5 text-primary" /> Keyframes:
                        </span>
                        {uniqueTimestamps.slice(0, 4).map((ts, idx) => {
                          const seconds = parseTimestampToSeconds(ts);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (seconds !== null) {
                                  router.push(`/watch/${note.videoId}?t=${seconds}&tab=notes`);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/25 hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all font-mono font-bold text-[10px] cursor-pointer shrink-0"
                              title={`Seek player to ${ts}`}
                            >
                              <span>{ts}</span>
                            </button>
                          );
                        })}
                        {uniqueTimestamps.length > 4 && (
                          <span className="text-[10px] font-mono text-muted-foreground font-semibold shrink-0">
                            +{uniqueTimestamps.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sleek Footer: Stats & Actions */}
                  <div className="flex items-center justify-between pt-2.5 sm:pt-3 mt-2.5 sm:mt-3 border-t border-border/50 text-[11px] font-mono text-muted-foreground gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                      <span>{wordCount} words</span>
                      {uniqueTimestamps.length > 0 && <span>•</span>}
                      {uniqueTimestamps.length > 0 && (
                        <span className="text-primary font-semibold">
                          {uniqueTimestamps.length} {uniqueTimestamps.length === 1 ? "stamp" : "stamps"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleCopyNote(note, e)}
                        className="h-8 w-8 sm:h-7 sm:w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
                        title="Copy note markdown"
                        aria-label="Copy note"
                      >
                        {copiedNoteId === note.id ? (
                          <Check className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadSingleNote(note);
                        }}
                        className="h-8 w-8 sm:h-7 sm:w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
                        title="Download as Markdown"
                        aria-label="Download note"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>

                      <span className="text-[11px] font-mono font-semibold text-primary group-hover:underline ml-0.5 sm:ml-1">
                        Read →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State for Notes */
          <Card className="max-w-xl mx-auto p-6 sm:p-10 text-center my-8 sm:my-12 flex flex-col items-center">
            {debouncedSearch || selectedCreatorId ? (
              <>
                <div className="w-12 h-12 rounded-xl bg-muted/20 border border-border flex items-center justify-center text-muted-foreground mb-4 shadow-xs select-none">
                  <Search className="w-6 h-6 stroke-[2.2]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-foreground m-0 mb-2">
                  No matching study notes
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md m-0 mb-6 font-mono">
                  No notes match your current search or creator filter. Try clearing your search query or selecting all creators.
                </p>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => {
                    setNotesSearch("");
                    setSelectedCreatorId("");
                  }}
                  className="gap-2 font-mono text-xs cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Reset Search & Filter</span>
                </Button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-4 shadow-xs select-none">
                  <FileText className="w-6 h-6 stroke-[2.2]" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-foreground m-0 mb-2">
                  No study notes yet
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md m-0 mb-6 font-mono">
                  Take timestamped notes while watching any video on Locus. Your personal knowledge base will automatically gather here for reading, searching, and Markdown export.
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
        )
      ) : isLoading ? (
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

      {/* Slide-Over Note Reading Drawer */}
      <NotesReadingDrawer
        note={selectedNoteForReading}
        isOpen={Boolean(selectedNoteForReading)}
        onClose={() => setSelectedNoteForReading(null)}
      />
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

