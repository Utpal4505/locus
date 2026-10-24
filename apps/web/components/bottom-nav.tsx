"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tv, BookmarkCheck, Settings } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Mobile Bottom Navigation Bar:
 * Provides sticky, thumb-friendly 3-tab navigation for primary destinations:
 * Feed, Library, and Settings.
 * Automatically hidden on video watch page (/watch/*) for an immersive player experience.
 */
export function BottomNav() {
  const pathname = usePathname();

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
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-surface-1/95 backdrop-blur-md border-t-2 border-border px-6 h-16 flex items-center justify-between shadow-lg pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] select-none"
    >
      {/* 1. Feed Tab */}
      <Link
        href="/"
        className={cn(
          "flex flex-col items-center justify-center gap-1 w-20 py-1 rounded-lg transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isFeedActive
            ? "text-primary font-bold"
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
          "flex flex-col items-center justify-center gap-1 w-20 py-1 rounded-lg transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isLibraryActive
            ? "text-primary font-bold"
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
          "flex flex-col items-center justify-center gap-1 w-20 py-1 rounded-lg transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isSettingsActive
            ? "text-primary font-bold"
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

