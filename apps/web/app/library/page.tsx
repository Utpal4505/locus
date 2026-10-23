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
} from "lucide-react";
import type { LibraryTab, HistoryStatus, LibraryNoteItem } from "@locus/contracts";
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

function LibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const tabParam = searchParams.get("tab") as string | null;
  const statusParam = searchParams.get("status") as HistoryStatus | null;

  const initialTab: LibraryTab =
    tabParam === "favorites" || tabParam === "bookmarks"
      ? "favorites"
      : tabParam === "history"
        ? "history"
        : tabParam === "notes"
          ? "notes"
          : "queue";

  const initialStatus: HistoryStatus =
    statusParam === "in_progress" || statusParam === "completed"
      ? statusParam
      : "all";

  const [activeTab, setActiveTab] = useState<LibraryTab>(initialTab);
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

  // Standard Library query for Queue, Favorites, History
  const { data, isLoading } = useLibraryQuery(
    activeTab === "notes" ? "queue" : activeTab,
    {
      enabled: Boolean(session) && activeTab !== "notes",
      status: activeTab === "history" ? historyStatus : undefined,
    },
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

            {/* Study Notes Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "notes"}
              onClick={() => handleTabChange("notes")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none",
                activeTab === "notes"
                  ? "bg-surface-1 text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
              )}
            >
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              <span>Study Notes</span>
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
        <div className="flex flex-col gap-3.5 mb-6">
          {/* Main Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-surface-1 border border-border/80 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={notesSearch}
                onChange={(e) => setNotesSearch(e.target.value)}
                placeholder="Search notes by markdown, code, or video title..."
                className="w-full bg-surface-2/60 border border-border/70 text-foreground placeholder:text-muted-foreground/60 text-xs font-mono rounded-xl pl-9 pr-9 py-2 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
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
                className="h-8 bg-surface-2/70 border border-border/80 text-foreground text-xs font-mono rounded-lg px-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all cursor-pointer select-none"
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
                className="h-8 text-xs font-mono font-semibold gap-1.5 border-border/80 hover:bg-surface-2 cursor-pointer"
                title="Download all matching notes as a ZIP archive"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                <span>Export (.zip)</span>
              </Button>
            </div>
          </div>

          {/* Interactive Creator Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
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
      {activeTab === "notes" ? (
        notesLoading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs sm:text-sm font-mono text-muted-foreground">
              Searching and loading study notes...
            </span>
          </div>
        ) : sortedNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedNotes.map((note) => {
              const timestampsCount = (
                note.content.match(/(\[\d{1,2}:\d{2}(?::\d{2})?\]|\b\d{1,2}:\d{2}(?::\d{2})?\b)/g) || []
              ).length;

              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteForReading(note)}
                  className="group relative flex flex-col rounded-2xl bg-surface-1 border border-border/75 hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
                >
                  {/* 16:9 Thumbnail Header with Overlaid Badges */}
                  <div className="relative aspect-video w-full overflow-hidden bg-surface-3">
                    {note.thumbnailUrl ? (
                      <img
                        src={note.thumbnailUrl}
                        alt={note.videoTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Tv className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />

                    {/* Overlaid Top-Left Channel Badge */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-mono select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="truncate max-w-[150px] font-medium">{note.channelName}</span>
                    </div>

                    {/* Overlaid Bottom-Right Duration */}
                    {note.durationSeconds != null && note.durationSeconds > 0 && (
                      <span className="absolute bottom-2.5 right-2.5 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-xs font-mono text-[10px] font-bold text-white border border-white/10 select-none">
                        {formatDuration(note.durationSeconds)}
                      </span>
                    )}

                    {/* Hover Reveal Reading Cue */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      <span className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-sans text-xs font-bold shadow-lg flex items-center gap-1.5 transform scale-95 group-hover:scale-100 transition-transform">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Read Note</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
                    <div>
                      {/* Video Title */}
                      <h3
                        className="font-bold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors m-0 mb-2.5"
                        title={note.videoTitle}
                      >
                        {note.videoTitle}
                      </h3>

                      {/* Seamless Note Markdown Preview */}
                      <div className="text-xs text-foreground/80 leading-relaxed line-clamp-3 font-sans select-text">
                        <MarkdownRenderer
                          content={note.content}
                          onSeek={(seconds) => {
                            router.push(`/watch/${note.videoId}?t=${seconds}&tab=notes`);
                          }}
                        />
                      </div>
                    </div>

                    {/* Card Footer: Metadata & Quick Actions */}
                    <div className="flex items-center justify-between pt-3 mt-3.5 border-t border-border/50 text-[11px] font-mono text-muted-foreground gap-2">
                      {/* Metadata chips */}
                      <div className="flex items-center gap-2 truncate">
                        {timestampsCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-primary font-semibold">
                            <Clock className="w-3 h-3" />
                            <span>
                              {timestampsCount} {timestampsCount === 1 ? "stamp" : "stamps"}
                            </span>
                          </span>
                        )}
                        {timestampsCount > 0 && <span>•</span>}
                        <span className="truncate">{formatRelativeTime(note.updatedAt)}</span>
                      </div>

                      {/* Fast Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleCopyNote(note, e)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Copy markdown content"
                          aria-label="Copy note markdown"
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
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Download note as Markdown"
                          aria-label="Download note"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          onClick={(e) => e.stopPropagation()}
                          className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-surface-3 cursor-pointer text-[11px] font-mono gap-1"
                          title="Open video in Watch Studio"
                        >
                          <Link href={`/watch/${note.videoId}?tab=notes`}>
                            <ExternalLink className="w-3 h-3" />
                            <span className="hidden sm:inline">Studio</span>
                          </Link>
                        </Button>
                      </div>
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

