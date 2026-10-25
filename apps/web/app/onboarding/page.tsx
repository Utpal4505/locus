"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Tv,
  Clock,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { authClient } from "../../lib/auth-client";
import { apiClient } from "../../lib/api-client";
import {
  useYoutubeStatusQuery,
  useChannelListQuery,
  useImportSubscriptionsMutation,
  useBulkFollowChannelsMutation,
  useUpdateUserPreferencesMutation,
} from "../../lib/queries";
import { getApiErrorMessage } from "../../lib/error-utils";
import { cn } from "../../lib/utils";

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Authentication session check
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  // YouTube queries & mutations
  const { data: ytStatus, isLoading: statusLoading, refetch: refetchStatus } = useYoutubeStatusQuery({
    enabled: !!session,
  });
  const { data: channelData, isLoading: channelsLoading, refetch: refetchChannels } = useChannelListQuery({
    enabled: !!session,
  });

  const importMutation = useImportSubscriptionsMutation();
  const bulkFollowMutation = useBulkFollowChannelsMutation();
  const updatePreferencesMutation = useUpdateUserPreferencesMutation();

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeFilterTab, setActiveFilterTab] = React.useState<"all" | "selected">("all");
  const [selectedChannelIds, setSelectedChannelIds] = React.useState<string[]>([]);
  const [connecting, setConnecting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const channels = channelData?.channels ?? [];
  const hasInitializedSelection = React.useRef(false);

  // Check URL query params for YouTube OAuth return
  React.useEffect(() => {
    const youtubeParam = searchParams.get("youtube");
    const errorParam = searchParams.get("youtube_error");

    if (youtubeParam === "connected") {
      setFeedback({
        type: "success",
        message: "YouTube account successfully connected!",
      });
      refetchStatus();
      setStep(2);
    } else if (errorParam) {
      setFeedback({
        type: "error",
        message: `YouTube connection error: ${errorParam}. Please try again.`,
      });
    }
  }, [searchParams, refetchStatus]);

  // If already connected on mount, advance to step 2 automatically
  React.useEffect(() => {
    if (ytStatus?.connected && step === 1 && !searchParams.get("youtube_error")) {
      setStep(2);
    }
  }, [ytStatus, step, searchParams]);

  // Pre-select already followed channels once on initial load (never force auto-selection of arbitrary 10/12 channels)
  React.useEffect(() => {
    if (!hasInitializedSelection.current && channels.length > 0) {
      hasInitializedSelection.current = true;
      const alreadyFollowed = channels.filter((c) => c.isFollowed).map((c) => c.id);
      setSelectedChannelIds(alreadyFollowed);
    }
  }, [channels]);

  // Auto-trigger import if connected but 0 channels imported
  React.useEffect(() => {
    if (
      step === 2 &&
      ytStatus?.connected &&
      !channelsLoading &&
      channels.length === 0 &&
      !importMutation.isPending &&
      !importMutation.isSuccess
    ) {
      importMutation.mutateAsync().then(() => {
        refetchChannels();
      }).catch(() => {
        // Handled in UI
      });
    }
  }, [step, ytStatus, channelsLoading, channels.length, importMutation, refetchChannels]);

  // Handle Connect to YouTube (with returnPath=/onboarding so Google returns back to onboarding)
  const handleConnect = async () => {
    setConnecting(true);
    setFeedback(null);
    try {
      const res = await apiClient.get<{ url: string }>("/api/youtube/connect?returnPath=/onboarding");
      if (res && res.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(
          err,
          "Failed to initiate YouTube connection. Please check server configuration."
        ),
      });
      setConnecting(false);
    }
  };

  // Filter channels based on search query and active tab
  const filteredChannels = React.useMemo(() => {
    let list = channels;
    if (activeFilterTab === "selected") {
      list = list.filter((c) => selectedChannelIds.includes(c.id));
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.externalId && c.externalId.toLowerCase().includes(q))
    );
  }, [channels, selectedChannelIds, activeFilterTab, searchQuery]);

  // Toggle single channel selection
  const handleToggleChannel = (id: string) => {
    setSelectedChannelIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Check if all currently visible filtered channels are selected
  const areAllFilteredSelected =
    filteredChannels.length > 0 &&
    filteredChannels.every((c) => selectedChannelIds.includes(c.id));

  // Toggle select all filtered channels
  const handleToggleSelectAll = () => {
    const visibleIds = filteredChannels.map((c) => c.id);
    if (areAllFilteredSelected) {
      setSelectedChannelIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedChannelIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleDeselectAll = () => {
    setSelectedChannelIds([]);
  };

  // Save selected channels and proceed to step 3
  const handleSaveChannels = async () => {
    if (selectedChannelIds.length === 0) {
      // Proceed directly if user chooses 0 channels
      setStep(3);
      return;
    }

    setFeedback(null);
    try {
      // Chunk requests into batches of 100 to stay within contracts schema limits
      const chunkSize = 100;
      for (let i = 0; i < selectedChannelIds.length; i += chunkSize) {
        const batch = selectedChannelIds.slice(i, i + chunkSize);
        await bulkFollowMutation.mutateAsync({ channelIds: batch });
      }
      setStep(3);

      // Trigger initial video sync in background
      apiClient
        .post("/api/youtube/videos/sync", { trigger: "on_open", force: true })
        .catch(() => {
          // Non-blocking sync catch
        });
    } catch (err) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(err, "Failed to follow selected channels."),
      });
    }
  };

  // Finalize onboarding and persist status
  const handleFinishOnboarding = async () => {
    if (session?.user?.id) {
      try {
        localStorage.setItem(`locus_onboarded_${session.user.id}`, "true");
      } catch {
        // Ignore localStorage error
      }
      try {
        await updatePreferencesMutation.mutateAsync({
          onboardingCompletedAt: new Date().toISOString(),
        });
      } catch {
        // Non-blocking preference sync
      }
    }
    router.push("/");
    router.refresh();
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-mono mt-3">
          Checking authentication session...
        </span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <Image src="/logo.svg" alt="Locus" width={48} height={48} className="w-12 h-12 mb-4" />
        <h1 className="text-2xl font-black text-foreground mb-2">Sign in to continue</h1>
        <p className="text-xs text-muted-foreground font-mono mb-6">
          You need an active Locus account to complete onboarding.
        </p>
        <Link
          href="/login"
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-surface-1 to-background flex flex-col antialiased selection:bg-accent selection:text-accent-foreground relative overflow-hidden">
      {/* Ambient Radial Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none select-none"></div>

      {/* Sleek Top Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-surface-1/80 backdrop-blur-md px-4 sm:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 select-none group">
          <Image
            src="/logo.svg"
            alt="Locus Logo"
            width={26}
            height={26}
            className="w-6.5 h-6.5 object-contain transition-transform group-hover:scale-105"
          />
          <span className="font-mono font-black text-sm sm:text-base tracking-tight text-foreground">
            LOCUS
          </span>
        </Link>

        {/* Minimalist Step Pill & Quick Skip */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleFinishOnboarding}
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition cursor-pointer select-none"
          >
            Skip for now →
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-mono font-bold text-foreground select-none">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span>Step {step} of 3</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className={cn(
          "flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center relative z-10 transition-all duration-300",
          step === 2 ? "max-w-5xl" : "max-w-xl"
        )}
      >
        
        {/* Feedback Alert */}
        {feedback && (
          <div
            role="alert"
            className={cn(
              "w-full mb-6 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 leading-relaxed shadow-sm",
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            )}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="flex-1 font-medium">{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 1: CONNECT YOUTUBE (Refined Modern Card)            */}
        {/* ======================================================== */}
        {step === 1 && (
          <div className="w-full bg-surface-1/95 border border-border rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl space-y-6">
            
            {/* Header Lockup */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mx-auto shadow-inner">
                <YoutubeIcon className="w-6 h-6" />
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight pt-2">
                Bring your YouTube library
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-mono max-w-md mx-auto leading-relaxed">
                Connect your account so Locus can sync your followed channels into a pure chronological feed.
              </p>
            </div>

            {/* 3 Sleek Feature Tiles (Replacing ugly bullet points) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-surface-2/40 border border-border space-y-1.5">
                <div className="flex items-center gap-2 text-primary text-xs font-bold font-mono">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>100% Read-Only</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  We never like, comment, or alter your YouTube profile.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-2/40 border border-border space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold font-mono">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Chronological</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Strictly newest-first timeline with zero recommended noise.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-2/40 border border-border space-y-1.5">
                <div className="flex items-center gap-2 text-amber-500 text-xs font-bold font-mono">
                  <SlidersHorizontal className="w-4 h-4 shrink-0" />
                  <span>You Control It</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Pick exactly which creators feed your personal queue.
                </p>
              </div>
            </div>

            {/* Action Section */}
            <div className="pt-2 space-y-3">
              {ytStatus?.connected ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>YouTube Account Connected</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full h-11 sm:h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-[0.98]"
                  >
                    <span>Continue to Channel Selection</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full h-12 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting to Google...</span>
                    </>
                  ) : (
                    <>
                      <YoutubeIcon className="w-4 h-4" />
                      <span>Connect with YouTube</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              <p className="text-center text-[11px] font-mono text-muted-foreground">
                Encrypted token security • Read-only access
              </p>

              <p className="text-center text-[11px] font-mono text-muted-foreground/90 leading-relaxed pt-1">
                By connecting, you agree to Locus&apos;s{" "}
                <Link href="/terms" target="_blank" className="text-primary underline hover:text-primary/80">
                  Terms of Service
                </Link>
                , acknowledge our{" "}
                <Link href="/privacy" target="_blank" className="text-primary underline hover:text-primary/80">
                  Privacy Policy
                </Link>
                , agree to the{" "}
                <a
                  href="https://www.youtube.com/t/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  YouTube Terms of Service
                </a>
                , and acknowledge the{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  Google Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: CURATE CHANNELS (Spacious 3-Col Desktop Grid)    */}
        {/* ======================================================== */}
        {step === 2 && (
          <div className="w-full bg-surface-1/95 border border-border/80 rounded-2xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6 pb-24 sm:pb-8">
            {/* Header Lockup */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  Curate your feed
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground font-mono mt-1">
                  Select the creators you want in your chronological timeline. You can adjust this anytime in Settings.
                </p>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-mono font-bold">
                  {selectedChannelIds.length} of {channels.length} Selected
                </span>
                {selectedChannelIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-xs font-mono text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Real-Time Search Bar */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search creators by name or handle..."
                  className="w-full h-10 px-3.5 pl-10 pr-9 rounded-xl border border-border bg-surface-2/40 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
                />
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3 pointer-events-none" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Tabs & Quick Action */}
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <div className="flex items-center bg-surface-2 p-0.5 rounded-lg border border-border text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab("all")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition cursor-pointer font-medium",
                      activeFilterTab === "all"
                        ? "bg-surface-1 text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All ({channels.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab("selected")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition cursor-pointer font-medium",
                      activeFilterTab === "selected"
                        ? "bg-surface-1 text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Selected ({selectedChannelIds.length})
                  </button>
                </div>

                {channels.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="h-9 px-3 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 text-xs font-bold text-foreground transition cursor-pointer select-none"
                  >
                    {areAllFilteredSelected
                      ? "Deselect Visible"
                      : `Select All (${filteredChannels.length})`}
                  </button>
                )}
              </div>
            </div>

            {/* Dynamic Channel Grid */}
            {channelsLoading || importMutation.isPending ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto" />
                <p className="text-xs text-muted-foreground font-mono">
                  {importMutation.isPending
                    ? "Importing your YouTube subscriptions..."
                    : "Loading channels..."}
                </p>
              </div>
            ) : filteredChannels.length === 0 ? (
              <div className="p-10 rounded-xl bg-surface-2/40 border border-border text-center space-y-3">
                <p className="text-xs text-muted-foreground font-mono">
                  {searchQuery
                    ? `No creators found matching "${searchQuery}"`
                    : activeFilterTab === "selected"
                    ? "No channels selected yet. Click any channel to select it."
                    : "No channels found."}
                </p>
                {(searchQuery || activeFilterTab !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveFilterTab("all");
                    }}
                    className="px-4 py-2 rounded-lg bg-surface-2 border border-border text-xs font-bold text-foreground hover:bg-surface-3 transition cursor-pointer"
                  >
                    Show All Channels
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                {filteredChannels.map((channel) => {
                  const isSelected = selectedChannelIds.includes(channel.id);
                  const initial = channel.name.slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={channel.id}
                      onClick={() => handleToggleChannel(channel.id)}
                      className={cn(
                        "group p-3 rounded-xl border transition-all duration-150 cursor-pointer select-none flex items-center justify-between gap-3 text-left",
                        isSelected
                          ? "bg-primary/[0.08] border-primary/50 ring-1 ring-primary/20 shadow-xs"
                          : "bg-surface-2/40 border-border/70 hover:bg-surface-2/80 hover:border-border"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {channel.thumbnailUrl ? (
                          <img
                            src={channel.thumbnailUrl}
                            alt={channel.name}
                            loading="lazy"
                            className="w-10 h-10 rounded-full object-cover shrink-0 border border-border/60 bg-surface-3"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-surface-3 border border-border flex items-center justify-center font-bold text-xs text-foreground shrink-0">
                            {initial}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate leading-snug group-hover:text-primary transition-colors">
                            {channel.name}
                          </h4>
                          <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                isSelected ? "bg-primary" : "bg-muted-foreground/40"
                              )}
                            />
                            <span className="truncate">
                              {isSelected ? "Followed in Feed" : "YouTube Subscribed"}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-150",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
                            : "border border-border/80 bg-surface-1 group-hover:border-primary/40"
                        )}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center justify-between pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl border border-border bg-surface-2 hover:bg-surface-3 text-xs font-semibold text-foreground transition cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              {selectedChannelIds.length > 0 ? (
                <button
                  type="button"
                  onClick={handleSaveChannels}
                  disabled={bulkFollowMutation.isPending}
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shadow-md active:scale-[0.98] disabled:opacity-50"
                >
                  {bulkFollowMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving {selectedChannelIds.length} Channels...</span>
                    </>
                  ) : (
                    <>
                      <span>Follow {selectedChannelIds.length} Channels & Build Feed</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveChannels}
                  className="h-11 px-5 rounded-xl border border-border bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer"
                >
                  <span>Continue with 0 Channels</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mobile Sticky Bottom Bar */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-surface-1/95 border-t border-border backdrop-blur-md flex items-center gap-2 z-40">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-12 h-11 rounded-xl border border-border bg-surface-2 text-muted-foreground flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Back to step 1"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSaveChannels}
                disabled={bulkFollowMutation.isPending}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 active:scale-95 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {bulkFollowMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : selectedChannelIds.length > 0 ? (
                  <>
                    <span>Follow {selectedChannelIds.length} & Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Continue with 0 Channels</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: READY / INITIAL SYNC COMPLETE                    */}
        {/* ======================================================== */}
        {step === 3 && (
          <div className="w-full max-w-md bg-surface-1/95 border border-border rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-foreground tracking-tight">You&apos;re All Set!</h1>
              <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                We&apos;ve synced your followed creators and compiled your personalized chronological video feed.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-2/40 border border-border text-xs font-mono space-y-2.5 text-left">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Channels Followed:</span>
                <span className="font-bold text-foreground">{selectedChannelIds.length} Creators</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Feed Timeline:</span>
                <span className="font-bold text-emerald-500">Pure Chronological</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Background Sync:</span>
                <span className="font-bold text-primary">Every 2 Hours</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinishOnboarding}
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 transition shadow-md active:scale-[0.98] cursor-pointer"
            >
              <Tv className="w-4 h-4" />
              <span>Enter My Clean Feed</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-mono mt-3">Loading onboarding...</span>
        </div>
      }
    >
      <OnboardingContent />
    </React.Suspense>
  );
}
