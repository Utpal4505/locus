"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Loader2,
  Tv,
  FileText,
  UserCheck,
  User,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useGlobalSearchQuery } from "@/lib/queries/search";
import { formatDuration } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface NavbarSearchProps {
  className?: string;
  onOpenCommandPalette?: () => void;
}

export function NavbarSearch({ className, onOpenCommandPalette }: NavbarSearchProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const mobileInputRef = React.useRef<HTMLInputElement>(null);

  const { data: searchResults, isLoading } = useGlobalSearchQuery(query, {
    enabled: isOpen && query.trim().length > 0,
    debounceMs: 150,
  });

  const videos = searchResults?.videos ?? [];
  const channels = searchResults?.channels ?? [];
  const notes = searchResults?.notes ?? [];
  const totalResults = videos.length + channels.length + notes.length;

  // Flattened actionable items for keyboard navigation
  const flatItems = React.useMemo(() => {
    const list: Array<{
      type: "video" | "channel" | "note";
      id: string;
      title: string;
      action: () => void;
    }> = [];

    videos.forEach((v) => {
      list.push({
        type: "video",
        id: v.id,
        title: v.title,
        action: () => {
          router.push(`/watch/${v.id}`);
          handleClose();
        },
      });
    });

    channels.forEach((c) => {
      list.push({
        type: "channel",
        id: c.id,
        title: c.name,
        action: () => {
          router.push(`/settings?search=${encodeURIComponent(c.name)}`);
          handleClose();
        },
      });
    });

    notes.forEach((n) => {
      list.push({
        type: "note",
        id: n.id,
        title: n.videoTitle,
        action: () => {
          router.push(`/library?tab=notes&noteId=${n.id}`);
          handleClose();
        },
      });
    });

    return list;
  }, [videos, channels, notes, router]);

  // Click outside listener to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global keyboard shortcut: "/" focuses search bar and auto-selects
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputFocused =
        activeTag === "input" ||
        activeTag === "textarea" ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (event.key === "/" && !isInputFocused) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus mobile input on open and auto-select
  React.useEffect(() => {
    if (isMobileSearchOpen) {
      setTimeout(() => {
        mobileInputRef.current?.focus();
        mobileInputRef.current?.select();
      }, 50);
    }
  }, [isMobileSearchOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setIsMobileSearchOpen(false);
    setActiveIndex(-1);
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
    inputRef.current?.select();
    mobileInputRef.current?.focus();
    mobileInputRef.current?.select();
  };

  // Keyboard navigation inside search dropdown
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen && query.trim().length > 0) {
        setIsOpen(true);
        return;
      }
      setActiveIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && flatItems[activeIndex]) {
        flatItems[activeIndex].action();
      } else if (flatItems.length > 0) {
        flatItems[0]?.action();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      handleClose();
      inputRef.current?.blur();
      mobileInputRef.current?.blur();
    }
  };

  return (
    <>
      {/* 1. Desktop & Tablet Search Input with Live Dropdown */}
      <div
        ref={containerRef}
        className={cn(
          "relative flex-1 max-w-sm lg:max-w-md hidden sm:flex items-center",
          className,
        )}
      >
        <div className="relative w-full flex items-center">
          <Search
            className={cn(
              "absolute left-3 w-4 h-4 pointer-events-none transition-colors",
              isOpen ? "text-primary" : "text-muted-foreground",
            )}
          />

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={(e) => {
              setIsOpen(true);
              e.currentTarget.select();
            }}
            onClick={(e) => {
              e.currentTarget.select();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search videos, creators, notes... (Press /)"
            className={cn(
              "w-full h-9 pl-9 pr-14 rounded-xl border text-xs sm:text-sm font-sans transition-all outline-none",
              isOpen
                ? "border-primary/60 bg-surface-1 shadow-sm ring-2 ring-primary/20"
                : "border-border/60 bg-surface-2/50 hover:bg-surface-2/80 hover:border-border-strong text-foreground placeholder:text-muted-foreground",
            )}
            autoComplete="off"
            spellCheck="false"
          />

          {/* Right Action Icons: Spinner, Clear Button, or Shortcut Badges */}
          <div className="absolute right-2.5 flex items-center gap-1.5">
            {isLoading && (
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            )}

            {query ? (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground bg-surface-3/60 border border-border/60 rounded-md shadow-2xs pointer-events-none select-none">
                /
              </kbd>
            )}

            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={() => onOpenCommandPalette()}
                className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-muted-foreground hover:text-foreground hover:bg-surface-3 bg-surface-3/60 border border-border/60 rounded-md shadow-2xs transition-colors cursor-pointer ml-0.5 select-none"
                title="Open Command Palette (Cmd+K)"
              >
                ⌘K
              </button>
            )}
          </div>
        </div>

        {/* 2. Live Floating Search Results Dropdown (Desktop) */}
        <AnimatePresence>
          {isOpen && query.trim().length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 bg-surface-1/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl z-50 p-2 max-h-[75vh] overflow-y-auto"
            >
            {totalResults === 0 && !isLoading ? (
              <div className="p-6 text-center text-xs font-mono text-muted-foreground">
                No matching videos, notes, or creators found for &quot;{query}&quot;
              </div>
            ) : (
              <div className="space-y-3">
                {/* Videos Section */}
                {videos.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Videos</span>
                      <span>{videos.length}</span>
                    </div>
                    <div className="space-y-1">
                      {videos.map((video) => {
                        const itemIdx = flatItems.findIndex(
                          (item) => item.id === video.id,
                        );
                        const isSelected = activeIndex === itemIdx;

                        return (
                          <div
                            key={video.id}
                            onClick={() => {
                              router.push(`/watch/${video.id}`);
                              handleClose();
                            }}
                            className={cn(
                              "flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors group",
                              isSelected
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "hover:bg-surface-2 text-foreground",
                            )}
                          >
                            <div className="relative w-12 aspect-video rounded overflow-hidden bg-surface-3 shrink-0 border border-border/60">
                              {video.thumbnailUrl ? (
                                <img
                                  src={video.thumbnailUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <Tv className="w-3.5 h-3.5" />
                                </div>
                              )}
                              {video.durationSeconds && (
                                <span className="absolute bottom-0.5 right-0.5 px-0.5 rounded bg-black/80 text-[8px] font-mono text-white">
                                  {formatDuration(video.durationSeconds)}
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate m-0 leading-tight">
                                {video.title}
                              </p>
                              <p
                                className={cn(
                                  "text-[10px] font-mono truncate mt-0.5",
                                  isSelected
                                    ? "text-primary-foreground/80"
                                    : "text-muted-foreground",
                                )}
                              >
                                {video.channelName}
                              </p>
                            </div>

                            <ArrowRight
                              className={cn(
                                "w-3.5 h-3.5 shrink-0 transition-opacity",
                                isSelected
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100 text-muted-foreground",
                              )}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Creators Section */}
                {channels.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Creators</span>
                      <span>{channels.length}</span>
                    </div>
                    <div className="space-y-1">
                      {channels.map((channel) => {
                        const itemIdx = flatItems.findIndex(
                          (item) => item.id === channel.id,
                        );
                        const isSelected = activeIndex === itemIdx;

                        return (
                          <div
                            key={channel.id}
                            onClick={() => {
                              router.push(
                                `/settings?search=${encodeURIComponent(
                                  channel.name,
                                )}`,
                              );
                              handleClose();
                            }}
                            className={cn(
                              "flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors group",
                              isSelected
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "hover:bg-surface-2 text-foreground",
                            )}
                          >
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-surface-3 border border-border shrink-0 flex items-center justify-center">
                              {channel.thumbnailUrl ? (
                                <img
                                  src={channel.thumbnailUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <span className="text-xs font-bold truncate">
                                {channel.name}
                              </span>
                              {channel.isFollowed && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-success/10 text-success border border-success/30">
                                  Following
                                </span>
                              )}
                            </div>

                            <ArrowRight
                              className={cn(
                                "w-3.5 h-3.5 shrink-0 transition-opacity",
                                isSelected
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100 text-muted-foreground",
                              )}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes Section */}
                {notes.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Study Notes</span>
                      <span>{notes.length}</span>
                    </div>
                    <div className="space-y-1">
                      {notes.map((note) => {
                        const itemIdx = flatItems.findIndex(
                          (item) => item.id === note.id,
                        );
                        const isSelected = activeIndex === itemIdx;

                        return (
                          <div
                            key={note.id}
                            onClick={() => {
                              router.push(
                                `/library?tab=notes&noteId=${note.id}`,
                              );
                              handleClose();
                            }}
                            className={cn(
                              "flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors group",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-surface-2 text-foreground",
                            )}
                          >
                            <FileText className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate m-0">
                                {note.videoTitle}
                              </p>
                              <p
                                className={cn(
                                  "text-[11px] line-clamp-1 mt-0.5",
                                  isSelected
                                    ? "text-primary-foreground/80"
                                    : "text-muted-foreground",
                                )}
                              >
                                {note.snippet}
                              </p>
                            </div>
                            <ExternalLink
                              className={cn(
                                "w-3.5 h-3.5 shrink-0 mt-0.5 transition-opacity",
                                isSelected
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100 text-muted-foreground",
                              )}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>

      {/* 3. Mobile Search Trigger Button */}
      <button
        type="button"
        onClick={() => setIsMobileSearchOpen(true)}
        className="sm:hidden h-9 w-9 p-0 rounded-md border border-border bg-surface-2 text-foreground shadow-sm hover:bg-surface-3 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        aria-label="Open search"
        title="Search videos, creators, notes"
      >
        <Search className="w-4 h-4" />
      </button>

      {/* 4. Mobile Full-Screen Search Modal with Auto-Select */}
      {isMobileSearchOpen && (
        <div className="sm:hidden fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-150">
          {/* Mobile Search Header */}
          <div className="flex items-center gap-2 p-3 border-b-2 border-border bg-surface-1">
            <Search className="w-4 h-4 text-primary shrink-0 ml-1" />
            <input
              ref={mobileInputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onClick={(e) => e.currentTarget.select()}
              onKeyDown={handleKeyDown}
              placeholder="Search videos, creators, notes..."
              className="flex-1 h-9 px-2 text-sm bg-surface-2 border border-border rounded-md outline-none text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="px-2.5 py-1 text-xs font-mono font-bold text-foreground hover:text-primary"
            >
              Cancel
            </button>
          </div>

          {/* Mobile Search Results List */}
          <div className="flex-1 overflow-y-auto p-3">
            {isLoading && (
              <div className="py-8 text-center text-xs font-mono text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Searching...</span>
              </div>
            )}

            {!isLoading && query.trim().length > 0 && totalResults === 0 && (
              <div className="py-12 text-center text-xs font-mono text-muted-foreground">
                No matching results found for &quot;{query}&quot;
              </div>
            )}

            {!isLoading && (
              <div className="space-y-4">
                {/* Videos */}
                {videos.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                      Videos ({videos.length})
                    </h3>
                    <div className="space-y-1.5">
                      {videos.map((video) => (
                        <div
                          key={video.id}
                          onClick={() => {
                            router.push(`/watch/${video.id}`);
                            handleClose();
                          }}
                          className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-1 border border-border active:bg-surface-2"
                        >
                          <div className="relative w-14 aspect-video rounded overflow-hidden bg-surface-2 shrink-0 border border-border/60">
                            {video.thumbnailUrl && (
                              <img
                                src={video.thumbnailUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate m-0">
                              {video.title}
                            </p>
                            <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                              {video.channelName}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Creators */}
                {channels.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                      Creators ({channels.length})
                    </h3>
                    <div className="space-y-1.5">
                      {channels.map((channel) => (
                        <div
                          key={channel.id}
                          onClick={() => {
                            router.push(
                              `/settings?search=${encodeURIComponent(
                                channel.name,
                              )}`,
                            );
                            handleClose();
                          }}
                          className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-1 border border-border active:bg-surface-2"
                        >
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-surface-3 border border-border shrink-0 flex items-center justify-center">
                            {channel.thumbnailUrl ? (
                              <img
                                src={channel.thumbnailUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-foreground truncate flex-1">
                            {channel.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {notes.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                      Study Notes ({notes.length})
                    </h3>
                    <div className="space-y-1.5">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          onClick={() => {
                            router.push(
                              `/library?tab=notes&noteId=${note.id}`,
                            );
                            handleClose();
                          }}
                          className="flex items-start gap-2.5 p-2 rounded-lg bg-surface-1 border border-border active:bg-surface-2"
                        >
                          <FileText className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate m-0">
                              {note.videoTitle}
                            </p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {note.snippet}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

