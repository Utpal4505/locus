"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Download,
  Calendar,
  Clock,
  Tv,
  BookOpen,
  Sparkles,
} from "lucide-react";
import type { LibraryNoteItem } from "@locus/contracts";
import { Button } from "./ui/button";
import { MarkdownRenderer } from "./markdown-renderer";
import { formatDuration, formatRelativeTime } from "../lib/formatters";
import { downloadSingleNote } from "../lib/export-notes";

interface NotesReadingDrawerProps {
  note: LibraryNoteItem | null;
  isOpen: boolean;
  onClose: () => void;
}

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

export function NotesReadingDrawer({
  note,
  isOpen,
  onClose,
}: NotesReadingDrawerProps) {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);

  // Extract all timestamps found in this note
  const timestamps = React.useMemo(() => {
    if (!note?.content) return [];
    const regex = /(\[\d{1,2}:\d{2}(?::\d{2})?\]|\b\d{1,2}:\d{2}(?::\d{2})?\b)/g;
    const matches = note.content.match(regex) || [];
    return Array.from(new Set(matches));
  }, [note?.content]);

  // Close on Escape key
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !note) {
    return null;
  }

  const durationText = formatDuration(note.durationSeconds);
  const relativeDate = formatRelativeTime(note.updatedAt);
  const watchUrl = `/watch/${note.videoId}?tab=notes`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(note.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    downloadSingleNote(note);
  };

  const handleSeekFromDrawer = (seconds: number) => {
    onClose();
    router.push(`/watch/${note.videoId}?t=${seconds}&tab=notes`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Notes for ${note.videoTitle}`}
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/70 backdrop-blur-sm transition-opacity animate-in fade-in cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Content Surface */}
      <div className="relative z-10 w-full sm:max-w-2xl h-full bg-surface-1 sm:border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header Toolbar */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-border flex items-center justify-between gap-2.5 bg-surface-2/60">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
              <BookOpen className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-muted-foreground truncate flex items-center gap-1.5">
                <span className="hidden sm:inline">Personal Notes</span>
                <span className="hidden sm:inline">/</span>
                <span className="text-foreground font-semibold truncate">{note.channelName}</span>
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-foreground truncate m-0">
                Study Note
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Direct Open in Watch Studio */}
            <Button
              variant="default"
              size="sm"
              asChild
              className="h-8 gap-1.5 text-xs font-semibold cursor-pointer shadow-xs px-2.5 sm:px-3"
            >
              <Link href={watchUrl} onClick={onClose}>
                <span className="hidden sm:inline">Watch Studio</span>
                <span className="sm:hidden">Studio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </Button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close reading view"
              className="h-8 w-8 rounded-lg border border-border bg-surface-1 hover:bg-surface-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Reference Banner */}
        <div className="p-4 sm:p-5 border-b border-border/70 bg-surface-2/30">
          <div className="flex gap-3 sm:gap-4 items-start">
            {/* Thumbnail */}
            <Link
              href={watchUrl}
              onClick={onClose}
              className="relative w-24 sm:w-36 aspect-video rounded-xl overflow-hidden border border-border/80 shrink-0 bg-surface-3 group/thumb"
            >
              {note.thumbnailUrl ? (
                <img
                  src={note.thumbnailUrl}
                  alt={note.videoTitle}
                  className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Tv className="w-6 h-6" />
                </div>
              )}
              {durationText && (
                <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-black/85 text-white border border-white/20 select-none">
                  {durationText}
                </span>
              )}
            </Link>

            {/* Title & Creator Details */}
            <div className="flex-1 min-w-0">
              <Link
                href={watchUrl}
                onClick={onClose}
                className="text-xs sm:text-base font-bold text-foreground leading-snug line-clamp-2 hover:text-primary transition-colors m-0 mb-1.5 block"
                title={note.videoTitle}
              >
                {note.videoTitle}
              </Link>

              <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground flex-wrap font-mono">
                <span className="font-semibold text-foreground/90 truncate max-w-[160px] sm:max-w-[200px]">
                  {note.channelName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[11px]">
                  <Calendar className="w-3 h-3" />
                  {relativeDate}
                </span>
              </div>

              {/* Action buttons inside hero */}
              <div className="flex items-center gap-2 mt-2.5 sm:mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 text-xs gap-1.5 px-2 sm:px-2.5 cursor-pointer font-mono border-border/80 hover:bg-surface-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-success" />
                      <span className="text-success font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy<span className="hidden sm:inline"> Markdown</span></span>
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="h-7 text-xs gap-1.5 px-2 sm:px-2.5 cursor-pointer font-mono border-border/80 hover:bg-surface-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download<span className="hidden sm:inline"> .md</span></span>
                </Button>
              </div>
            </div>
          </div>

          {/* Interactive Study Keyframes Bar */}
          {timestamps.length > 0 && (
            <div className="mt-3.5 pt-3 border-t border-border/60">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono no-scrollbar touch-pan-x">
                <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                  <Clock className="w-3 h-3 text-primary" /> Keyframes:
                </span>
                {timestamps.map((ts, idx) => {
                  const seconds = parseTimestampToSeconds(ts);
                  if (seconds === null) return null;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSeekFromDrawer(seconds)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-2 border border-border/80 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all cursor-pointer font-bold shrink-0 text-[11px]"
                      title={`Jump player to ${ts}`}
                    >
                      <span>{ts}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Note Document Surface */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-7 pb-16 sm:pb-8 space-y-4">
          <div className="prose prose-invert max-w-none text-sm text-foreground leading-relaxed font-sans">
            <MarkdownRenderer
              content={note.content}
              onSeek={handleSeekFromDrawer}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
