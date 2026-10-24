"use client";

import * as React from "react";
import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Tv,
  Clock,
  Star,
  History,
  BookOpen,
  Settings,
  Zap,
  SunMoon,
  Loader2,
  Play,
  FileText,
  SlidersHorizontal,
  ArrowRight,
  ExternalLink,
  Filter,
  Bug,
  Sparkles,
} from "lucide-react";
import { useCommandPaletteStore } from "../../lib/stores/command-palette.store";
import { useFeedbackStore } from "../../lib/stores/feedback.store";
import { useGlobalSearchQuery } from "../../lib/queries/search";
import {
  useSyncVideosMutation,
  useUpdateVideoLibraryStateMutation,
} from "../../lib/queries";
import { formatDuration, formatRelativeTime } from "../../lib/formatters";
import { cn } from "../../lib/utils";
import {
  CommandPaletteInspector,
  type InspectorItem,
} from "./command-palette-inspector";

type CategoryFilter = "all" | "Videos" | "Notes" | "Creators" | "Actions" | "Navigation";

interface CommandItem extends InspectorItem {}

export function CommandPalette() {
  const router = useRouter();
  const { isOpen, query, setQuery, close, toggle } = useCommandPaletteStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const syncMutation = useSyncVideosMutation();
  const updateLibraryMutation = useUpdateVideoLibraryStateMutation();

  const { data: searchResults, isLoading: isSearching } = useGlobalSearchQuery(
    query,
    { enabled: isOpen },
  );

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggle();
      }
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        close();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, toggle, close]);

  // Focus input on open & lock background scroll
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setActiveFilter("all");
      setActionFeedback(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset selected index when query or active filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeFilter]);

  const handleToggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const nextTheme = isDark ? "light" : "dark";

    if (nextTheme === "dark") {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }

    try {
      localStorage.setItem("locus-theme", nextTheme);
    } catch {}

    setActionFeedback(`Switched theme to ${nextTheme} mode.`);
    setTimeout(() => {
      close();
    }, 600);
  };

  const handleTriggerSync = async () => {
    setActionFeedback("Syncing videos...");
    try {
      const res = await syncMutation.mutateAsync({
        trigger: "manual",
        force: true,
      });
      setActionFeedback(
        `Sync completed: ${res.videosSynced} video${
          res.videosSynced === 1 ? "" : "s"
        } synced across ${res.channelsProcessed} channels!`,
      );
      setTimeout(() => {
        close();
      }, 1000);
    } catch {
      setActionFeedback("Failed to sync videos. Check your connection.");
    }
  };

  const handleToggleQueue = async (videoId: string) => {
    try {
      await updateLibraryMutation.mutateAsync({
        videoId,
        updates: { isInQueue: true },
      });
      setActionFeedback("Added video to Queue!");
      setTimeout(() => {
        setActionFeedback(null);
      }, 2000);
    } catch {
      setActionFeedback("Could not update queue.");
    }
  };

  // Compile full list of items to display
  const allItems: CommandItem[] = useMemo(() => {
    const q = query.toLowerCase().trim();
    const resultItems: CommandItem[] = [];

    // Static Navigation Commands
    const navItems: CommandItem[] = [
      {
        id: "nav-feed",
        category: "Navigation",
        title: "Chronological Feed",
        subtitle: "View recent video uploads from followed creators",
        icon: Tv,
        onSelect: () => {
          router.push("/");
          close();
        },
      },
      {
        id: "nav-queue",
        category: "Navigation",
        title: "Watch Later (Queue)",
        subtitle: "Jump to queued videos in your Library",
        icon: Clock,
        onSelect: () => {
          router.push("/library?tab=queue");
          close();
        },
      },
      {
        id: "nav-favorites",
        category: "Navigation",
        title: "Favorite Videos",
        subtitle: "Jump to your bookmarked videos",
        icon: Star,
        onSelect: () => {
          router.push("/library?tab=favorites");
          close();
        },
      },
      {
        id: "nav-history",
        category: "Navigation",
        title: "Watch History",
        subtitle: "Review recently played videos & progress",
        icon: History,
        onSelect: () => {
          router.push("/library?tab=history");
          close();
        },
      },
      {
        id: "nav-notes",
        category: "Navigation",
        title: "Notes Hub (Second Brain)",
        subtitle: "Search and study all your private video notes",
        icon: BookOpen,
        onSelect: () => {
          router.push("/library?tab=notes");
          close();
        },
      },
      {
        id: "nav-channels",
        category: "Navigation",
        title: "Channels & Creators",
        subtitle: "Manage YouTube imports and followed creators",
        icon: SlidersHorizontal,
        onSelect: () => {
          router.push("/settings?tab=channels");
          close();
        },
      },
      {
        id: "nav-prefs",
        category: "Navigation",
        title: "Preferences & Account",
        subtitle: "Manage theme, feed controls, and profile",
        icon: Settings,
        onSelect: () => {
          router.push("/settings?tab=preferences");
          close();
        },
      },
    ];

    // Static Action Commands
    const actionItems: CommandItem[] = [
      {
        id: "act-sync",
        category: "Actions",
        title: "Sync Videos Now",
        subtitle: "Trigger manual background video refresh",
        icon: Zap,
        onSelect: handleTriggerSync,
      },
      {
        id: "act-theme",
        category: "Actions",
        title: "Toggle Light / Dark Theme",
        subtitle: "Switch appearance between light and dark mode",
        icon: SunMoon,
        onSelect: handleToggleTheme,
      },
      {
        id: "act-report-bug",
        category: "Actions",
        title: "Report a Bug",
        subtitle: "Submit an issue with automatic diagnostic logs",
        icon: Bug,
        onSelect: () => {
          close();
          useFeedbackStore.getState().open("bug");
        },
      },
      {
        id: "act-request-feature",
        category: "Actions",
        title: "Request a Feature",
        subtitle: "Suggest an improvement or new idea for Locus",
        icon: Sparkles,
        onSelect: () => {
          close();
          useFeedbackStore.getState().open("feature_request");
        },
      },
    ];

    // If query is present, add matching search results
    if (q) {
      // 1. Matched Videos
      if (searchResults?.videos?.length) {
        for (const v of searchResults.videos) {
          resultItems.push({
            id: `video-${v.id}`,
            videoId: v.id,
            youtubeVideoId: v.youtubeVideoId,
            category: "Videos",
            title: v.title,
            subtitle: v.channelName,
            channelName: v.channelName,
            thumbnailUrl: v.thumbnailUrl,
            durationSeconds: v.durationSeconds,
            publishedAt: v.publishedAt,
            icon: Play,
            onSelect: () => {
              router.push(`/watch/${v.id}`);
              close();
            },
          });
        }
      }

      // 2. Matched Notes
      if (searchResults?.notes?.length) {
        for (const n of searchResults.notes) {
          resultItems.push({
            id: `note-${n.id}`,
            videoId: n.videoId,
            category: "Notes",
            title: n.videoTitle,
            subtitle: n.snippet,
            noteSnippet: n.snippet,
            badge: n.channelName,
            channelName: n.channelName,
            icon: FileText,
            onSelect: () => {
              router.push(`/library?tab=notes&noteId=${n.id}`);
              close();
            },
          });
        }
      }

      // 3. Matched Channels
      if (searchResults?.channels?.length) {
        for (const c of searchResults.channels) {
          resultItems.push({
            id: `channel-${c.id}`,
            category: "Creators",
            title: c.name,
            subtitle: c.isFollowed ? "Followed creator" : "Imported creator",
            badge: c.isFollowed ? "Following" : undefined,
            thumbnailUrl: c.thumbnailUrl,
            icon: Tv,
            onSelect: () => {
              router.push(`/settings?search=${encodeURIComponent(c.name)}`);
              close();
            },
          });
        }
      }

      // Filter static navigation & actions by query text
      const filteredNav = navItems.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(q)),
      );
      const filteredActions = actionItems.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(q)),
      );

      resultItems.push(...filteredActions);
      resultItems.push(...filteredNav);
    } else {
      // Default empty query view: show actions and navigation
      resultItems.push(...actionItems);
      resultItems.push(...navItems);
    }

    return resultItems;
  }, [query, searchResults, router, close]);

  // Compute counts per category for filter tabs
  const categoryCounts = useMemo<Record<"all" | "Videos" | "Notes" | "Creators" | "Actions" | "Navigation", number>>(() => {
    const counts = {
      all: allItems.length,
      Videos: 0,
      Notes: 0,
      Creators: 0,
      Actions: 0,
      Navigation: 0,
    };
    for (const item of allItems) {
      if (item.category in counts) {
        counts[item.category as keyof typeof counts] += 1;
      }
    }
    return counts;
  }, [allItems]);

  // Filter items by active tab
  const items = useMemo(() => {
    if (activeFilter === "all") return allItems;
    return allItems.filter((i) => i.category === activeFilter);
  }, [allItems, activeFilter]);

  // Keep selected index within bounds
  const clampedIndex = Math.max(
    0,
    Math.min(selectedIndex, items.length > 0 ? items.length - 1 : 0),
  );

  const activeItem = items[clampedIndex] || null;

  // Available filter tabs that have > 0 items
  const availableTabs: CategoryFilter[] = useMemo(() => {
    const tabs: CategoryFilter[] = ["all"];
    if (categoryCounts.Videos > 0) tabs.push("Videos");
    if (categoryCounts.Notes > 0) tabs.push("Notes");
    if (categoryCounts.Creators > 0) tabs.push("Creators");
    if (categoryCounts.Actions > 0) tabs.push("Actions");
    if (categoryCounts.Navigation > 0) tabs.push("Navigation");
    return tabs;
  }, [categoryCounts]);

  // Keyboard navigation inside list & tab cycling
  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // 1. Tab / Shift+Tab cycling through available category filter pills
    if (event.key === "Tab") {
      event.preventDefault();
      if (availableTabs.length > 1) {
        const curIdx = availableTabs.indexOf(activeFilter);
        if (event.shiftKey) {
          const prevIdx = (curIdx - 1 + availableTabs.length) % availableTabs.length;
          setActiveFilter(availableTabs[prevIdx]!);
        } else {
          const nextIdx = (curIdx + 1) % availableTabs.length;
          setActiveFilter(availableTabs[nextIdx]!);
        }
      }
      return;
    }

    // 2. Cmd+Q or Ctrl+Q: Quick add to Queue if active item is video
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === "q" &&
      activeItem?.category === "Videos"
    ) {
      event.preventDefault();
      const videoId = activeItem.videoId || activeItem.id.replace("video-", "");
      handleToggleQueue(videoId);
      return;
    }

    // 3. Cmd+N or Ctrl+N: Quick open Notes if active item is video
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === "n" &&
      activeItem?.category === "Videos"
    ) {
      event.preventDefault();
      const videoId = activeItem.videoId || activeItem.id.replace("video-", "");
      router.push(`/library?tab=notes&videoId=${videoId}`);
      close();
      return;
    }

    if (items.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeItem) {
        activeItem.onSelect();
      }
    }
  };

  // Group items by category for visual rendering
  const groupedItems = useMemo(() => {
    const groups: Record<string, { item: CommandItem; index: number }[]> = {};
    items.forEach((item, index) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category]!.push({ item, index });
    });
    return groups;
  }, [items]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-16 px-3 sm:px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-4xl bg-surface-1 border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] animate-in zoom-in-95 duration-150 ring-1 ring-white/10">
        
        {/* 1. Search Header Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-border bg-surface-2/40">
          <Search className="w-5 h-5 text-primary shrink-0 mr-3 pointer-events-none" />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command or search videos, notes, creators..."
            className="flex-1 bg-transparent text-sm sm:text-base font-sans font-medium text-foreground placeholder:text-muted-foreground/70 outline-none"
            aria-autocomplete="list"
          />

          {isSearching && (
            <Loader2 className="w-4 h-4 text-primary animate-spin mr-2 shrink-0" />
          )}

          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 text-muted-foreground hover:text-foreground rounded-xs cursor-pointer"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground bg-surface-2 border border-border rounded-md shadow-2xs">
              ESC
            </kbd>
          )}
        </div>

        {/* 2. Interactive Category Filter Pills Bar */}
        <div className="px-3 sm:px-4 py-2 border-b border-border/80 bg-surface-2/20 flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1.5 shrink-0",
              activeFilter === "all"
                ? "bg-primary/20 text-primary border border-primary/40 font-semibold"
                : "text-muted-foreground hover:bg-surface-2 border border-transparent",
            )}
          >
            <span>All</span>
            <span className="text-[10px] font-mono opacity-80">
              {categoryCounts.all}
            </span>
          </button>

          {categoryCounts.Videos > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter("Videos")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1.5 shrink-0",
                activeFilter === "Videos"
                  ? "bg-primary/20 text-primary border border-primary/40 font-semibold"
                  : "text-muted-foreground hover:bg-surface-2 border border-transparent",
              )}
            >
              <Play className="w-3 h-3" />
              <span>Videos</span>
              <span className="text-[10px] font-mono opacity-80">
                {categoryCounts.Videos}
              </span>
            </button>
          )}

          {categoryCounts.Notes > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter("Notes")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1.5 shrink-0",
                activeFilter === "Notes"
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/40 font-semibold"
                  : "text-muted-foreground hover:bg-surface-2 border border-transparent",
              )}
            >
              <BookOpen className="w-3 h-3" />
              <span>Notes</span>
              <span className="text-[10px] font-mono opacity-80">
                {categoryCounts.Notes}
              </span>
            </button>
          )}

          {categoryCounts.Creators > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter("Creators")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1.5 shrink-0",
                activeFilter === "Creators"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold"
                  : "text-muted-foreground hover:bg-surface-2 border border-transparent",
              )}
            >
              <Tv className="w-3 h-3" />
              <span>Creators</span>
              <span className="text-[10px] font-mono opacity-80">
                {categoryCounts.Creators}
              </span>
            </button>
          )}

          {categoryCounts.Actions > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter("Actions")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1.5 shrink-0",
                activeFilter === "Actions"
                  ? "bg-primary/20 text-primary border border-primary/40 font-semibold"
                  : "text-muted-foreground hover:bg-surface-2 border border-transparent",
              )}
            >
              <Zap className="w-3 h-3" />
              <span>Actions</span>
              <span className="text-[10px] font-mono opacity-80">
                {categoryCounts.Actions}
              </span>
            </button>
          )}

          {categoryCounts.Navigation > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter("Navigation")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1.5 shrink-0",
                activeFilter === "Navigation"
                  ? "bg-primary/20 text-primary border border-primary/40 font-semibold"
                  : "text-muted-foreground hover:bg-surface-2 border border-transparent",
              )}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Navigation</span>
              <span className="text-[10px] font-mono opacity-80">
                {categoryCounts.Navigation}
              </span>
            </button>
          )}

          <span className="ml-auto text-[11px] font-mono text-muted-foreground/70 hidden sm:inline select-none">
            [Tab] to filter
          </span>
        </div>

        {/* Action / Sync Feedback Banner */}
        {actionFeedback && (
          <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 text-xs font-mono font-semibold text-primary flex items-center justify-between animate-in fade-in">
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* 3. Two-Column Master-Detail Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[420px] max-h-[500px] divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
          
          {/* Left Column: Results List (7 cols / ~58%) */}
          <div
            ref={listRef}
            role="listbox"
            className="md:col-span-7 flex flex-col overflow-y-auto p-2 focus:outline-none"
            tabIndex={-1}
          >
            {items.length === 0 ? (
              <div className="my-auto py-12 text-center text-muted-foreground select-none">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">
                  No results found for &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Try searching for a video title, concept in your notes, or channel name.
                </p>
              </div>
            ) : (
              Object.entries(groupedItems).map(([category, categoryItems]) => (
                <div key={category} className="py-1.5 first:pt-0 last:pb-0">
                  <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground select-none flex items-center justify-between">
                    <span>{category}</span>
                    <span className="text-[10px] font-normal opacity-70">
                      {categoryItems.length}
                    </span>
                  </div>

                  <div className="space-y-1 mt-0.5">
                    {categoryItems.map(({ item, index }) => {
                      const isSelected = index === clampedIndex;
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.id}
                          role="option"
                          aria-selected={isSelected}
                          onClick={item.onSelect}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition text-xs sm:text-sm select-none",
                            isSelected
                              ? "bg-primary/15 border border-primary/30 text-foreground font-medium shadow-2xs"
                              : "text-foreground/90 hover:bg-surface-2/80 border border-transparent",
                          )}
                        >
                          {/* Thumbnail or Category Icon */}
                          {item.thumbnailUrl ? (
                            <div className="relative w-14 aspect-video rounded-md overflow-hidden bg-surface-3 shrink-0 border border-border">
                              <img
                                src={item.thumbnailUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                              {item.durationSeconds && (
                                <span className="absolute bottom-0.5 right-0.5 px-1 rounded text-[9px] font-mono font-bold bg-black/80 text-white">
                                  {formatDuration(item.durationSeconds)}
                                </span>
                              )}
                            </div>
                          ) : Icon ? (
                            <div
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-surface-2 text-muted-foreground border-border",
                              )}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                          ) : null}

                          {/* Title and Subtitle */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold truncate">
                                {item.title}
                              </span>
                              {item.badge && (
                                <span className="px-1.5 py-0.2 rounded-xs text-[10px] font-mono font-semibold bg-surface-3 border border-border text-muted-foreground shrink-0">
                                  {item.badge}
                                </span>
                              )}
                            </div>

                            {item.subtitle && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {item.subtitle}
                              </p>
                            )}
                          </div>

                          {/* Selection Indicator Arrow */}
                          {isSelected && (
                            <ArrowRight className="w-4 h-4 text-primary shrink-0 opacity-90" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Column: Live Inspector Pane (5 cols / ~42%) */}
          <div className="hidden md:flex md:col-span-5 bg-surface-2/30 flex-col overflow-hidden">
            <CommandPaletteInspector
              item={activeItem}
              onWatchVideo={(videoId) => {
                router.push(`/watch/${videoId}`);
                close();
              }}
              onToggleQueue={handleToggleQueue}
              onOpenNotes={(videoId) => {
                router.push(`/library?tab=notes&videoId=${videoId}`);
                close();
              }}
            />
          </div>

        </div>

        {/* 4. Bottom Raycast-Style Footer */}
        <div className="px-4 py-2.5 border-t border-border bg-surface-2/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground select-none">
          <div className="flex items-center gap-2 truncate pr-2">
            {activeItem ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate text-foreground/80 font-sans">
                  {activeItem.category}: <span className="font-semibold">{activeItem.title}</span>
                </span>
              </>
            ) : (
              <span>Command Palette</span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-surface-1 border border-border rounded text-[9px] font-bold">
                ↑↓
              </kbd>
              <span className="hidden sm:inline">Navigate</span>
            </span>

            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-1 border border-border rounded text-[9px] font-bold">
                ↵
              </kbd>
              <span>Open</span>
            </span>

            <span className="hidden sm:inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-1 border border-border rounded text-[9px] font-bold">
                Tab
              </kbd>
              <span>Filter</span>
            </span>

            {activeItem?.category === "Videos" && (
              <span className="hidden sm:inline-flex items-center gap-1 text-primary">
                <kbd className="px-1.5 py-0.5 bg-surface-1 border border-primary/30 rounded text-[9px] font-bold">
                  ⌘Q
                </kbd>
                <span>Queue</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-1 border border-border rounded text-[9px] font-bold">
                esc
              </kbd>
              <span>Close</span>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
