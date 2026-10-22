"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  Star,
  Clock,
  Share2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  SkipForward,
  FileText,
  ListVideo,
  X,
  Check,
  Loader2,
  Sparkles,
  Tv,
  ArrowLeft,
  Play,
  Bold,
  Italic,
  Heading2,
  List,
  Code,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  MoreHorizontal,
} from "lucide-react";
import { AppShell } from "../../../components/app-shell";
import {
  YouTubePlayer,
  type YouTubePlayerRef,
} from "../../../components/youtube-player";
import { MarkdownRenderer } from "../../../components/markdown-renderer";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Card } from "../../../components/ui/card";
import {
  useVideoQuery,
  useVideoNotesQuery,
  useUpdateVideoNotesMutation,
  useLibraryQuery,
  useUpdateVideoLibraryStateMutation,
} from "../../../lib/queries";
import { formatDuration, formatRelativeTime } from "../../../lib/formatters";
import { shouldMarkAsWatched } from "../../../lib/video-playback";
import { cn } from "../../../lib/utils";

// Helper to format seconds into mm:ss or hh:mm:ss
function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface VideoChapter {
  timeSeconds: number;
  timeLabel: string;
  title: string;
}

function parseChapterSeconds(text: string): number | null {
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

function extractChaptersFromDescription(description: string | null): VideoChapter[] {
  if (!description) return [];
  const lines = description.split("\n");
  const chapters: VideoChapter[] = [];
  const chapterRegex = /(?:^|\s)(?:\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?)\s*[-:–]?\s+(.+)$/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(chapterRegex);
    if (match) {
      const timeLabel = match[1] ?? "";
      const title = (match[2] ?? "").trim();
      const seconds = parseChapterSeconds(timeLabel);
      if (seconds !== null && title) {
        chapters.push({
          timeSeconds: seconds,
          timeLabel,
          title,
        });
      }
    }
  }
  return chapters;
}


