"use client";

import * as React from "react";
import { Navbar } from "./navbar";
import { CommandPalette } from "./command-palette/command-palette";

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared AppShell component providing consistent neo-brutalist canvas,
 * sticky top navigation, accessible skip link, responsive main container,
 * and global command palette.
 */
export function AppShell({ children, className }: AppShellProps) {
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

      {/* Compact sticky top navigation */}
      <Navbar />

      {/* Main view container */}
      <main id="main-content" className={className ?? "flex-1 focus:outline-none"}>
        {children}
      </main>
    </div>
  );
}

