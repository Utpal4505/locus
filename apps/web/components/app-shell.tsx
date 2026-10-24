"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { BottomNav } from "./bottom-nav";
import { CommandPalette } from "./command-palette/command-palette";
import { FeedbackModal } from "./feedback-modal";
import { initTelemetryCollector, recordRouteBreadcrumb } from "../lib/telemetry";
import { cn } from "../lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared AppShell component providing consistent neo-brutalist canvas,
 * sticky top navigation, accessible skip link, responsive main container,
 * mobile sticky bottom navigation, and global command palette.
 */
export function AppShell({ children, className }: AppShellProps) {
  const pathname = usePathname();
  const isWatchPage = pathname?.startsWith("/watch");

  React.useEffect(() => {
    initTelemetryCollector();
  }, []);

  React.useEffect(() => {
    if (pathname) {
      recordRouteBreadcrumb(pathname);
    }
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased selection:bg-accent selection:text-accent-foreground">
      {/* Accessible skip link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:font-mono focus:text-xs focus:font-bold focus:rounded-sm focus:border-2 focus:border-foreground focus:shadow-brutal"
      >
        Skip to main content
      </a>

      {/* Global Command Palette & Spotlight Search modal */}
      <CommandPalette />

      {/* Global Bug Report & Feature Request Modal */}
      <FeedbackModal />

      {/* Compact sticky top navigation (hidden on mobile watch page) */}
      {!isWatchPage ? <Navbar /> : (
        <div className="hidden md:block">
          <Navbar />
        </div>
      )}

      {/* Main view container: pb-20 on mobile when bottom navigation is visible */}
      <main
        id="main-content"
        className={cn(
          "flex-1 focus:outline-none",
          !isWatchPage && "pb-20 md:pb-0",
          className,
        )}
      >
        {children}
      </main>

      {/* Sticky Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
