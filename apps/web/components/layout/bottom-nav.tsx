"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tv, BookmarkCheck, Settings } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Mobile Bottom Navigation Bar:
 * Provides a floating, thumb-friendly 3-tab navigation bar with
 * smooth Framer Motion active tab transitions.
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
      className="fixed bottom-4 left-4 right-4 z-40 md:hidden bg-surface-1/90 backdrop-blur-xl border border-border/60 rounded-full px-3 h-14 flex items-center justify-around shadow-2xl select-none"
    >
      {/* 1. Feed Tab */}
      <Link
        href="/"
        className={cn(
          "relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full",
          isFeedActive
            ? "text-primary font-bold"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-current={isFeedActive ? "page" : undefined}
      >
        {isFeedActive && (
          <motion.span
            layoutId="bottomNavActiveIndicator"
            className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-full"
            transition={{ type: "spring", stiffness: 450, damping: 35 }}
          />
        )}
        <Tv className={cn("w-4 h-4 relative z-10", isFeedActive && "stroke-[2.5]")} />
        <span className="text-[10px] leading-tight font-medium relative z-10">Feed</span>
      </Link>

      {/* 2. Library Tab */}
      <Link
        href="/library"
        className={cn(
          "relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full",
          isLibraryActive
            ? "text-primary font-bold"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-current={isLibraryActive ? "page" : undefined}
      >
        {isLibraryActive && (
          <motion.span
            layoutId="bottomNavActiveIndicator"
            className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-full"
            transition={{ type: "spring", stiffness: 450, damping: 35 }}
          />
        )}
        <BookmarkCheck className={cn("w-4 h-4 relative z-10", isLibraryActive && "stroke-[2.5]")} />
        <span className="text-[10px] leading-tight font-medium relative z-10">Library</span>
      </Link>

      {/* 3. Settings Tab */}
      <Link
        href="/settings"
        className={cn(
          "relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full",
          isSettingsActive
            ? "text-primary font-bold"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-current={isSettingsActive ? "page" : undefined}
      >
        {isSettingsActive && (
          <motion.span
            layoutId="bottomNavActiveIndicator"
            className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-full"
            transition={{ type: "spring", stiffness: 450, damping: 35 }}
          />
        )}
        <Settings className={cn("w-4 h-4 relative z-10", isSettingsActive && "stroke-[2.5]")} />
        <span className="text-[10px] leading-tight font-medium relative z-10">Settings</span>
      </Link>
    </nav>
  );
}