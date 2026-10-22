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
  Layers,
  Clock,
  SlidersHorizontal,
  Sparkles,
  Mail,
} from "lucide-react";
import type {
  UserPreferencesResponse,
  UpdateUserPreferencesRequest,
  Theme,
  DefaultFeed,
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
  const defaultFeed = preferences?.defaultFeed ?? "unified";
  const itemsPerPage = preferences?.itemsPerPage ?? 20;
  const refreshInterval = preferences?.refreshIntervalMinutes ?? null;

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

  // Handle Default Feed Selection
  const handleSelectDefaultFeed = async (feed: DefaultFeed) => {
    setLastSavedField("defaultFeed");
    await onUpdatePreferences({ defaultFeed: feed });
  };

  // Handle Items Per Page Selection
  const handleSelectItemsPerPage = async (count: number) => {
    setLastSavedField("itemsPerPage");
    await onUpdatePreferences({ itemsPerPage: count });
  };

  // Handle Auto-Sync Interval Selection
  const handleSelectRefreshInterval = async (minutes: number | null) => {
    setLastSavedField("refreshInterval");
    await onUpdatePreferences({ refreshIntervalMinutes: minutes });
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
              className="w-full sm:w-auto gap-2 text-destructive border-2 border-destructive/40 hover:bg-destructive/15 hover:border-destructive hover:text-destructive cursor-pointer font-bold shrink-0 shadow-brutal-sm"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-md border-2 border-border-strong bg-surface-1 shadow-brutal-sm">
            <div className="flex items-center gap-4 min-w-0">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session?.user?.name || "User Avatar"}
                  className="w-14 h-14 rounded-md border-2 border-border-strong object-cover shadow-brutal-sm shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-md border-2 border-border-strong bg-primary text-primary-foreground font-black text-xl flex items-center justify-center shadow-brutal-sm shrink-0 select-none">
                  {userInitials}
                </div>
              )}

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-base sm:text-lg font-bold text-foreground truncate">
                    {session?.user?.name || "Locus User"}
                  </span>
                  {/* High-contrast green active badge with pulse indicator */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-success/15 text-success border border-success/40 shadow-sm select-none">
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

            <div className="sm:border-l-2 sm:border-border sm:pl-5 sm:text-right text-xs font-mono text-muted-foreground space-y-0.5">
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

        <CardContent className="p-5 sm:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
                "p-4 rounded-md border-2 transition-all cursor-pointer flex flex-col justify-between select-none shadow-brutal-sm",
                selectedTheme === "system"
                  ? "border-primary bg-primary/10 shadow-brutal-primary -translate-x-0.5 -translate-y-0.5"
                  : "border-border-strong bg-surface-1 hover:bg-surface-2 hover:-translate-x-0.5 hover:-translate-y-0.5",
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-sm border-2 border-border-strong bg-surface-2 flex items-center justify-center text-foreground">
                  <Monitor className="w-4 h-4" />
                </div>
                {selectedTheme === "system" && (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground m-0">System</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5 m-0">
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
                "p-4 rounded-md border-2 transition-all cursor-pointer flex flex-col justify-between select-none shadow-brutal-sm",
                selectedTheme === "light"
                  ? "border-primary bg-primary/10 shadow-brutal-primary -translate-x-0.5 -translate-y-0.5"
                  : "border-border-strong bg-surface-1 hover:bg-surface-2 hover:-translate-x-0.5 hover:-translate-y-0.5",
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-sm border-2 border-border-strong bg-surface-2 flex items-center justify-center text-amber-500">
                  <Sun className="w-4 h-4" />
                </div>
                {selectedTheme === "light" && (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground m-0">Light</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5 m-0">
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
                "p-4 rounded-md border-2 transition-all cursor-pointer flex flex-col justify-between select-none shadow-brutal-sm",
                selectedTheme === "dark"
                  ? "border-primary bg-primary/10 shadow-brutal-primary -translate-x-0.5 -translate-y-0.5"
                  : "border-border-strong bg-surface-1 hover:bg-surface-2 hover:-translate-x-0.5 hover:-translate-y-0.5",
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-sm border-2 border-border-strong bg-surface-2 flex items-center justify-center text-primary">
                  <Moon className="w-4 h-4" />
                </div>
                {selectedTheme === "dark" && (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground m-0">Obsidian Dark</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5 m-0">
                  Deep dark obsidian surfaces
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
            className="p-4 rounded-md border-2 border-border-strong bg-surface-1 hover:bg-surface-2/60 transition-all cursor-pointer flex items-center justify-between gap-4 select-none shadow-brutal-sm"
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
                "w-11 h-6 rounded-full border-2 border-border-strong transition-colors relative shrink-0",
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

          {/* Default Starting Feed */}
          <div className="p-4 rounded-md border-2 border-border-strong bg-surface-1 shadow-brutal-sm space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  Default Starting Feed
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5 m-0">
                The primary feed tab displayed when you open Locus.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {(
                [
                  { id: "unified", label: "Unified Stream", desc: "All followed channels" },
                  { id: "following", label: "Following Only", desc: "Priority subscriptions" },
                  { id: "discover", label: "Discover", desc: "Explore new creators" },
                ] as const
              ).map((feedOption) => (
                <button
                  key={feedOption.id}
                  type="button"
                  onClick={() => handleSelectDefaultFeed(feedOption.id)}
                  className={cn(
                    "p-3 rounded-md border-2 text-left transition-all cursor-pointer font-sans select-none",
                    defaultFeed === feedOption.id
                      ? "border-primary bg-primary/10 text-foreground font-bold shadow-brutal-sm -translate-x-0.5 -translate-y-0.5"
                      : "border-border bg-surface-2 text-muted-foreground hover:text-foreground hover:bg-surface-3",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-foreground">
                      {feedOption.label}
                    </span>
                    {defaultFeed === feedOption.id && (
                      <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5 m-0">
                    {feedOption.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Feed Batch Size (Items Per Page) */}
          <div className="p-4 rounded-md border-2 border-border-strong bg-surface-1 shadow-brutal-sm space-y-3">
            <div>
              <span className="text-sm font-bold text-foreground">
                Feed Batch Size
              </span>
              <p className="text-xs text-muted-foreground font-mono mt-0.5 m-0">
                Number of videos loaded per page during chronological infinite scroll.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[20, 40, 50].map((count) => (
                <Button
                  key={count}
                  type="button"
                  variant={itemsPerPage === count ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectItemsPerPage(count)}
                  className="cursor-pointer font-mono text-xs font-bold"
                >
                  {count} Videos {count === 20 && "(Recommended)"}
                </Button>
              ))}
            </div>
          </div>

          {/* Background Sync Frequency */}
          <div className="p-4 rounded-md border-2 border-border-strong bg-surface-1 shadow-brutal-sm space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  Background Sync Frequency
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5 m-0">
                How often Locus checks YouTube for newly uploaded videos from followed channels.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { label: "Manual Only", val: null },
                { label: "Every 30 Mins", val: 30 },
                { label: "Every 1 Hour", val: 60 },
                { label: "Every 6 Hours", val: 360 },
                { label: "Daily (24h)", val: 1440 },
              ].map((opt) => (
                <Button
                  key={String(opt.val)}
                  type="button"
                  variant={refreshInterval === opt.val ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectRefreshInterval(opt.val)}
                  className="cursor-pointer font-mono text-xs font-bold"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
