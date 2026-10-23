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
  Tv,
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

export function NotesReadingDrawer({
  note,
  isOpen,
  onClose,
}: NotesReadingDrawerProps) {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);

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
      <div className="relative z-10 w-full max-w-2xl h-full bg-surface-1 border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-3 bg-surface-2/60">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Tv className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground truncate m-0">
                Study Notes Reading View
              </h2>
              <p className="text-[11px] font-mono text-muted-foreground truncate m-0">
                {note.channelName} · {relativeDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Direct Open in Watch Studio */}
            <Button
              variant="default"
              size="sm"
              asChild
              className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <Link href={watchUrl} onClick={onClose}>
                <span>Open in Studio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </Button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close reading view"
              className="h-8 w-8 rounded-md border border-border bg-surface-1 hover:bg-surface-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Metadata Hero Card */}
        <div className="p-4 sm:p-5 border-b border-border/70 bg-surface-2/30">
          <div className="flex gap-3.5 items-start">
            {/* Thumbnail */}
            {note.thumbnailUrl ? (
              <div className="relative w-28 sm:w-36 aspect-video rounded-md overflow-hidden border border-border/80 shrink-0 bg-surface-3">
                <img
                  src={note.thumbnailUrl}
                  alt={note.videoTitle}
                  className="w-full h-full object-cover"
                />
                {durationText && (
                  <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-black/85 text-white border border-white/20 select-none">
                    {durationText}
                  </span>
                )}
              </div>
            ) : null}

            {/* Title & Creator Details */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug line-clamp-2 m-0 mb-1.5">
                {note.videoTitle}
              </h3>

              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap font-mono">
                <span className="font-semibold text-foreground/90 truncate max-w-[200px]">
                  {note.channelName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[11px]">
                  <Calendar className="w-3 h-3" />
                  {new Date(note.updatedAt).toLocaleDateString()}
                </span>
              </div>

              {/* Utility actions inside hero */}
              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 text-xs gap-1.5 px-2.5 cursor-pointer font-mono"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-success" />
                      <span className="text-success">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Note</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="h-7 text-xs gap-1.5 px-2.5 cursor-pointer font-mono"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .md</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Note Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="rounded-lg border border-border/80 bg-surface-1 p-5 shadow-xs">
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
