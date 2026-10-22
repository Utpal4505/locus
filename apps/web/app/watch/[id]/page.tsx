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
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  FileText,
  ListVideo,
  X,
  Check,
  Loader2,
  Sparkles,
  Tv,
  ArrowLeft,
  Volume2,
  VolumeX,
  Maximize,
  SlidersHorizontal,
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


export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = typeof params?.id === "string" ? params.id : "";

  const { data: video, isLoading, error } = useVideoQuery(videoId);
  const { data: queueData } = useLibraryQuery("queue");
  const updateMutation = useUpdateVideoLibraryStateMutation();

  const { data: notesData } = useVideoNotesQuery(
    video?.id ?? "",
    Boolean(video?.id && video?.library),
  );
  const updateNotesMutation = useUpdateVideoNotesMutation();

  const playerRef = React.useRef<YouTubePlayerRef>(null);

  // Player & Time state
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = React.useState(false);
  const [volume, setVolume] = React.useState(100);
  const [isMuted, setIsMuted] = React.useState(false);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [controlsMode, setControlsMode] = React.useState<"locus" | "native">("locus");

  // Scrubber hover state
  const [hoverTime, setHoverTime] = React.useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = React.useState<number>(0);
  const scrubberRef = React.useRef<HTMLDivElement>(null);

  // Resume prompt state
  const [showResumePrompt, setShowResumePrompt] = React.useState(false);
  const [hasDismissedResume, setHasDismissedResume] = React.useState(false);

  // Active side panel: null | "upNext" | "notes"
  const [activePanel, setActivePanel] = React.useState<"upNext" | "notes" | null>(
    null,
  );

  // Secondary actions dropdown & copy feedback
  const [isActionsOpen, setIsActionsOpen] = React.useState(false);
  const [copyFeedback, setCopyFeedback] = React.useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = React.useState(false);

  // Notes state
  const [notesContent, setNotesContent] = React.useState("");
  const [notesTab, setNotesTab] = React.useState<"write" | "preview">("write");
  const [isSavingNotes, setIsSavingNotes] = React.useState(false);
  const notesSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Progress sync tracking
  const lastSavedTimeRef = React.useRef(0);
  const hasAutoCompletedRef = React.useRef(false);

  // Initialize library state
  const isWatched = Boolean(video?.library?.isWatched);
  const isFavorite = Boolean(video?.library?.isFavorite);
  const isInQueue = Boolean(video?.library?.isInQueue);
  const savedProgress = video?.library?.progressSeconds ?? 0;

  // Sync initial notes from API
  React.useEffect(() => {
    if (notesData?.content !== undefined) {
      setNotesContent(notesData.content || "");
    }
  }, [notesData?.content]);

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

  // Total duration calculation for timeline & scrubber
  const totalDuration = duration || video?.durationSeconds || 0;
  const progressPercent =
    totalDuration > 0
      ? Math.min(100, Math.max(0, (currentTime / totalDuration) * 100))
      : 0;

  // Handle Scrubber Interaction
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || totalDuration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const targetSeconds = (clickX / rect.width) * totalDuration;
    setCurrentTime(targetSeconds);
    playerRef.current?.seekTo(targetSeconds);
  };

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || totalDuration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const hoverX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const targetSeconds = (hoverX / rect.width) * totalDuration;
    setHoverTime(targetSeconds);
    setHoverPercent((hoverX / rect.width) * 100);
  };

  const handleScrubberMouseLeave = () => {
    setHoverTime(null);
  };

  // Handle Play/Pause
  const togglePlayPause = React.useCallback(() => {
    if (isPlaying) {
      playerRef.current?.pause();
    } else {
      playerRef.current?.play();
    }
  }, [isPlaying]);

  // Replay
  const handleReplay = React.useCallback(() => {
    playerRef.current?.replay();
  }, []);

  // Skip to Next in Queue
  const handleNextVideo = React.useCallback(() => {
    if (upNextVideos.length > 0 && upNextVideos[0]) {
      router.push(`/watch/${upNextVideos[0].id}`);
    }
  }, [upNextVideos, router]);

  // Keyboard Shortcuts (Space/k, ArrowLeft/j, ArrowRight/l, n, p, m, f)
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

      if (e.key === " " || e.key === "k" || e.key === "K") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === "ArrowLeft" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        const delta = e.key === "ArrowLeft" ? -5 : -10;
        playerRef.current?.seekRelative(delta);
      } else if (e.key === "ArrowRight" || e.key === "l" || e.key === "L") {
        e.preventDefault();
        const delta = e.key === "ArrowRight" ? 5 : 10;
        playerRef.current?.seekRelative(delta);
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        handleNextVideo();
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        playerRef.current?.replay();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        playerRef.current?.toggleMute();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        playerRef.current?.requestFullscreen();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause, handleNextVideo]);

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

  // Time update callback from YouTube player
  const handleTimeUpdate = (current: number, totalDuration: number) => {
    setCurrentTime(current);
    if (totalDuration > 0 && duration === 0) {
      setDuration(totalDuration);
    }

    // Check 90% / 15s Watched Heuristic
    if (
      !isWatched &&
      !hasAutoCompletedRef.current &&
      totalDuration > 0 &&
      shouldMarkAsWatched(current, totalDuration)
    ) {
      hasAutoCompletedRef.current = true;
      if (video?.id && video.library) {
        updateMutation.mutate({
          videoId: video.id,
          updates: { isWatched: true },
        });
      }
    }

    // Throttled sync
    syncProgress(current);
  };

  // State change callback from YouTube player
  const handleStateChange = (state: number) => {
    const playing = state === 1; // YT.PlayerState.PLAYING
    setIsPlaying(playing);

    if (!playing && currentTime > 0) {
      syncProgress(currentTime, true);
    }
  };

  // On Ended: auto-advance if autoplay enabled and queue not empty
  const handleEnded = () => {
    setIsPlaying(false);
    if (video?.id && video.library && !isWatched) {
      updateMutation.mutate({
        videoId: video.id,
        updates: { isWatched: true },
      });
    }

    if (autoplayEnabled && upNextVideos.length > 0) {
      handleNextVideo();
    }
  };

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
    if (video?.id && video.library) {
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
      if (video?.id && video.library) {
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
        if (video?.id && video.library) {
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
    [video?.id, video?.library, updateNotesMutation],
  );

  // Insert current live timestamp into notes editor at caret position
  const handleInsertTimestamp = () => {
    const liveTime = playerRef.current?.getCurrentTime() ?? currentTime;
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
    const fallbackText = prefix === "## " ? "Heading" : prefix === "- " ? "List item" : "text";
    const replacement = `${prefix}${selectedText || fallbackText}${suffix}`;
    const newContent =
      notesContent.substring(0, start) +
      replacement +
      notesContent.substring(end);

    setNotesContent(newContent);
    triggerAutoSave(newContent);

    setTimeout(() => {
      textarea.focus();
      const selectionStart = start + prefix.length;
      const selectionEnd = selectionStart + (selectedText ? selectedText.length : fallbackText.length);
      textarea.setSelectionRange(selectionStart, selectionEnd);
    }, 0);
  };

  // Volume, Speed, and Fullscreen Handlers
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = Number(e.target.value);
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
      playerRef.current?.toggleMute();
    }
    playerRef.current?.setVolume?.(newVol);
  };

  const handleToggleMute = () => {
    playerRef.current?.toggleMute();
    setIsMuted((prev) => !prev);
  };

  const handleCycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 1.75, 2, 0.75];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length] ?? 1;
    setPlaybackRate(nextSpeed);
    playerRef.current?.setPlaybackRate?.(nextSpeed);
  };

  const handleFullscreen = () => {
    playerRef.current?.requestFullscreen();
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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Main Grid: Player on Left, Collapsible Auxiliary Panel on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Video & Metadata Column */}
          <div
            className={cn(
              "flex flex-col transition-all duration-200",
              activePanel ? "lg:col-span-8" : "lg:col-span-12",
            )}
          >
            {/* Embedded YouTube Player */}
            <YouTubePlayer
              ref={playerRef}
              youtubeVideoId={video.youtubeVideoId}
              title={video.title}
              url={video.url}
              controlsMode={controlsMode}
              onTimeUpdate={handleTimeUpdate}
              onStateChange={handleStateChange}
              onEnded={handleEnded}
            />

            {/* Resume Playback Prompt Banner */}
            {showResumePrompt && (
              <div className="mt-3 p-3.5 rounded-md bg-surface-2 border-2 border-primary shadow-brutal-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                  <p className="text-xs sm:text-sm font-medium text-foreground m-0">
                    You previously left off at{" "}
                    <span className="font-mono font-bold text-primary">
                      {formatTime(savedProgress)}
                    </span>
                    .
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleResume}
                    className="h-8 text-xs font-bold cursor-pointer"
                  >
                    Resume at {formatTime(savedProgress)}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartOver}
                    className="h-8 text-xs font-mono cursor-pointer"
                  >
                    Start Over
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowResumePrompt(false)}
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Dismiss resume prompt"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Scrubbable Progress Bar: Rendered in Locus mode as the single progress bar */}
            {controlsMode === "locus" && (
              <div className="mt-3 px-1 group/scrubber relative">
                <div
                  role="slider"
                  aria-label="Seek video progress"
                  aria-valuemin={0}
                  aria-valuemax={totalDuration}
                  aria-valuenow={currentTime}
                  tabIndex={0}
                  ref={scrubberRef}
                  onClick={handleScrubberClick}
                  onMouseMove={handleScrubberMouseMove}
                  onMouseLeave={handleScrubberMouseLeave}
                  className="relative w-full h-4 flex items-center cursor-pointer select-none"
                >
                  {/* Track Background */}
                  <div className="w-full h-2 group-hover/scrubber:h-3 bg-surface-2 border border-border-strong rounded-full overflow-hidden transition-all duration-150 relative">
                    {/* Played Fill */}
                    <div
                      className="h-full bg-primary transition-all duration-75"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Scrub Thumb Knob */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-2 border-black shadow-brutal-sm scale-0 group-hover/scrubber:scale-100 transition-transform duration-150 pointer-events-none"
                    style={{ left: `${progressPercent}%` }}
                  />

                  {/* Hover Timestamp Tooltip */}
                  {hoverTime !== null && (
                    <div
                      className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 border border-white/20 text-[10px] font-mono font-bold text-white shadow-brutal-sm pointer-events-none select-none z-20"
                      style={{ left: `${hoverPercent}%` }}
                    >
                      {formatTime(hoverTime)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Player Transport Bar */}
            <div className="mt-2 p-2.5 rounded-md bg-surface-1 border-2 border-border shadow-brutal-sm flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Previous Video */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => playerRef.current?.seekTo(0)}
                  title="Restart video (p)"
                  className="h-8 px-2.5 cursor-pointer"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </Button>

                {/* Play / Pause Toggle */}
                <Button
                  variant="default"
                  size="sm"
                  onClick={togglePlayPause}
                  className="h-8 px-3 gap-1.5 cursor-pointer font-bold"
                  title="Play/Pause (Space or k)"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span className="text-xs">Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span className="text-xs">Play</span>
                    </>
                  )}
                </Button>

                {/* Replay */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReplay}
                  title="Replay from start"
                  className="h-8 px-2.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>

                {/* Next in Queue */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextVideo}
                  disabled={upNextVideos.length === 0}
                  title={
                    upNextVideos.length > 0
                      ? `Next: ${upNextVideos[0]?.title} (n)`
                      : "Queue is empty"
                  }
                  className="h-8 px-2.5 cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </Button>

                {/* Current Time Display */}
                <span className="ml-1 font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {formatTime(currentTime)} / {formatTime(duration || video.durationSeconds || 0)}
                </span>
              </div>

              {/* Center / Right Deck: Volume, Speed, Fullscreen, Mode, Autoplay */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Volume Slider & Mute Toggle */}
                <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-2 border border-border rounded h-8">
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                    title={isMuted ? "Unmute (m)" : "Mute (m)"}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 text-destructive" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-14 sm:w-16 h-1.5 accent-primary cursor-pointer"
                    aria-label="Volume slider"
                  />
                </div>

                {/* Playback Speed Selector */}
                <button
                  type="button"
                  onClick={handleCycleSpeed}
                  className="h-8 px-2 rounded text-xs font-mono font-bold bg-surface-2 border border-border hover:bg-surface-3 cursor-pointer select-none"
                  title="Playback speed"
                  aria-label="Change playback speed"
                >
                  {playbackRate}x
                </button>

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={handleFullscreen}
                  className="h-8 w-8 rounded flex items-center justify-center bg-surface-2 border border-border hover:bg-surface-3 cursor-pointer text-muted-foreground hover:text-foreground"
                  title="Fullscreen (f)"
                  aria-label="Fullscreen"
                >
                  <Maximize className="w-3.5 h-3.5" />
                </button>

                {/* Player Mode Switcher (Locus Distraction-Free vs Native YouTube) */}
                <button
                  type="button"
                  onClick={() =>
                    setControlsMode((prev) => (prev === "locus" ? "native" : "locus"))
                  }
                  className={cn(
                    "h-8 px-2.5 rounded text-xs font-mono font-medium border transition-all cursor-pointer flex items-center gap-1.5",
                    controlsMode === "locus"
                      ? "bg-surface-2 text-muted-foreground border-border hover:text-foreground"
                      : "bg-primary text-primary-foreground border-primary shadow-brutal-sm font-bold",
                  )}
                  title={
                    controlsMode === "locus"
                      ? "Using single Locus scrubber (click to switch to native YouTube controls)"
                      : "Using native YouTube controls (click for distraction-free Locus deck)"
                  }
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span className="hidden sm:inline">
                    {controlsMode === "locus" ? "Locus Player" : "YT Player"}
                  </span>
                </button>

                {/* Autoplay Queued Toggle */}
                <button
                  type="button"
                  onClick={() => setAutoplayEnabled(!autoplayEnabled)}
                  className={cn(
                    "h-8 px-2.5 rounded text-xs font-mono font-medium border transition-all cursor-pointer flex items-center gap-1.5",
                    autoplayEnabled
                      ? "bg-primary text-primary-foreground border-primary shadow-brutal-sm font-bold"
                      : "bg-surface-2 text-muted-foreground border-border hover:text-foreground",
                  )}
                  title="Autoplay next queued video on complete"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Autoplay Next: {autoplayEnabled ? "ON" : "OFF"}</span>
                </button>
              </div>
            </div>

            {/* Video Meta Info (Title, Channel, Date) */}
            <div className="mt-4 pb-4 border-b-2 border-border">
              <h1 className="text-lg sm:text-2xl font-black font-sans tracking-tight text-foreground m-0 mb-3 leading-snug">
                {video.title}
              </h1>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Channel Meta */}
                <div className="flex items-center gap-3">
                  {video.channelThumbnailUrl ? (
                    <img
                      src={video.channelThumbnailUrl}
                      alt={video.channelName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-border-strong"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-surface-3 border-2 border-border-strong flex items-center justify-center font-bold text-xs">
                      {video.channelName ? video.channelName[0]?.toUpperCase() : "C"}
                    </div>
                  )}

                  <div>
                    <h2 className="text-sm font-bold text-foreground m-0">
                      {video.channelName}
                    </h2>
                    <p className="text-xs font-mono text-muted-foreground m-0 mt-0.5">
                      Published {video.publishedAt ? formatRelativeTime(video.publishedAt) : "recently"}
                      {video.durationSeconds && (
                        <span> • {formatDuration(video.durationSeconds)}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Primary Action Toolbar */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Watched Button */}
                  <Button
                    variant={isWatched ? "default" : "outline"}
                    size="sm"
                    onClick={handleToggleWatched}
                    className={cn(
                      "h-8 text-xs gap-1.5 cursor-pointer font-bold",
                      isWatched && "bg-success text-success-foreground border-success hover:bg-success/90",
                    )}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{isWatched ? "Watched" : "Mark Watched"}</span>
                  </Button>

                  {/* Favorite Button */}
                  <Button
                    variant={isFavorite ? "default" : "outline"}
                    size="sm"
                    onClick={handleToggleFavorite}
                    className={cn(
                      "h-8 text-xs gap-1.5 cursor-pointer font-bold",
                      isFavorite &&
                        "bg-rose-600 text-white border-rose-600 hover:bg-rose-700 shadow-brutal-sm",
                    )}
                  >
                    <Star
                      className={cn(
                        "w-3.5 h-3.5 stroke-[2.2]",
                        isFavorite && "fill-current text-white",
                      )}
                    />
                    <span>{isFavorite ? "Favorited" : "Favorite"}</span>
                  </Button>

                  {/* Queue Toggle Button */}
                  <Button
                    variant={isInQueue ? "default" : "outline"}
                    size="sm"
                    onClick={handleToggleQueue}
                    className={cn(
                      "h-8 text-xs gap-1.5 cursor-pointer font-bold",
                      isInQueue &&
                        "bg-primary text-primary-foreground border-primary shadow-brutal-sm",
                    )}
                  >
                    <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>{isInQueue ? "In Queue" : "Add to Queue"}</span>
                  </Button>

                  {/* Panel Switchers: Up Next & Notes */}
                  <Button
                    variant={activePanel === "upNext" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setActivePanel((prev) => (prev === "upNext" ? null : "upNext"))
                    }
                    className="h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    <ListVideo className="w-3.5 h-3.5" />
                    <span>Up Next ({upNextVideos.length})</span>
                  </Button>

                  <Button
                    variant={activePanel === "notes" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setActivePanel((prev) => (prev === "notes" ? null : "notes"))
                    }
                    className="h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Notes</span>
                  </Button>

                  {/* Secondary Action Dropdown */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsActionsOpen(!isActionsOpen)}
                      className="h-8 px-2.5 cursor-pointer"
                      title="More actions"
                    >
                      <span>•••</span>
                    </Button>

                    {isActionsOpen && (
                      <div className="absolute right-0 top-full mt-1 w-52 rounded-md bg-surface-1 border-2 border-border shadow-brutal p-1.5 z-30 animate-in fade-in">
                        <button
                          type="button"
                          onClick={() => {
                            handleCopyShareLink();
                            setIsActionsOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded text-xs font-medium text-foreground hover:bg-surface-2 flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Share2 className="w-3.5 h-3.5 text-primary" />
                            <span>Share Locus Link</span>
                          </div>
                          {copyFeedback && (
                            <Check className="w-3.5 h-3.5 text-success" />
                          )}
                        </button>

                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsActionsOpen(false)}
                          className="w-full text-left px-2.5 py-1.5 rounded text-xs font-medium text-foreground hover:bg-surface-2 flex items-center gap-2 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Open on YouTube</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Video Description Accordion */}
            {video.description && (
              <div className="mt-4 p-4 rounded-md bg-surface-1 border-2 border-border shadow-brutal-sm">
                <button
                  type="button"
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  className="w-full flex items-center justify-between text-xs font-bold text-foreground cursor-pointer select-none"
                >
                  <span>Description</span>
                  {descriptionExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                <div
                  className={cn(
                    "text-xs leading-relaxed text-muted-foreground font-mono whitespace-pre-wrap break-words transition-all duration-200 mt-2",
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
            <div className="lg:col-span-4 rounded-lg border-2 border-border bg-surface-1 shadow-brutal flex flex-col h-[650px] overflow-hidden sticky top-20 animate-in fade-in">
              {/* Panel Header */}
              <div className="p-3 border-b-2 border-border bg-surface-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {activePanel === "upNext" ? (
                    <>
                      <ListVideo className="w-4 h-4 text-primary" />
                      <span className="text-xs sm:text-sm font-bold text-foreground">
                        Up Next in Queue ({upNextVideos.length})
                      </span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-xs sm:text-sm font-bold text-foreground">
                        Private Video Notes
                      </span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setActivePanel(null)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors cursor-pointer"
                  aria-label="Close panel"
                >
                  <X className="w-4 h-4" />
                </button>
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

              {/* Panel Body: Private Markdown Notes */}
              {activePanel === "notes" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Notes Toolbar */}
                  <div className="p-2 border-b border-border bg-surface-2 flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown("**", "**")}
                        className="p-1 px-1.5 rounded text-xs font-bold hover:bg-surface-3 cursor-pointer"
                        title="Bold"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown("*", "*")}
                        className="p-1 px-1.5 rounded text-xs italic hover:bg-surface-3 cursor-pointer"
                        title="Italic"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown("## ")}
                        className="p-1 px-1.5 rounded text-xs font-bold hover:bg-surface-3 cursor-pointer"
                        title="Heading"
                      >
                        H2
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown("- ")}
                        className="p-1 px-1.5 rounded text-xs hover:bg-surface-3 cursor-pointer"
                        title="Bullet List"
                      >
                        • List
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown("```\n", "\n```")}
                        className="p-1 px-1.5 rounded text-xs font-mono hover:bg-surface-3 cursor-pointer"
                        title="Code Block"
                      >
                        &lt;/&gt;
                      </button>

                      {/* Insert Timestamp Button */}
                      <button
                        type="button"
                        onClick={handleInsertTimestamp}
                        className="ml-1 p-1 px-2 rounded text-xs font-mono font-bold bg-primary/15 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                        title="Insert current video timestamp"
                      >
                        + ⏱ {formatTime(playerRef.current?.getCurrentTime() || currentTime)}
                      </button>
                    </div>

                    {/* Mode Toggle: Write vs Preview */}
                    <div className="flex items-center border border-border rounded overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setNotesTab("write")}
                        className={cn(
                          "px-2 py-0.5 text-xs font-mono transition-colors cursor-pointer",
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
                          "px-2 py-0.5 text-xs font-mono transition-colors cursor-pointer",
                          notesTab === "preview"
                            ? "bg-primary text-primary-foreground font-bold"
                            : "bg-surface-1 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        Preview
                      </button>
                    </div>
                  </div>

                  {/* Notes Editor or Interactive Preview */}
                  <div className="flex-1 p-3 overflow-y-auto">
                    {notesTab === "write" ? (
                      <textarea
                        ref={textareaRef}
                        value={notesContent}
                        onChange={handleNotesChange}
                        placeholder="Write your personal notes for this video here... Use Markdown or click '+ ⏱' to insert timestamps."
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

                  {/* Notes Footer / Autosave Status */}
                  <div className="p-2 border-t border-border bg-surface-2 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span>Markdown supported</span>
                    <span>
                      {isSavingNotes ? (
                        <span className="flex items-center gap-1 text-primary">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Saving...
                        </span>
                      ) : (
                        <span className="text-success flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          All changes saved
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

