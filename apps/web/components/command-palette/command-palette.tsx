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
} from "lucide-react";
import { useCommandPaletteStore } from "../../lib/stores/command-palette.store";
import { useGlobalSearchQuery } from "../../lib/queries/search";
import { useSyncVideosMutation } from "../../lib/queries";
import { formatDuration } from "../../lib/formatters";
import { cn } from "../../lib/utils";

interface CommandItem {
  id: string;
  category: "Navigation" | "Actions" | "Videos" | "Notes" | "Creators";
  title: string;
  subtitle?: string;
  badge?: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { isOpen, query, setQuery, close, toggle } = useCommandPaletteStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const syncMutation = useSyncVideosMutation();
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
      setActionFeedback(null);
      // Small timeout to allow dialog mount
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

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

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

  // Compile full list of items to display
  const items: CommandItem[] = useMemo(() => {
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
    ];

    // If query is present, add matching search results
    if (q) {
      // 1. Matched Videos
      if (searchResults?.videos?.length) {
        for (const v of searchResults.videos) {
          resultItems.push({
            id: `video-${v.id}`,
            category: "Videos",
            title: v.title,
            subtitle: v.channelName,
            thumbnailUrl: v.thumbnailUrl,
            durationSeconds: v.durationSeconds,
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
            category: "Notes",
            title: n.videoTitle,
            subtitle: n.snippet,
            badge: n.channelName,
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
      // Default empty query view: show quick navigation & actions
      resultItems.push(...actionItems);
      resultItems.push(...navItems);
    }

    return resultItems;
  }, [query, searchResults, router, close]);

  // Keep selected index within bounds
  const clampedIndex = Math.max(
    0,
    Math.min(selectedIndex, items.length > 0 ? items.length - 1 : 0),
  );

  // Keyboard navigation inside list
  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (items.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const activeItem = items[clampedIndex];
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-3 sm:px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-2xl bg-surface-1 border-2 border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[75vh] animate-in zoom-in-95 duration-150">
        {/* Search Header Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-border bg-surface-2/40">
          <Search className="w-5 h-5 text-muted-foreground shrink-0 mr-3 pointer-events-none" />

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
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground bg-surface-1 border border-border rounded-sm shadow-2xs">
              ESC
            </kbd>
          )}
        </div>

        {/* Action / Sync Feedback Banner */}
        {actionFeedback && (
          <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 text-xs font-mono font-semibold text-primary flex items-center justify-between animate-in fade-in">
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Scrollable Results List */}
        <div
          ref={listRef}
          role="listbox"
          className="flex-1 overflow-y-auto p-2 divide-y divide-border/40 focus:outline-none"
          tabIndex={-1}
        >
          {items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground select-none">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-muted-foreground/80 mt-1">
                Try searching for a video title, concept in your notes, or channel name.
              </p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className="py-1.5 first:pt-0 last:pb-0">
                <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground select-none">
                  {category}
                </div>

                <div className="space-y-0.5 mt-0.5">
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
                          "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs sm:text-sm select-none",
                          isSelected
                            ? "bg-primary/15 text-foreground border-l-3 border-primary pl-2.5 font-medium"
                            : "text-foreground/90 hover:bg-surface-2/80",
                        )}
                      >
                        {/* Thumbnail or Category Icon */}
                        {item.thumbnailUrl ? (
                          <div className="relative w-12 aspect-video rounded-xs overflow-hidden bg-surface-3 shrink-0 border border-border/80">
                            <img
                              src={item.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : Icon ? (
                          <div
                            className={cn(
                              "w-7 h-7 rounded-md flex items-center justify-center shrink-0 border",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-surface-2 text-muted-foreground border-border",
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
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

                        {/* Duration or Selection Arrow */}
                        {item.durationSeconds ? (
                          <span className="text-[11px] font-mono font-semibold text-muted-foreground shrink-0 px-1.5 py-0.5 rounded-xs bg-surface-2 border border-border/80">
                            {formatDuration(item.durationSeconds)}
                          </span>
                        ) : isSelected ? (
                          <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 opacity-80" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Keyboard Hints Footer */}
        <div className="px-4 py-2 border-t border-border bg-surface-2/50 flex items-center justify-between text-[11px] font-mono text-muted-foreground select-none">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-surface-1 border border-border rounded-xs text-[9px] font-bold">
                ↑
              </kbd>
              <kbd className="px-1 py-0.5 bg-surface-1 border border-border rounded-xs text-[9px] font-bold">
                ↓
              </kbd>
              <span>to navigate</span>
            </span>

            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-1 border border-border rounded-xs text-[9px] font-bold">
                ↵
              </kbd>
              <span>to select</span>
            </span>
          </div>

          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-surface-1 border border-border rounded-xs text-[9px] font-bold">
              esc
            </kbd>
            <span>to close</span>
          </span>
        </div>
      </div>
    </div>
  );
}

