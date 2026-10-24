"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  User,
  Sun,
  Moon,
  Monitor,
  Check,
  Loader2,
  LogOut,
  EyeOff,
  Clock,
  SlidersHorizontal,
  Sparkles,
  Mail,
  Smartphone,
  Download,
  CheckCircle2,
  Share,
  Wifi,
} from "lucide-react";
import type {
  UserPreferencesResponse,
  UpdateUserPreferencesRequest,
  Theme,
} from "@locus/contracts";
import { authClient } from "../../lib/auth-client";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui/card";
import { cn } from "../../lib/utils";
import { useFeedbackStore } from "../../lib/stores/feedback.store";
import { usePwaStore } from "../../lib/stores/pwa.store";

export interface PreferencesTabSession {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    createdAt?: string | Date;
  } | null;
}

interface PreferencesTabProps {
  session: PreferencesTabSession | null | undefined;
  preferences: UserPreferencesResponse | undefined;
  isLoading: boolean;
  onUpdatePreferences: (updates: UpdateUserPreferencesRequest) => Promise<unknown> | void;
  isUpdating: boolean;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0]?.[0] && parts[1]?.[0]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

function applyTheme(theme: Theme) {
  try {
    localStorage.setItem("locus-theme", theme);
  } catch {
    // Restricted sandbox fallback
  }

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }
}