export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = typeof params?.id === "string" ? params.id : "";

  const { data: video, isLoading, error } = useVideoQuery(videoId);
  const { data: queueData } = useLibraryQuery("queue");
  const updateMutation = useUpdateVideoLibraryStateMutation();

  const chapters = React.useMemo(() => {
    return extractChaptersFromDescription(video?.description ?? null);
  }, [video?.description]);

  // Immediate playback/open registration to log video in user's Watch History
  const hasRegisteredOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (video?.id && !hasRegisteredOpenRef.current) {
      hasRegisteredOpenRef.current = true;
      updateMutation.mutate({
        videoId: video.id,
        updates: { lastOpened: true },
      });
    }
  }, [video?.id, updateMutation]);

  const { data: notesData } = useVideoNotesQuery(
    video?.id ?? "",
    Boolean(video?.id),
  );
  const updateNotesMutation = useUpdateVideoNotesMutation();

  const playerRef = React.useRef<YouTubePlayerRef>(null);

  // Player & Time state
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = React.useState(false);

  // Resume prompt state
  const [showResumePrompt, setShowResumePrompt] = React.useState(false);
  const [hasDismissedResume, setHasDismissedResume] = React.useState(false);

  // Active side panel: null | "upNext" | "notes" | "chapters"
  const [activePanel, setActivePanel] = React.useState<
    "upNext" | "notes" | "chapters" | null
  >(null);

  // Theater / Cinema mode & Notes studio expand
  const [isTheaterMode, setIsTheaterMode] = React.useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = React.useState(false);

  // Secondary actions dropdown & copy feedback
  const [isActionsOpen, setIsActionsOpen] = React.useState(false);
  const actionsRef = React.useRef<HTMLDivElement>(null);
  const [copyFeedback, setCopyFeedback] = React.useState(false);
  const [copyNotesFeedback, setCopyNotesFeedback] = React.useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = React.useState(false);

  // Close overflow actions dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(event.target as Node)
      ) {
        setIsActionsOpen(false);
      }
    };
    if (isActionsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isActionsOpen]);

  // Notes state
  const [notesContent, setNotesContent] = React.useState("");
  const notesContentRef = React.useRef(notesContent);
  notesContentRef.current = notesContent;
  const hasLoadedInitialNotesForVideoRef = React.useRef<string | null>(null);
  const [notesTab, setNotesTab] = React.useState<"write" | "preview">("write");
  const [isSavingNotes, setIsSavingNotes] = React.useState(false);
  const notesSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Video, Time, & Mutation tracking refs for safe unmount/unload cleanups
  const currentTimeRef = React.useRef(currentTime);
  currentTimeRef.current = currentTime;
  const videoRef = React.useRef(video);
  videoRef.current = video;
  const updateNotesMutationRef = React.useRef(updateNotesMutation);
  updateNotesMutationRef.current = updateNotesMutation;

  // Progress sync tracking
  const lastSavedTimeRef = React.useRef(0);
  const hasAutoCompletedRef = React.useRef(false);

  // Initialize library state
  const isWatched = Boolean(video?.library?.isWatched);
  const isFavorite = Boolean(video?.library?.isFavorite);
  const isInQueue = Boolean(video?.library?.isInQueue);
  const savedProgress = video?.library?.progressSeconds ?? 0;

  // Reset notes when switching to a different video
  React.useEffect(() => {
    if (video?.id && hasLoadedInitialNotesForVideoRef.current !== video.id) {
      hasLoadedInitialNotesForVideoRef.current = null;
      setNotesContent("");
    }
  }, [video?.id]);

  // Sync initial notes from API once per video (avoids wiping active user typing on mutation cache updates)
  React.useEffect(() => {
    if (video?.id && notesData?.content !== undefined && hasLoadedInitialNotesForVideoRef.current !== video.id) {
      hasLoadedInitialNotesForVideoRef.current = video.id;
      setNotesContent(notesData.content || "");
    }
  }, [video?.id, notesData?.content]);

  // Flush unsaved notes strictly on component unmount
  React.useEffect(() => {
    return () => {
      if (notesSaveTimeoutRef.current) {
        clearTimeout(notesSaveTimeoutRef.current);
        const currentVideo = videoRef.current;
        if (currentVideo?.id) {
          updateNotesMutationRef.current.mutate({
            videoId: currentVideo.id,
            content: notesContentRef.current,
          });
        }
      }
    };
  }, []);

  // Show Resume prompt if video has saved progress > 10s and is unwatched
  React.useEffect(() => {
    if (
      savedProgress > 10 &&
      !isWatched &&
      !hasDismissedResume &&
      video?.durationSeconds &&
      savedProgress < video.durationSeconds - 20
    ) {
      setShowResumePrompt(true);
    }
  }, [savedProgress, isWatched, hasDismissedResume, video?.durationSeconds]);

  // Filter queue items for Up Next (exclude currently playing video)
  const upNextVideos = React.useMemo(() => {
    if (!queueData?.items) return [];
    return queueData.items.filter(
      (item) => item.id !== video?.id && item.youtubeVideoId !== video?.youtubeVideoId,
    );
  }, [queueData?.items, video?.id, video?.youtubeVideoId]);

  // Replay video from start
  const handleReplay = React.useCallback(() => {
    playerRef.current?.seekTo(0);
    playerRef.current?.play();
  }, []);

  // Skip to Next in Queue
  const handleNextVideo = React.useCallback(() => {
    if (upNextVideos.length > 0 && upNextVideos[0]) {
      router.push(`/watch/${upNextVideos[0].id}`);
    }
  }, [upNextVideos, router]);

  // Page-level Shortcuts (n for next queued video, p for replay)
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      const isInputActive =
        activeTag === "input" ||
        activeTag === "textarea" ||
        Boolean(document.activeElement?.getAttribute("contenteditable"));

      if (isInputActive) {
        return;
      }

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        handleNextVideo();
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        handleReplay();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNextVideo, handleReplay]);

  // Periodic throttled progress save (every 10s while playing)
  const syncProgress = React.useCallback(
    (seconds: number, force = false) => {
      if (!video?.id || !video.library) return; // Only sync for authenticated users
      const floored = Math.floor(seconds);

      if (force || Math.abs(floored - lastSavedTimeRef.current) >= 10) {
        lastSavedTimeRef.current = floored;
        updateMutation.mutate({
          videoId: video.id,
          updates: { progressSeconds: floored },
        });
      }
    },
    [video?.id, video?.library, updateMutation],
  );

  const syncProgressRef = React.useRef(syncProgress);
  syncProgressRef.current = syncProgress;

  // Flush latest playback progress on page unload or component unmount
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      const liveTime = playerRef.current?.getCurrentTime() ?? currentTimeRef.current;
      const currentVideo = videoRef.current;
      if (currentVideo?.id && currentVideo.library && liveTime > 0) {
        const payload = JSON.stringify({ progressSeconds: Math.floor(liveTime) });
        const endpoint = `/api/library/videos/${currentVideo.id}`;
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          navigator.sendBeacon(endpoint, new Blob([payload], { type: "application/json" }));
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      const liveTime = playerRef.current?.getCurrentTime() ?? currentTimeRef.current;
      const currentVideo = videoRef.current;
      if (currentVideo?.id && currentVideo.library && liveTime > 0) {
        syncProgressRef.current(liveTime, true);
      }
    };
  }, []);

  // Time update callback from YouTube player
  const handleTimeUpdate = React.useCallback(
    (current: number, totalDuration: number) => {
      setCurrentTime(current);
      if (totalDuration > 0 && duration === 0) {
        setDuration(totalDuration);
      }

      // Check 90% Watched Heuristic
      if (
        !isWatched &&
        !hasAutoCompletedRef.current &&
        totalDuration > 0 &&
        shouldMarkAsWatched(current, totalDuration)
      ) {
        hasAutoCompletedRef.current = true;
        if (video?.id) {
          updateMutation.mutate({
            videoId: video.id,
            updates: { isWatched: true },
          });
        }
      }

      // Throttled sync
      syncProgress(current);
    },
    [duration, isWatched, video?.id, updateMutation, syncProgress],
  );

  // State change callback from YouTube player
  const handleStateChange = React.useCallback(
    (state: number) => {
      const playing = state === 1; // YT.PlayerState.PLAYING
      setIsPlaying(playing);

      if (!playing && currentTimeRef.current > 0) {
        syncProgress(currentTimeRef.current, true);
      }
    },
    [syncProgress],
  );

  // On Ended: auto-advance if autoplay enabled and queue not empty
  const handleEnded = React.useCallback(() => {
    setIsPlaying(false);
    if (video?.id && !isWatched) {
      updateMutation.mutate({
        videoId: video.id,
        updates: { isWatched: true },
      });
    }

    if (autoplayEnabled && upNextVideos.length > 0) {
      handleNextVideo();
    }
  }, [video?.id, isWatched, autoplayEnabled, upNextVideos.length, handleNextVideo, updateMutation]);

  // Handle Resume action
  const handleResume = () => {
    setShowResumePrompt(false);
    setHasDismissedResume(true);
    playerRef.current?.seekTo(savedProgress);
    playerRef.current?.play();
  };

  // Handle Start Over action
  const handleStartOver = () => {
    setShowResumePrompt(false);
    setHasDismissedResume(true);
    playerRef.current?.seekTo(0);
    playerRef.current?.play();
    if (video?.id) {
      updateMutation.mutate({
        videoId: video.id,
        updates: { progressSeconds: 0 },
      });
    }
  };

  // Save Notes with 1.5s debouncing
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotesContent(val);
    setIsSavingNotes(true);

    if (notesSaveTimeoutRef.current) {
      clearTimeout(notesSaveTimeoutRef.current);
    }

    notesSaveTimeoutRef.current = setTimeout(() => {
      if (video?.id) {
        updateNotesMutation.mutate(
          {
            videoId: video.id,
            content: val,
          },
          {
            onSettled: () => {
              setIsSavingNotes(false);
            },
          },
        );
      } else {
        setIsSavingNotes(false);
      }
    }, 1500);
  };

  // Trigger debounced save
  const triggerAutoSave = React.useCallback(
    (contentToSave: string) => {
      setIsSavingNotes(true);
      if (notesSaveTimeoutRef.current) {
        clearTimeout(notesSaveTimeoutRef.current);
      }
      notesSaveTimeoutRef.current = setTimeout(() => {
        if (video?.id) {
          updateNotesMutation.mutate(
            {
              videoId: video.id,
              content: contentToSave,
            },
            {
              onSettled: () => {
                setIsSavingNotes(false);
              },
            },
          );
        } else {
          setIsSavingNotes(false);
        }
      }, 1500);
    },
    [video?.id, updateNotesMutation],
  );

  // Insert current live timestamp into notes editor at caret position
  const handleInsertTimestamp = () => {
    let liveTime = currentTime;
    try {
      const playerCurrent = playerRef.current?.getCurrentTime();
      if (typeof playerCurrent === "number" && !isNaN(playerCurrent) && playerCurrent > 0) {
        liveTime = playerCurrent;
      }
    } catch {}
    const stamp = `[${formatTime(liveTime)}]`;
    const textarea = textareaRef.current;

    setNotesTab("write");

    if (!textarea) {
      const newContent = `${notesContent ? notesContent + "\n" : ""}${stamp} `;
      setNotesContent(newContent);
      triggerAutoSave(newContent);
      return;
    }

    const start = textarea.selectionStart ?? notesContent.length;
    const end = textarea.selectionEnd ?? notesContent.length;
    const before = notesContent.substring(0, start);
    const after = notesContent.substring(end);
    const insertText = `${before && !before.endsWith("\n") && !before.endsWith(" ") ? " " : ""}${stamp} `;
    const newContent = `${before}${insertText}${after}`;

    setNotesContent(newContent);
    triggerAutoSave(newContent);

    setTimeout(() => {
      textarea.focus();
      const nextPos = start + insertText.length;
      textarea.setSelectionRange(nextPos, nextPos);
    }, 0);
  };

  // Insert markdown formatting helper wrapping selection or inserting placeholder
  const handleInsertMarkdown = (prefix: string, suffix = "") => {
    const textarea = textareaRef.current;
    setNotesTab("write");

    if (!textarea) {
      const newContent = `${notesContent}${prefix}${suffix}`;
      setNotesContent(newContent);
      triggerAutoSave(newContent);
      return;
    }

    const start = textarea.selectionStart ?? notesContent.length;
    const end = textarea.selectionEnd ?? notesContent.length;
    const selectedText = notesContent.substring(start, end);

    let nextStart = start + prefix.length;
    let nextEnd = nextStart;
    let replacement = "";

    if (selectedText) {
      replacement = `${prefix}${selectedText}${suffix}`;
      nextStart = start + prefix.length;
      nextEnd = nextStart + selectedText.length;
    } else {
      replacement = `${prefix}${suffix}`;
      nextStart = start + prefix.length;
      nextEnd = nextStart;
    }

    const newContent =
      notesContent.substring(0, start) +
      replacement +
      notesContent.substring(end);

    setNotesContent(newContent);
    triggerAutoSave(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(nextStart, nextEnd);
    }, 0);
  };

  // Copy full notes as markdown to clipboard
  const handleCopyNotes = () => {
    if (!notesContent) return;
    navigator.clipboard.writeText(notesContent);
    setCopyNotesFeedback(true);
    setTimeout(() => setCopyNotesFeedback(false), 2000);
  };

  // Export notes as a downloadable .md file
  const handleExportNotes = () => {
    if (!notesContent || typeof document === "undefined") return;
    const blob = new Blob([notesContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const sanitizedTitle = (video?.title || "locus-notes")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 50);
    link.href = url;
    link.download = `${sanitizedTitle}-notes.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy shareable Locus link
  const handleCopyShareLink = () => {
    if (typeof window !== "undefined") {
      const shareUrl = window.location.href;
      navigator.clipboard.writeText(shareUrl);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  // Library Action Toggles
  const handleToggleWatched = () => {
    if (!video?.id) return;
    updateMutation.mutate({
      videoId: video.id,
      updates: { isWatched: !isWatched },
    });
  };

  const handleToggleFavorite = () => {
    if (!video?.id) return;
    updateMutation.mutate({
      videoId: video.id,
      updates: { isFavorite: !isFavorite },
    });
  };

  const handleToggleQueue = () => {
    if (!video?.id) return;
    updateMutation.mutate({
      videoId: video.id,
      updates: { isInQueue: !isInQueue },
    });
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="w-full aspect-video bg-surface-2 rounded-lg border-2 border-border animate-pulse flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <div className="mt-6 space-y-3">
            <div className="h-6 bg-surface-2 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-surface-2 rounded w-1/3 animate-pulse" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !video) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <Card className="p-8 sm:p-10 flex flex-col items-center">
            <div className="w-12 h-12 rounded-md bg-destructive/15 text-destructive border-2 border-destructive flex items-center justify-center mb-4 shadow-brutal-sm">
              <Tv className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground m-0 mb-2">
              Video Not Found
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-mono leading-relaxed mb-6">
              The requested video could not be found or has not been synced to Locus yet.
            </p>
            <Button variant="default" size="sm" asChild className="gap-2">
              <Link href="/">
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Feed</span>
              </Link>
            </Button>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div
        className={cn(
          "mx-auto px-3 sm:px-6 py-4 sm:py-6 transition-all duration-300",
          isTheaterMode ? "max-w-[1600px]" : "max-w-7xl",
        )}
      >
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Feed</span>
            <span className="text-border-strong font-normal">/</span>
            <span className="text-foreground truncate max-w-[200px] sm:max-w-md">
              {video.channelName}
            </span>
          </Link>

        </div>

        {/* Main Grid: Player on Left, Collapsible Auxiliary Panel on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Video & Metadata Column */}
          <div
            className={cn(
              "flex flex-col transition-all duration-300",
              activePanel
                ? isNotesExpanded
                  ? "lg:col-span-6"
                  : "lg:col-span-8"
                : "lg:col-span-12",
            )}
          >
            {/* Embedded YouTube Player with Ambient Backdrop Glow & Floating Resume Pill */}
            <div className="relative group">
              <div className="pointer-events-none absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/15 via-accent/10 to-primary/15 blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative">
                <YouTubePlayer
                  ref={playerRef}
                  youtubeVideoId={video.youtubeVideoId}
                  title={video.title}
                  url={video.url}
                  onTimeUpdate={handleTimeUpdate}
                  onStateChange={handleStateChange}
                  onEnded={handleEnded}
                />

                {/* Floating Glassmorphic Resume Overlay (Zero Layout Shift) */}
                {showResumePrompt && (
                  <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 p-2 sm:px-3 rounded-lg bg-surface-1/95 backdrop-blur-md border border-primary/50 shadow-brutal flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                    <span className="text-xs font-mono font-medium text-foreground">
                      Resume from{" "}
                      <strong className="text-primary font-bold">
                        {formatTime(savedProgress)}
                      </strong>
                    </span>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleResume}
                      className="h-6 px-2.5 text-xs font-bold cursor-pointer gap-1 shadow-brutal-sm"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Resume</span>
                    </Button>
                    <button
                      type="button"
                      onClick={handleStartOver}
                      className="text-xs font-mono text-muted-foreground hover:text-foreground underline decoration-dotted px-1 cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResumePrompt(false)}
                      className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-surface-3 transition-colors cursor-pointer"
                      aria-label="Dismiss resume prompt"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Video Meta Info (Title & Unified Single-Row Action Bar) */}
            <div className="mt-4 pb-4 border-b border-border space-y-3">
              {/* Video Title */}
              <h1 className="text-lg sm:text-2xl font-black font-sans tracking-tight text-foreground m-0 leading-snug">
                {video.title}
              </h1>

              {/* Single Streamlined Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* Channel Profile */}
                <div className="flex items-center gap-3 min-w-0">
                  {video.channelThumbnailUrl ? (
                    <img
                      src={video.channelThumbnailUrl}
                      alt={video.channelName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-border-strong shadow-brutal-sm shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-surface-3 border-2 border-border-strong flex items-center justify-center font-bold font-mono text-xs shadow-brutal-sm shrink-0">
                      {video.channelName ? video.channelName[0]?.toUpperCase() : "C"}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-foreground m-0 leading-tight truncate">
                      {video.channelName}
                    </h2>
                    <p className="text-xs font-mono text-muted-foreground m-0 mt-0.5 truncate">
                      Published {video.publishedAt ? formatRelativeTime(video.publishedAt) : "recently"}
                      {video.durationSeconds && (
                        <span> • {formatDuration(video.durationSeconds)}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right Side: Curation Capsule + Studio Companion Capsule + Utility Icons */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                  {/* Personal Curation Capsule */}
                  <div className="h-9 inline-flex items-stretch rounded-md border-2 border-border-strong bg-surface-2 shadow-brutal-sm overflow-hidden divide-x-2 divide-border">
                    {/* Favorite */}
                    <button
                      type="button"
                      onClick={handleToggleFavorite}
                      title={isFavorite ? "Favorited (click to remove)" : "Add to Favorites"}
                      className={cn(
                        "px-3 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none",
                        isFavorite
                          ? "bg-rose-600 text-white"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface-3",
                      )}
                    >
                      <Star
                        className={cn(
                          "w-3.5 h-3.5 stroke-[2.2]",
                          isFavorite && "fill-current text-white",
                        )}
                      />
                      <span className="hidden sm:inline">
                        {isFavorite ? "Favorited" : "Favorite"}
                      </span>
                    </button>

                    {/* Queue */}
                    <button
                      type="button"
                      onClick={handleToggleQueue}
                      title={
                        isInQueue
                          ? "In Queue (click to remove)"
                          : "Add to Watch Later queue"
                      }
                      className={cn(
                        "px-3 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none",
                        isInQueue
                          ? "bg-primary text-primary-foreground font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface-3",
                      )}
                    >
                      <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span className="hidden sm:inline">
                        {isInQueue ? "In Queue" : "Queue"}
                      </span>
                    </button>

                    {/* Watched */}
                    <button
                      type="button"
                      onClick={handleToggleWatched}
                      title={
                        isWatched
                          ? "Watched (click to mark unwatched)"
                          : "Mark video watched"
                      }
                      className={cn(
                        "px-3 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none",
                        isWatched
                          ? "bg-success text-success-foreground font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface-3",
                      )}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span className="hidden sm:inline">
                        {isWatched ? "Watched" : "Mark Watched"}
                      </span>
                    </button>
                  </div>

                  {/* Studio Companion Capsule */}
                  <div className="h-9 inline-flex items-stretch rounded-md border-2 border-border-strong bg-surface-2 shadow-brutal-sm overflow-hidden divide-x-2 divide-border">
                    {/* Notes */}
                    <button
                      type="button"
                      onClick={() =>
                        setActivePanel((prev) => (prev === "notes" ? null : "notes"))
                      }
                      title="Open Notes Studio"
                      className={cn(
                        "px-3 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none",
                        activePanel === "notes"
                          ? "bg-primary text-primary-foreground font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface-3",
                      )}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Notes</span>
                    </button>

                    {/* Chapters (if any) */}
                    {chapters.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setActivePanel((prev) =>
                            prev === "chapters" ? null : "chapters",
                          )
                        }
                        title="Open Video Chapters"
                        className={cn(
                          "px-3 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none",
                          activePanel === "chapters"
                            ? "bg-primary text-primary-foreground font-bold"
                            : "text-muted-foreground hover:text-foreground hover:bg-surface-3",
                        )}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Chapters</span>
                        <span className="text-[11px] font-mono opacity-80 font-normal">
                          ({chapters.length})
                        </span>
                      </button>
                    )}

                    {/* Queue */}
                    <button
                      type="button"
                      onClick={() =>
                        setActivePanel((prev) =>
                          prev === "upNext" ? null : "upNext",
                        )
                      }
                      title="Open Queue"
                      className={cn(
                        "px-3 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none",
                        activePanel === "upNext"
                          ? "bg-primary text-primary-foreground font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface-3",
                      )}
                    >
                      <ListVideo className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Queue</span>
                      <span className="text-[11px] font-mono opacity-80 font-normal">
                        ({upNextVideos.length})
                      </span>
                    </button>
                  </div>

                  {/* Quick Cinema Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsTheaterMode(!isTheaterMode)}
                    className={cn(
                      "h-9 w-9 rounded-md border-2 border-border-strong shadow-brutal-sm transition-all cursor-pointer flex items-center justify-center shrink-0 select-none",
                      isTheaterMode
                        ? "bg-foreground text-background"
                        : "bg-surface-2 text-muted-foreground hover:text-foreground hover:bg-surface-3",
                    )}
                    title={
                      isTheaterMode ? "Exit Cinema / Wide Mode" : "Cinema / Wide Mode"
                    }
                    aria-label="Toggle Cinema Mode"
                  >
                    {isTheaterMode ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>

                  {/* Overflow Utilities Dropdown (•••) */}
                  <div className="relative" ref={actionsRef}>
                    <button
                      type="button"
                      onClick={() => setIsActionsOpen(!isActionsOpen)}
                      className={cn(
                        "h-9 w-9 rounded-md border-2 border-border-strong shadow-brutal-sm transition-all cursor-pointer flex items-center justify-center shrink-0 select-none",
                        isActionsOpen
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-surface-2 text-muted-foreground hover:text-foreground hover:bg-surface-3",
                      )}
                      title="More playback actions & utilities"
                      aria-expanded={isActionsOpen}
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {isActionsOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 rounded-md bg-surface-1 border-2 border-border-strong shadow-brutal-lg p-1.5 z-30 animate-in fade-in zoom-in-95 space-y-1">
                        {/* Replay */}
                        <button
                          type="button"
                          onClick={() => {
                            handleReplay();
                            setIsActionsOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-mono rounded hover:bg-surface-2 hover:text-foreground text-muted-foreground flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Replay from Start (P)</span>
                        </button>

                        {/* Next in Queue */}
                        <button
                          type="button"
                          onClick={() => {
                            handleNextVideo();
                            setIsActionsOpen(false);
                          }}
                          disabled={upNextVideos.length === 0}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-mono rounded hover:bg-surface-2 hover:text-foreground text-muted-foreground flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <SkipForward className="w-3.5 h-3.5" />
                          <span>Next in Queue (N)</span>
                        </button>

                        {/* Autoplay Toggle */}
                        <button
                          type="button"
                          onClick={() => setAutoplayEnabled(!autoplayEnabled)}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-mono rounded hover:bg-surface-2 hover:text-foreground text-muted-foreground flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Autoplay Next</span>
                          </div>
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-bold font-mono",
                              autoplayEnabled
                                ? "bg-primary text-primary-foreground"
                                : "bg-surface-3 text-muted-foreground",
                            )}
                          >
                            {autoplayEnabled ? "ON" : "OFF"}
                          </span>
                        </button>

                        <div className="h-px bg-border my-1" />

                        {/* Share Link */}
                        <button
                          type="button"
                          onClick={() => {
                            handleCopyShareLink();
                            setTimeout(() => setIsActionsOpen(false), 800);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-mono rounded hover:bg-surface-2 hover:text-foreground text-muted-foreground flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            {copyFeedback ? (
                              <Check className="w-3.5 h-3.5 text-success" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5" />
                            )}
                            <span>Share Link</span>
                          </div>
                          {copyFeedback && (
                            <span className="text-[10px] text-success font-bold font-mono">
                              Copied!
                            </span>
                          )}
                        </button>

                        {/* Open on YouTube */}
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsActionsOpen(false)}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-mono rounded hover:bg-surface-2 hover:text-foreground text-muted-foreground flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open on YouTube</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Video Description Surface */}
            {video.description && (
              <div className="mt-4 p-4 rounded-lg bg-surface-1/70 backdrop-blur-sm border border-border hover:border-border-strong transition-colors shadow-brutal-sm">
                <div className="flex items-center justify-between text-xs font-bold text-foreground mb-2">
                  <div className="flex items-center gap-2">
                    <span>About this video</span>
                    {chapters.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActivePanel("chapters")}
                        className="text-[11px] font-mono font-normal text-primary hover:underline cursor-pointer"
                      >
                        • {chapters.length} chapters available in Studio
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                    className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer select-none"
                  >
                    <span>{descriptionExpanded ? "Show less" : "Show more"}</span>
                    {descriptionExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div
                  className={cn(
                    "text-xs leading-relaxed text-muted-foreground font-sans whitespace-pre-wrap break-words transition-all duration-200",
                    !descriptionExpanded && "line-clamp-3",
                  )}
                >
                  {video.description}
                </div>
              </div>
            )}
          </div>

          {/* Right-Side Auxiliary Panel (Up Next or Notes) */}
          {activePanel && (
            <div
              className={cn(
                "rounded-lg border-2 border-border bg-surface-1 shadow-brutal flex flex-col h-[700px] overflow-hidden sticky top-20 animate-in fade-in transition-all duration-300",
                isNotesExpanded ? "lg:col-span-6" : "lg:col-span-4",
              )}
            >
              {/* Unified Studio Rail Header */}
              <div className="p-2 border-b-2 border-border bg-surface-2 flex items-center justify-between gap-2">
                <div className="flex items-center bg-surface-1 p-0.5 rounded border border-border">
                  <button
                    type="button"
                    onClick={() => setActivePanel("notes")}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-sm transition-all cursor-pointer select-none",
                      activePanel === "notes"
                        ? "bg-primary text-primary-foreground shadow-brutal-sm font-bold"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Notes</span>
                  </button>

                  {chapters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActivePanel("chapters")}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-sm transition-all cursor-pointer select-none",
                        activePanel === "chapters"
                          ? "bg-primary text-primary-foreground shadow-brutal-sm font-bold"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Chapters ({chapters.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActivePanel("upNext")}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-sm transition-all cursor-pointer select-none",
                      activePanel === "upNext"
                        ? "bg-primary text-primary-foreground shadow-brutal-sm font-bold"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <ListVideo className="w-3.5 h-3.5" />
                    <span>Queue ({upNextVideos.length})</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {/* Expand / Split Studio Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors cursor-pointer"
                    aria-label={isNotesExpanded ? "Collapse studio" : "Expand to 50/50 split studio"}
                    title={isNotesExpanded ? "Collapse to standard sidebar" : "Expand to 50/50 split studio"}
                  >
                    {isNotesExpanded ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Close Studio Rail */}
                  <button
                    type="button"
                    onClick={() => {
                      setActivePanel(null);
                      setIsNotesExpanded(false);
                    }}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors cursor-pointer"
                    aria-label="Close studio panel"
                    title="Close studio panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Panel Body: Up Next */}
              {activePanel === "upNext" && (
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {upNextVideos.length > 0 ? (
                    upNextVideos.map((item, index) => (
                      <Link
                        key={item.id}
                        href={`/watch/${item.id}`}
                        className="group flex gap-2.5 p-2 rounded-md border border-border/60 bg-surface-2 hover:bg-surface-3 hover:border-border-strong transition-all duration-150"
                      >
                        {/* Thumbnail */}
                        <div className="relative w-24 aspect-video rounded overflow-hidden bg-black shrink-0 border border-border">
                          {item.thumbnailUrl && (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1 rounded bg-black/80 text-white">
                            {formatDuration(item.durationSeconds)}
                          </span>
                        </div>

                        {/* Title & Channel */}
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-xs font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                            {item.title}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate mt-1">
                            {item.channelName}
                          </span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                      <Clock className="w-8 h-8 text-muted-foreground/50 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-bold text-foreground m-0">
                        Queue is empty
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono mt-1 mb-4">
                        Click &ldquo;Add to Queue&rdquo; on any video card to line up videos next.
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/">Browse Feed</Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Panel Body: Video Chapters */}
              {activePanel === "chapters" && (
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mb-1 px-1">
                    <span>{chapters.length} timeline chapters</span>
                    <span>Click to jump</span>
                  </div>
                  {chapters.length > 0 ? (
                    chapters.map((ch, idx) => {
                      const nextTime =
                        idx < chapters.length - 1
                          ? chapters[idx + 1]!.timeSeconds
                          : Infinity;
                      const isCurrentChapter =
                        currentTime >= ch.timeSeconds && currentTime < nextTime;

                      return (
                        <button
                          key={`${ch.timeSeconds}-${idx}`}
                          type="button"
                          onClick={() => {
                            playerRef.current?.seekTo(ch.timeSeconds);
                            playerRef.current?.play();
                          }}
                          className={cn(
                            "w-full text-left p-2.5 rounded-md border transition-all cursor-pointer flex items-center justify-between gap-3 group select-none",
                            isCurrentChapter
                              ? "bg-primary/10 border-primary text-foreground shadow-brutal-sm"
                              : "bg-surface-2 hover:bg-surface-3 border-border text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-xs font-mono font-bold shrink-0",
                                isCurrentChapter
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-surface-1 border border-border text-primary group-hover:bg-primary group-hover:text-primary-foreground",
                              )}
                            >
                              {ch.timeLabel}
                            </span>
                            <span
                              className={cn(
                                "text-xs font-medium truncate",
                                isCurrentChapter
                                  ? "font-bold text-foreground"
                                  : "text-muted-foreground group-hover:text-foreground",
                              )}
                            >
                              {ch.title}
                            </span>
                          </div>
                          {isCurrentChapter && (
                            <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-primary shrink-0">
                              <Play className="w-2.5 h-2.5 fill-current animate-pulse" />
                              <span className="hidden sm:inline">Playing</span>
                            </div>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                      <Sparkles className="w-8 h-8 text-muted-foreground/50 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-bold text-foreground m-0">
                        No chapters found
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono mt-1">
                        This video description does not contain timestamp chapters.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Panel Body: Private Markdown Notes */}
              {activePanel === "notes" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Notes Toolbar */}
                  <div className="p-2 border-b border-border bg-surface-2 flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      {/* Bold */}
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleInsertMarkdown("**", "**")}
                        className="p-1.5 rounded hover:bg-surface-3 cursor-pointer text-muted-foreground hover:text-foreground"
                        title="Bold (**text**)"
                      >
                        <Bold className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>

                      {/* Italic */}
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleInsertMarkdown("*", "*")}
                        className="p-1.5 rounded hover:bg-surface-3 cursor-pointer text-muted-foreground hover:text-foreground"
                        title="Italic (*text*)"
                      >
                        <Italic className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>

                      {/* Heading */}
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleInsertMarkdown("## ")}
                        className="p-1.5 rounded hover:bg-surface-3 cursor-pointer text-muted-foreground hover:text-foreground"
                        title="Heading 2 (## Title)"
                      >
                        <Heading2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>

                      {/* Bullet List */}
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleInsertMarkdown("- ")}
                        className="p-1.5 rounded hover:bg-surface-3 cursor-pointer text-muted-foreground hover:text-foreground"
                        title="Bullet List (- Item)"
                      >
                        <List className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>

                      {/* Code Block */}
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleInsertMarkdown("```\n", "\n```")}
                        className="p-1.5 rounded hover:bg-surface-3 cursor-pointer text-muted-foreground hover:text-foreground"
                        title="Code Block (```)"
                      >
                        <Code className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>

                      {/* Insert Live Timestamp Button */}
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleInsertTimestamp}
                        className="ml-1 p-1 px-2.5 rounded text-xs font-mono font-bold bg-primary/15 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer flex items-center gap-1.5 shadow-brutal-sm select-none"
                        title="Capture current video timestamp"
                      >
                        <Clock className="w-3 h-3 stroke-[2.5]" />
                        <span>+ ⏱ {formatTime(currentTime)}</span>
                      </button>
                    </div>

                    {/* Mode Toggle: Write vs Preview */}
                    <div className="flex items-center gap-1">
                      {/* Copy Notes */}
                      <button
                        type="button"
                        onClick={handleCopyNotes}
                        disabled={!notesContent.trim()}
                        className="p-1 px-2 rounded text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1"
                        title="Copy raw markdown to clipboard"
                      >
                        {copyNotesFeedback ? (
                          <>
                            <Check className="w-3 h-3 text-success" />
                            <span className="text-success text-[10px] font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span className="hidden sm:inline">Copy</span>
                          </>
                        )}
                      </button>

                      {/* Export .md */}
                      <button
                        type="button"
                        onClick={handleExportNotes}
                        disabled={!notesContent.trim()}
                        className="p-1 px-2 rounded text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1"
                        title="Export notes as a .md file"
                      >
                        <Download className="w-3 h-3" />
                        <span className="hidden sm:inline">Export</span>
                      </button>

                      <div className="flex items-center border border-border rounded overflow-hidden ml-1">
                        <button
                          type="button"
                          onClick={() => setNotesTab("write")}
                          className={cn(
                            "px-2.5 py-0.5 text-xs font-mono transition-colors cursor-pointer select-none",
                            notesTab === "write"
                              ? "bg-primary text-primary-foreground font-bold"
                              : "bg-surface-1 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          Write
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotesTab("preview")}
                          className={cn(
                            "px-2.5 py-0.5 text-xs font-mono transition-colors cursor-pointer select-none",
                            notesTab === "preview"
                              ? "bg-primary text-primary-foreground font-bold"
                              : "bg-surface-1 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          Preview
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Notes Editor or Interactive Preview */}
                  <div className="flex-1 p-3.5 overflow-y-auto">
                    {notesTab === "write" ? (
                      <textarea
                        ref={textareaRef}
                        value={notesContent}
                        onChange={handleNotesChange}
                        placeholder="Write structured engineering notes... Use Markdown, or click '+ ⏱' to capture exact video moments."
                        className="w-full h-full resize-none bg-transparent text-xs sm:text-sm font-mono text-foreground focus:outline-none placeholder:text-muted-foreground/60 leading-relaxed"
                      />
                    ) : (
                      <MarkdownRenderer
                        content={notesContent}
                        onSeek={(seconds) => {
                          playerRef.current?.seekTo(seconds);
                          playerRef.current?.play();
                        }}
                      />
                    )}
                  </div>

                  {/* Notes Footer / Stats & Autosave Status */}
                  <div className="p-2 px-3 border-t border-border bg-surface-2 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <span>
                        {notesContent.trim()
                          ? notesContent.trim().split(/\s+/).length
                          : 0}{" "}
                        words
                      </span>
                      <span>•</span>
                      <span>
                        {(
                          notesContent.match(
                            /\[\d{1,2}:\d{2}(?::\d{2})?\]|\b\d{1,2}:\d{2}(?::\d{2})?\b/g,
                          ) || []
                        ).length}{" "}
                        stamps
                      </span>
                    </span>

                    <span>
                      {isSavingNotes ? (
                        <span className="flex items-center gap-1 text-primary">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Saving...
                        </span>
                      ) : (
                        <span className="text-success flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Saved
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

