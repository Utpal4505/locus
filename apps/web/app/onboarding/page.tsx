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

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedChannelIds, setSelectedChannelIds] = React.useState<string[]>([]);
  const [connecting, setConnecting] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const channels = channelData?.channels ?? [];

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

  // Pre-select already followed channels or all channels when loaded
  React.useEffect(() => {
    if (channels.length > 0 && selectedChannelIds.length === 0) {
      const alreadyFollowed = channels.filter((c) => c.isFollowed).map((c) => c.id);
      if (alreadyFollowed.length > 0) {
        setSelectedChannelIds(alreadyFollowed);
      } else {
        // By default, select first 10 or all channels so user has an active feed right away
        setSelectedChannelIds(channels.slice(0, 10).map((c) => c.id));
      }
    }
  }, [channels, selectedChannelIds.length]);

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

  // Handle Connect to YouTube
  const handleConnect = async () => {
    setConnecting(true);
    setFeedback(null);
    try {
      const res = await apiClient.get<{ url: string }>("/api/youtube/connect");
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

  // Filter channels based on search query
  const filteredChannels = React.useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase().trim();
    return channels.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.externalId && c.externalId.toLowerCase().includes(q))
    );
  }, [channels, searchQuery]);

  // Toggle single channel selection
  const handleToggleChannel = (id: string) => {
    setSelectedChannelIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all filtered channels
  const handleToggleSelectAll = () => {
    const filteredIds = filteredChannels.map((c) => c.id);
    const allFilteredSelected = filteredIds.every((id) => selectedChannelIds.includes(id));

    if (allFilteredSelected) {
      setSelectedChannelIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedChannelIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Save selected channels and proceed to step 3
  const handleSaveChannels = async () => {
    if (selectedChannelIds.length === 0) {
      setFeedback({
        type: "error",
        message: "Please select at least one channel to follow in your feed.",
      });
      return;
    }

    setFeedback(null);
    try {
      await bulkFollowMutation.mutateAsync({ channelIds: selectedChannelIds });
      setStep(3);

      // Trigger initial video sync in background
      setIsSyncing(true);
      apiClient
        .post("/api/youtube/videos/sync", { trigger: "on_open", force: true })
        .catch(() => {
          // Non-blocking sync catch
        })
        .finally(() => {
          setIsSyncing(false);
        });
    } catch (err) {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(err, "Failed to follow selected channels."),
      });
    }
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
    <div className="min-h-screen bg-gradient-to-b from-background via-surface-1 to-background flex flex-col antialiased selection:bg-accent selection:text-accent-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-surface-1/90 backdrop-blur-md px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 select-none">
          <Image src="/logo.svg" alt="Locus Logo" width={28} height={28} className="w-7 h-7 object-contain" />
          <span className="font-mono font-black text-base tracking-tight text-foreground">LOCUS</span>
          <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
            Setup Wizard
          </span>
        </Link>

        {/* Step Indicator Pill & Skip */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleFinishOnboarding}
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition cursor-pointer select-none"
          >
            Skip to Feed →
          </button>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-surface-2 text-foreground border border-border font-bold">
            Step {step} of 3
          </span>
        </div>
      </header>

      {/* Main Wizard Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex flex-col items-center justify-center relative">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-primary/10 rounded-full blur-3xl pointer-events-none select-none"></div>

        {/* Desktop Step Progress Bar */}
        <div className="w-full max-w-2xl mb-8 hidden sm:block relative z-10">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-muted-foreground mb-2">
            <span
              className={cn(
                "flex items-center gap-2 transition-colors",
                step >= 1 ? "text-primary font-black" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
                  step >= 1 ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"
                )}
              >
                1
              </span>
              Connect YouTube
            </span>

            <span
              className={cn(
                "flex items-center gap-2 transition-colors",
                step >= 2 ? "text-primary font-black" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
                  step >= 2 ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"
                )}
              >
                2
              </span>
              Curate Channels
            </span>

            <span
              className={cn(
                "flex items-center gap-2 transition-colors",
                step === 3 ? "text-emerald-500 font-black" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
                  step === 3 ? "bg-emerald-500 text-white" : "bg-surface-2 text-muted-foreground"
                )}
              >
                3
              </span>
              Launch Feed
            </span>
          </div>

          <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500",
                step === 1 && "w-1/3 bg-primary",
                step === 2 && "w-2/3 bg-primary",
                step === 3 && "w-full bg-emerald-500"
              )}
            />
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            role="alert"
            className={cn(
              "w-full max-w-2xl mb-6 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 leading-relaxed relative z-10",
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
        {/* STEP 1: CONNECT YOUTUBE                                 */}
        {/* ======================================================== */}
        {step === 1 && (
          <div className="w-full max-w-md bg-surface-1/95 border border-border rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-6 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mx-auto shadow-inner">
              <YoutubeIcon className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-foreground tracking-tight">Connect Your YouTube</h1>
              <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                Locus needs read-only access to your subscriptions to build your chronological feed without algorithmic noise.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-2/40 border border-border text-xs font-mono text-muted-foreground space-y-2 text-left">
              <div className="flex items-center gap-2 text-emerald-500 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Privacy & Permissions</span>
              </div>
              <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4 leading-normal">
                <li>Read-only access to your YouTube subscription channels.</li>
                <li>Never likes, comments, or alters your YouTube profile.</li>
                <li>Encrypted token security with 1-click disconnect anytime.</li>
              </ul>
            </div>

            {ytStatus?.connected ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>YouTube Account Connected</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-[0.98]"
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
                    <span>Connect YouTube Account</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: CURATE CHANNELS + REAL-TIME SEARCH               */}
        {/* ======================================================== */}
        {step === 2 && (
          <div className="w-full max-w-3xl bg-surface-1/95 border border-border rounded-2xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5 relative z-10 pb-20 sm:pb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
              <div>
                <h2 className="text-xl font-black text-foreground tracking-tight">Select Channels to Follow</h2>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Only videos from selected channels will appear in your clean, chronological feed.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-mono font-bold">
                  {selectedChannelIds.length} of {channels.length} Selected
                </span>
                {channels.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="px-3 py-1 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 text-xs font-bold text-foreground transition cursor-pointer select-none"
                  >
                    {filteredChannels.length > 0 &&
                    filteredChannels.every((c) => selectedChannelIds.includes(c.id))
                      ? "Deselect Filtered"
                      : "Select All"}
                  </button>
                )}
              </div>
            </div>

            {/* Real-time Search Input Bar */}
            <div className="space-y-1.5">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search creators by name or handle (e.g. Coder, Prime, Fireship)..."
                  className="w-full h-11 px-3.5 pl-10 pr-9 rounded-xl border border-border bg-surface-2/40 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
                />
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5 pointer-events-none" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Clear search query"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground px-1">
                <span>
                  {searchQuery ? `Filtering by "${searchQuery}"` : "Search across your imported creators."}
                </span>
                <span>
                  {filteredChannels.length} of {channels.length} channels
                </span>
              </div>
            </div>

            {/* Loading Channels State */}
            {channelsLoading || importMutation.isPending ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto" />
                <p className="text-xs text-muted-foreground font-mono">
                  {importMutation.isPending
                    ? "Importing your YouTube subscriptions..."
                    : "Loading channels..."}
                </p>
              </div>
            ) : filteredChannels.length === 0 ? (
              /* Empty Search / Empty Subscriptions */
              <div className="p-8 rounded-xl bg-surface-2/40 border border-border text-center space-y-3">
                <p className="text-xs text-muted-foreground font-mono">
                  {searchQuery
                    ? `No channels found matching "${searchQuery}"`
                    : "No imported channels found yet."}
                </p>
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="px-4 py-2 rounded-lg bg-surface-2 border border-border text-xs font-bold text-foreground hover:bg-surface-3 transition cursor-pointer"
                  >
                    Clear Search Filter
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => importMutation.mutateAsync().then(() => refetchChannels())}
                    disabled={importMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition cursor-pointer"
                  >
                    Import Subscriptions
                  </button>
                )}
              </div>
            ) : (
              /* Dynamic Channel Grid (2 Columns on Desktop, 1 Column on Mobile) */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto no-scrollbar pr-1">
                {filteredChannels.map((channel) => {
                  const isSelected = selectedChannelIds.includes(channel.id);
                  const initial = channel.name.slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={channel.id}
                      onClick={() => handleToggleChannel(channel.id)}
                      className={cn(
                        "p-3 rounded-xl border cursor-pointer transition select-none flex items-center justify-between gap-3",
                        isSelected
                          ? "bg-primary/10 border-primary/50 shadow-sm"
                          : "bg-surface-2/30 border-border hover:border-border-strong opacity-80"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {channel.thumbnailUrl ? (
                          <Image
                            src={channel.thumbnailUrl}
                            alt={channel.name}
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-surface-3 border border-border flex items-center justify-center font-bold text-xs text-foreground shrink-0">
                            {initial}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-foreground truncate leading-tight">
                            {channel.name}
                          </h4>
                          <span className="text-[10px] font-mono text-muted-foreground block truncate">
                            {channel.description || "YouTube Creator"}
                          </span>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors",
                          isSelected ? "bg-primary text-primary-foreground" : "border border-border bg-surface-1"
                        )}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
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
                className="px-4 py-2 text-xs font-mono text-muted-foreground hover:text-foreground transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleSaveChannels}
                disabled={bulkFollowMutation.isPending || selectedChannelIds.length === 0}
                className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md active:scale-[0.98] disabled:opacity-50"
              >
                {bulkFollowMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Follow {selectedChannelIds.length} Channels & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Mobile Sticky Bottom Bar */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-surface-1/95 border-t border-border backdrop-blur-md flex items-center gap-2 z-40">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-12 h-11 rounded-xl border border-border bg-surface-2 text-muted-foreground flex items-center justify-center cursor-pointer"
                aria-label="Back to step 1"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSaveChannels}
                disabled={bulkFollowMutation.isPending || selectedChannelIds.length === 0}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 active:scale-95 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {bulkFollowMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Follow {selectedChannelIds.length} & Continue</span>
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
          <div className="w-full max-w-md bg-surface-1/95 border border-border rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-6 relative z-10">
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
