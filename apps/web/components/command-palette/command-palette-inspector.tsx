"use client";

import * as React from "react";
import {
  Play,
  Clock,
  BookOpen,
  ExternalLink,
  Check,
  Tv,
  Zap,
  SunMoon,
  Sparkles,
  ArrowRight,
  UserCheck,
  Compass,
} from "lucide-react";
import { formatDuration, formatRelativeTime } from "../../lib/formatters";
import { cn } from "../../lib/utils";

export interface InspectorItem {
  id: string;
  category: "Navigation" | "Actions" | "Videos" | "Notes" | "Creators";
  title: string;
  subtitle?: string;
  badge?: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  publishedAt?: string | null;
  youtubeVideoId?: string | null;
  videoId?: string | null;
  noteSnippet?: string | null;
  channelName?: string | null;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

interface CommandPaletteInspectorProps {
  item: InspectorItem | null;
  onWatchVideo?: (videoId: string) => void;
  onToggleQueue?: (videoId: string) => void;
  onOpenNotes?: (videoId: string, noteId?: string) => void;
  isQueueLoading?: boolean;
  isInQueue?: boolean;
}

export function CommandPaletteInspector({
  item,
  onWatchVideo,
  onToggleQueue,
  onOpenNotes,
  isQueueLoading,
  isInQueue,
}: CommandPaletteInspectorProps) {
  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground select-none">
        <Sparkles className="w-8 h-8 opacity-30 mb-2" />
        <p className="text-xs font-medium">Select an item to preview</p>
      </div>
    );
  }

  // 1. VIDEO INSPECTOR
  if (item.category === "Videos") {
    const videoId = item.videoId || item.id.replace("video-", "");
    const formattedDuration = formatDuration(item.durationSeconds);
    const relativeTime = formatRelativeTime(item.publishedAt);

    return (
      <div className="h-full p-4 flex flex-col justify-between overflow-y-auto text-xs animate-in fade-in-50 duration-150">
        <div className="space-y-3.5">
          {/* 16:9 Thumbnail Preview */}
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-surface-3 border border-border shadow-md">
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface-3 text-muted-foreground">
                <Play className="w-8 h-8 opacity-40" />
              </div>
            )}
            {formattedDuration && (
              <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/80 text-white border border-white/10 shadow-xs">
                {formattedDuration}
              </span>
            )}
          </div>

          {/* Video Metadata & Un-truncated Title */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md bg-primary/15 text-primary border border-primary/30">
                Video
              </span>
              {relativeTime && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  {relativeTime}
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-3">
              {item.title}
            </h3>

            {/* Channel Info */}
            {item.subtitle && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                <div className="w-6 h-6 rounded-full bg-surface-3 border border-border flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {item.subtitle.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {item.subtitle}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Followed Creator
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-surface-1/80 p-2 rounded-lg border border-border">
              <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                Duration
              </span>
              <span className="font-semibold text-foreground">
                {formattedDuration || "N/A"}
              </span>
            </div>
            <div className="bg-surface-1/80 p-2 rounded-lg border border-border">
              <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                Uploaded
              </span>
              <span className="font-semibold text-foreground">
                {relativeTime || "Recent"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-3 border-t border-border space-y-2">
          <button
            type="button"
            onClick={() => onWatchVideo ? onWatchVideo(videoId) : item.onSelect()}
            className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Watch Video</span>
            <kbd className="ml-auto font-mono text-[10px] bg-primary-foreground/20 text-primary-foreground px-1.5 py-0.5 rounded font-bold">
              ↵
            </kbd>
          </button>

          <div className="grid grid-cols-2 gap-2">
            {onToggleQueue && (
              <button
                type="button"
                onClick={() => onToggleQueue(videoId)}
                disabled={isQueueLoading}
                className="py-1.5 px-2.5 rounded-lg bg-surface-1 hover:bg-surface-3 text-foreground font-medium text-[11px] flex items-center justify-between border border-border cursor-pointer transition"
              >
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  {isInQueue ? "In Queue" : "+ Queue"}
                </span>
                <kbd className="font-mono text-[9px] text-muted-foreground bg-surface-2 px-1 py-0.5 rounded">
                  ⌘Q
                </kbd>
              </button>
            )}

            {onOpenNotes && (
              <button
                type="button"
                onClick={() => onOpenNotes(videoId)}
                className="py-1.5 px-2.5 rounded-lg bg-surface-1 hover:bg-surface-3 text-foreground font-medium text-[11px] flex items-center justify-between border border-border cursor-pointer transition"
              >
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3 text-muted-foreground" />
                  Notes
                </span>
                <kbd className="font-mono text-[9px] text-muted-foreground bg-surface-2 px-1 py-0.5 rounded">
                  ⌘N
                </kbd>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. NOTE INSPECTOR
  if (item.category === "Notes") {
    return (
      <div className="h-full p-4 flex flex-col justify-between overflow-y-auto text-xs animate-in fade-in-50 duration-150">
        <div className="space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30">
              Personal Note
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              Second Brain
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-foreground leading-snug">
              {item.title}
            </h3>
            {item.badge && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Channel: <span className="text-foreground">{item.badge}</span>
              </p>
            )}
          </div>

          {/* Snippet Card */}
          <div className="p-3 rounded-xl bg-surface-1 border border-border text-xs leading-relaxed space-y-2">
            <div className="flex items-center gap-1.5 text-purple-400 font-mono text-[10px] font-semibold">
              <BookOpen className="w-3 h-3" />
              <span>Matching Excerpt</span>
            </div>
            <p className="text-foreground/90 font-sans italic whitespace-pre-wrap">
              &ldquo;{item.subtitle || item.noteSnippet || "No snippet available"}&rdquo;
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <button
            type="button"
            onClick={item.onSelect}
            className="w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Open in Notes Drawer</span>
            <kbd className="ml-auto font-mono text-[10px] bg-purple-700/60 text-white px-1.5 py-0.5 rounded font-bold">
              ↵
            </kbd>
          </button>
        </div>
      </div>
    );
  }

  // 3. CREATORS INSPECTOR
  if (item.category === "Creators") {
    return (
      <div className="h-full p-4 flex flex-col justify-between overflow-y-auto text-xs animate-in fade-in-50 duration-150">
        <div className="space-y-4">
          <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Creator &bull; YouTube Channel
          </span>

          <div className="flex items-center gap-3">
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt={item.title}
                className="w-12 h-12 rounded-full object-cover border border-border shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-surface-3 border border-border flex items-center justify-center text-sm font-bold text-emerald-400">
                {item.title.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {item.title}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-emerald-400" />
                <span>{item.subtitle || "Followed creator"}</span>
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-1 border border-border space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-muted-foreground block font-bold">
              Channel Actions
            </span>
            <p className="text-muted-foreground text-[11px]">
              Jump to this creator&apos;s videos in your feed or update import settings in your channel preferences.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <button
            type="button"
            onClick={item.onSelect}
            className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>View Creator in Settings</span>
            <kbd className="ml-auto font-mono text-[10px] bg-emerald-700/60 text-white px-1.5 py-0.5 rounded font-bold">
              ↵
            </kbd>
          </button>
        </div>
      </div>
    );
  }

  // 4. ACTIONS / NAVIGATION INSPECTOR
  const Icon = item.icon || Compass;

  return (
    <div className="h-full p-4 flex flex-col justify-between overflow-y-auto text-xs animate-in fade-in-50 duration-150">
      <div className="space-y-4">
        <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md bg-primary/15 text-primary border border-primary/30">
          {item.category === "Actions" ? "Command Action" : "Navigation Shortcut"}
        </span>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {item.title}
            </h3>
            {item.subtitle && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {item.subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-1 border border-border space-y-2">
          <span className="text-[10px] font-mono uppercase text-muted-foreground block font-bold">
            Description
          </span>
          <p className="text-foreground/90 text-xs leading-relaxed">
            {item.category === "Actions"
              ? "Instantly triggers background operations like YouTube video refreshes or appearance themes."
              : "Instantly navigates to this view without reloading your application state."}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border">
        <button
          type="button"
          onClick={item.onSelect}
          className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>Execute</span>
          <kbd className="ml-auto font-mono text-[10px] bg-primary-foreground/20 text-primary-foreground px-1.5 py-0.5 rounded font-bold">
            ↵
          </kbd>
        </button>
      </div>
    </div>
  );
}