export function PreferencesTab({
  session,
  preferences,
  isLoading,
  onUpdatePreferences,
  isUpdating,
}: PreferencesTabProps) {
  const openFeedback = useFeedbackStore((s) => s.open);
  const { isInstallable, isInstalled, isIos, triggerInstall } = usePwaStore();
  const [signingOut, setSigningOut] = useState(false);
  const [lastSavedField, setLastSavedField] = useState<string | null>(null);

  const [selectedTheme, setSelectedTheme] = useState<Theme>(() => {
    if (preferences?.theme) return preferences.theme;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("locus-theme") as Theme | null;
      if (stored === "system" || stored === "light" || stored === "dark") {
        return stored;
      }
    }
    return "system";
  });

  useEffect(() => {
    if (preferences?.theme) {
      setSelectedTheme(preferences.theme);
    }
  }, [preferences?.theme]);

  // Active values fallback to sensible defaults while loading
  const hideWatched = preferences?.hideWatchedVideos ?? true;
  const feedMode = preferences?.feedMode ?? "normal";

  const handleSelectFeedMode = async (mode: "normal" | "tagged_only") => {
    setLastSavedField("feedMode");
    await onUpdatePreferences({ feedMode: mode });
  };

  // React to OS system dark mode changes when theme is "system"
  useEffect(() => {
    if (selectedTheme === "system" && typeof window !== "undefined") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }
  }, [selectedTheme]);

  // Handle Theme Selection
  const handleSelectTheme = async (theme: Theme) => {
    setSelectedTheme(theme);
    applyTheme(theme);
    setLastSavedField("theme");
    try {
      await onUpdatePreferences({ theme });
    } catch {
      // Revert if mutation fails
    }
  };

  // Handle Hide Watched Toggle
  const handleToggleHideWatched = async () => {
    setLastSavedField("hideWatched");
    await onUpdatePreferences({ hideWatchedVideos: !hideWatched });
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
      window.location.href = "/";
    } catch {
      setSigningOut(false);
    }
  };

  const userInitials = getInitials(session?.user?.name, session?.user?.email);

  return (
    <div className="space-y-6">
      {/* 1. Account & Profile Card */}
      <Card>
        <CardHeader className="p-5 sm:p-6 pb-4 sm:pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <span>Account Profile</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground font-mono mt-1">
                Your authenticated account credentials and session details.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full sm:w-auto gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive hover:text-destructive cursor-pointer font-semibold shrink-0 h-9"
            >
              {signingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-lg border border-border/70 bg-surface-2/40">
            <div className="flex items-center gap-4 min-w-0">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session?.user?.name || "User Avatar"}
                  className="w-12 h-12 rounded-full border border-border/80 object-cover shadow-xs shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full border border-border/80 bg-surface-3 text-foreground font-bold text-lg flex items-center justify-center shadow-xs shrink-0 select-none">
                  {userInitials}
                </div>
              )}

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-base sm:text-lg font-bold text-foreground truncate">
                    {session?.user?.name || "Locus User"}
                  </span>
                  {/* High-contrast green active badge with pulse indicator */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-success/15 text-success border border-success/40 shadow-xs select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    Active
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono truncate">
                  <Mail className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                  <span className="truncate">{session?.user?.email || "No email provided"}</span>
                </div>
              </div>
            </div>

            <div className="sm:border-l sm:border-border sm:pl-5 sm:text-right text-xs font-mono text-muted-foreground space-y-0.5">
              <span className="block font-semibold text-foreground/80">Google Auth Session</span>
              <span className="block text-[11px] text-muted-foreground">Connected & Verified</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Appearance & Theme Card */}
      <Card>
        <CardHeader className="p-5 sm:p-6 pb-4 sm:pb-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                <span>Appearance & Theme</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground font-mono mt-1">
                Customize how Locus renders across light, dark, and system themes.
              </CardDescription>
            </div>

            {isUpdating && lastSavedField === "theme" && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Applying...</span>
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
            {/* System */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleSelectTheme("system")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelectTheme("system");
                }
              }}
              className={cn(
                "p-3 sm:p-4 rounded-lg border transition-all cursor-pointer flex flex-col justify-between select-none shadow-xs text-center sm:text-left",
                selectedTheme === "system"
                  ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                  : "border-border/70 bg-surface-1 hover:border-border hover:bg-surface-2/60",
              )}
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md border border-border bg-surface-2 flex items-center justify-center text-foreground mx-auto sm:mx-0">
                  <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                {selectedTheme === "system" && (
                  <span className="hidden sm:flex w-5 h-5 rounded-full bg-primary text-primary-foreground items-center justify-center shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-foreground m-0">System</p>
                <p className="hidden sm:block text-xs text-muted-foreground font-mono mt-0.5 m-0">
                  Matches your OS mode
                </p>
              </div>
            </div>

            {/* Light */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleSelectTheme("light")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelectTheme("light");
                }
              }}
              className={cn(
                "p-3 sm:p-4 rounded-lg border transition-all cursor-pointer flex flex-col justify-between select-none shadow-xs text-center sm:text-left",
                selectedTheme === "light"
                  ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                  : "border-border/70 bg-surface-1 hover:border-border hover:bg-surface-2/60",
              )}
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md border border-border bg-surface-2 flex items-center justify-center text-amber-500 mx-auto sm:mx-0">
                  <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                {selectedTheme === "light" && (
                  <span className="hidden sm:flex w-5 h-5 rounded-full bg-primary text-primary-foreground items-center justify-center shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-foreground m-0">Light</p>
                <p className="hidden sm:block text-xs text-muted-foreground font-mono mt-0.5 m-0">
                  Crisp daylight canvas
                </p>
              </div>
            </div>

            {/* Obsidian Dark */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleSelectTheme("dark")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelectTheme("dark");
                }
              }}
              className={cn(
                "p-3 sm:p-4 rounded-lg border transition-all cursor-pointer flex flex-col justify-between select-none shadow-xs text-center sm:text-left",
                selectedTheme === "dark"
                  ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                  : "border-border/70 bg-surface-1 hover:border-border hover:bg-surface-2/60",
              )}
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md border border-border bg-surface-2 flex items-center justify-center text-primary mx-auto sm:mx-0">
                  <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                {selectedTheme === "dark" && (
                  <span className="hidden sm:flex w-5 h-5 rounded-full bg-primary text-primary-foreground items-center justify-center shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-foreground m-0">Dark</p>
                <p className="hidden sm:block text-xs text-muted-foreground font-mono mt-0.5 m-0">
                  Deep obsidian surfaces
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Feed & Video Experience Card */}
      <Card>
        <CardHeader className="p-5 sm:p-6 pb-4 sm:pb-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
                <span>Feed Preferences</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground font-mono mt-1">
                Fine-tune what videos are presented in your distraction-free stream.
              </CardDescription>
            </div>

            {isUpdating && lastSavedField && lastSavedField !== "theme" && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono shrink-0">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Saving...</span>
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 pt-0 space-y-5">
          {/* Hide Watched Videos Toggle */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleToggleHideWatched}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleToggleHideWatched();
              }
            }}
            className="p-4 rounded-lg border border-border/70 bg-surface-1 hover:bg-surface-2/40 transition-all cursor-pointer flex items-center justify-between gap-4 select-none shadow-xs"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  Hide Watched Videos
                </span>
                {hideWatched && (
                  <Badge variant="success" className="text-[10px] font-mono py-0 font-bold">
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono m-0">
                Automatically hides videos you have already marked as watched from your main feed.
              </p>
            </div>

            {/* Custom accessible switch - never nests HTML button */}
            <div
              role="switch"
              aria-checked={hideWatched}
              aria-label="Hide Watched Videos"
              className={cn(
                "w-11 h-6 rounded-full border border-border transition-colors relative shrink-0",
                hideWatched ? "bg-primary" : "bg-surface-3",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
                  hideWatched ? "translate-x-5" : "translate-x-0",
                )}
              />
            </div>
          </div>

          {/* AI Feed Classification Mode (only when AI tagging is enabled) */}
          {process.env.NEXT_PUBLIC_AI_VIDEO_TAGGING_ENABLED === "true" && (
            <div className="p-4 rounded-lg border border-border/70 bg-surface-1 shadow-xs space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">
                    AI Tagging Feed Mode
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5 m-0">
                  Control how strictly AI topic tags govern video visibility in your feed.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {[
                  {
                    id: "normal" as const,
                    label: "Hybrid Normal Feed",
                    desc: "Shows all followed videos immediately; tags appear seamlessly as batch classification completes.",
                  },
                  {
                    id: "tagged_only" as const,
                    label: "Tag-based Only",
                    desc: "Strictly display videos that have completed AI classification with at least one tag.",
                  },
                ].map((modeOption) => (
                  <button
                    key={modeOption.id}
                    type="button"
                    onClick={() => handleSelectFeedMode(modeOption.id)}
                    className={cn(
                      "p-3 rounded-md border text-left transition-all cursor-pointer font-sans select-none",
                      feedMode === modeOption.id
                        ? "border-primary bg-primary/8 text-foreground font-bold shadow-xs ring-1 ring-primary/30"
                        : "border-border/70 bg-surface-2/60 text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold text-foreground">
                        {modeOption.label}
                      </span>
                      {feedMode === modeOption.id && (
                        <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5 m-0">
                      {modeOption.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Background Auto-Sync Engine Info Banner */}
          <div className="p-4 rounded-lg border border-primary/25 bg-primary/5 text-xs font-mono text-muted-foreground flex items-start gap-3 shadow-xs">
            <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-foreground block text-sm font-sans">
                Automatic Background Sync Engine
              </span>
              <p className="m-0 leading-relaxed text-muted-foreground/85 font-mono text-xs">
                Locus automatically checks YouTube for newly uploaded videos from your followed channels every 2 hours in the background and whenever you open the application.
              </p>
            </div>
          </div>

          {/* Feedback & Bug Reporting Section */}
          <div className="p-4 rounded-xl border border-border/70 bg-surface-2/40 flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <span className="font-semibold text-foreground text-sm block">
                Feedback & Bug Reports
              </span>
              <p className="text-xs text-muted-foreground m-0">
                Notice an issue or want to suggest a new feature? Send us a ticket with automatic diagnostics.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openFeedback("bug")}
                className="px-3.5 py-1.5 rounded-lg border border-border bg-surface-1 text-xs font-medium text-foreground hover:bg-surface-3 transition-colors cursor-pointer"
              >
                Report a Bug
              </button>
              <button
                type="button"
                onClick={() => openFeedback("feature_request")}
                className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Request Feature
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progressive Web App / Mobile Installation Section */}
      <Card>
        <CardHeader className="p-5 sm:p-6 pb-4 sm:pb-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                <span>App & Mobile Experience</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground font-mono mt-1">
                Install Locus directly on your phone or desktop for an app experience with offline resilience.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 pt-0 space-y-4">
          <div className="p-4 rounded-xl border border-border/70 bg-surface-2/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">
                  Installation Status
                </span>
                {isInstalled ? (
                  <Badge className="bg-success text-success-foreground border-border text-[11px] font-mono">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Installed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-border text-muted-foreground text-[11px] font-mono">
                    Web Browser Mode
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isInstalled
                  ? "Locus is running standalone as an installed Progressive Web App."
                  : isIos
                  ? "To install on iPhone or iPad, tap the Share icon in Safari and select 'Add to Home Screen'."
                  : "Install Locus on your device to launch it like a native app without browser bars."}
              </p>
            </div>

            {!isInstalled && (
              <div className="shrink-0">
                {isInstallable ? (
                  <Button
                    onClick={() => triggerInstall()}
                    className="bg-primary text-primary-foreground font-bold border-2 border-border shadow-brutal-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] text-xs h-9"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Install Locus
                  </Button>
                ) : isIos ? (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-primary font-semibold bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-sm">
                    <Share className="w-3.5 h-3.5" />
                    <span>Safari Share &gt; Add to Home Screen</span>
                  </div>
                ) : (
                  <span className="text-xs font-mono text-muted-foreground">
                    Available via Browser Menu
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Offline caching indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg border border-border/60 bg-surface-1/50 flex items-center gap-2.5">
              <Wifi className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="font-bold text-foreground block">Offline Fallback</span>
                <span className="text-muted-foreground text-[11px]">Active shell & cached visits</span>
              </div>
            </div>
            <div className="p-3 rounded-lg border border-border/60 bg-surface-1/50 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <div>
                <span className="font-bold text-foreground block">Service Worker</span>
                <span className="text-muted-foreground text-[11px]">Automatic background caching</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
