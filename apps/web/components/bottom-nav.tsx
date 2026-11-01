"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tv, BookmarkCheck, Settings } from "lucide-react";
import { cn } from "../lib/utils";
import { useThemeStore } from "../lib/stores/theme.store";

/**
 * Mobile Bottom Navigation Bar:
 * Provides sticky, thumb-friendly 3-tab navigation for primary destinations:
 * Feed, Library, and Settings.
 * In SerenMind theme, floats as a rounded pill with 2px borders and brutalist shadow.
 * In Classic theme, anchors cleanly to the bottom screen edge.
 * Automatically hidden on video watch page (/watch/*) for an immersive player experience.
 */
export function BottomNav() {
  const pathname = usePathname();
  const theme = useThemeStore((s) => s.theme);
  const isSeren = theme === "seren";

  // Hide bottom navigation on full-screen watch pages
  if (pathname?.startsWith("/watch")) {
    return null;
  }

  const isFeedActive = pathname === "/";
  const isLibraryActive = pathname === "/library" || pathname?.startsWith("/library");
  const isSettingsActive = pathname === "/settings" || pathname?.startsWith("/settings");

  return (
    <nav
      aria-label="Mobile Navigation"
      className={cn(
        "z-40 md:hidden flex items-center select-none transition-all",
        isSeren
          ? "fixed bottom-4 left-4 right-4 rounded-full border-2 border-zinc-900 bg-surface-1/95 backdrop-blur-md px-6 h-14 shadow-brutal justify-around"
          : "fixed bottom-0 left-0 right-0 bg-surface-1/95 backdrop-blur-md border-t-2 border-border px-6 h-[calc(4rem+env(safe-area-inset-bottom,0px))] justify-between shadow-lg pb-[env(safe-area-inset-bottom,0px)]",
      )}
    >
      {/* 1. Feed Tab */}
      <Link
        href="/"
        className={cn(
          "flex flex-col items-center justify-center gap-1 w-20 py-1 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isSeren ? "rounded-full" : "rounded-lg",
          isFeedActive
            ? isSeren
              ? "text-zinc-950 dark:text-zinc-50 font-bold bg-coral/25 border border-zinc-900/40"
              : "text-primary font-bold"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-current={isFeedActive ? "page" : undefined}
      >
        <Tv className={cn("w-5 h-5", isFeedActive && "stroke-[2.5]")} />
        <span className="text-[11px] leading-tight font-medium">Feed</span>
      </Link>

      {/* 2. Library Tab */}
      <Link
        href="/library"
        className={cn(
          "flex flex-col items-center justify-center gap-1 w-20 py-1 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isSeren ? "rounded-full" : "rounded-lg",
          isLibraryActive
            ? isSeren
              ? "text-zinc-950 dark:text-zinc-50 font-bold bg-lilac/30 border border-zinc-900/40"
              : "text-primary font-bold"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-current={isLibraryActive ? "page" : undefined}
      >
        <BookmarkCheck className={cn("w-5 h-5", isLibraryActive && "stroke-[2.5]")} />
        <span className="text-[11px] leading-tight font-medium">Library</span>
      </Link>

      {/* 3. Settings Tab */}
      <Link
        href="/settings"
        className={cn(
          "flex flex-col items-center justify-center gap-1 w-20 py-1 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isSeren ? "rounded-full" : "rounded-lg",
          isSettingsActive
            ? isSeren
              ? "text-zinc-950 dark:text-zinc-50 font-bold bg-mint/30 border border-zinc-900/40"
              : "text-primary font-bold"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-current={isSettingsActive ? "page" : undefined}
      >
        <Settings className={cn("w-5 h-5", isSettingsActive && "stroke-[2.5]")} />
        <span className="text-[11px] leading-tight font-medium">Settings</span>
      </Link>
    </nav>
  );
}

