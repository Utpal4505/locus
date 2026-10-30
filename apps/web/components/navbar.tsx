"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Settings,
  LogOut,
  ChevronDown,
  Tv,
  Library,
  MessageSquarePlus,
  ShieldAlert,
} from "lucide-react";
import { authClient } from "../lib/auth-client";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import { SyncStatusIndicator } from "./sync-status-indicator";
import { useCommandPaletteStore } from "../lib/stores/command-palette.store";
import { useFeedbackStore } from "../lib/stores/feedback.store";

/**
 * Extracts 1-2 uppercase characters from user name or email for avatar fallback.
 */
function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0];
    const second = parts[1];
    if (parts.length >= 2 && first?.[0] && second?.[0]) {
      return (first[0] + second[0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

/**
 * Isolated Suspense-wrapped component for safely consuming useSearchParams
 * without bailing out Next.js static prerendering on the root layout/pages.
 */
function SearchParamSync({ onQueryChange }: { onQueryChange: (q: string) => void }) {
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const param = searchParams?.get("search") || searchParams?.get("q") || "";
    onQueryChange(param);
  }, [searchParams, onQueryChange]);

  return null;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const openCommandPalette = useCommandPaletteStore((s) => s.open);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Close dropdown on route change
  React.useEffect(() => {
    setIsDropdownOpen(false);
  }, [pathname]);

  // Click outside to close profile dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Keyboard accessibility: Escape closes menus, Cmd+K / Ctrl+K focuses search
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        openCommandPalette();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openCommandPalette]);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  };

  const isFeedActive = pathname === "/";
  const isLibraryActive = pathname === "/library" || pathname.startsWith("/library");
  const isSettingsActive = pathname === "/settings" || pathname.startsWith("/settings");

  const user = session?.user;
  const initials = getInitials(user?.name, user?.email);
  const openFeedback = useFeedbackStore((s) => s.open);

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = Boolean(
    user?.email && adminEmails.includes(user.email.toLowerCase()),
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-border bg-surface-1/95 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]">
      {/* Safely sync URL search params without breaking static site generation */}
      <React.Suspense fallback={null}>
        <SearchParamSync onQueryChange={setSearchQuery} />
      </React.Suspense>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left Section: Brand & Primary Navigation */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Locus Minimalist Brand Lockup */}
          <Link
            href="/"
            className="flex items-center gap-2 font-mono font-black text-base sm:text-lg tracking-wider text-foreground hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm select-none"
            aria-label="Locus Home"
          >
            <Image
              src="/logo.svg"
              alt="Locus Logo"
              width={28}
              height={28}
              className="w-7 h-7 object-contain select-none"
              priority
            />
            <span className="font-sans font-black text-base sm:text-lg tracking-tight">LOCUS</span>
          </Link>

          {/* Desktop Navigation Segmented Capsule */}
          {session && (
            <nav
              className="hidden md:flex items-center p-1 rounded-lg bg-surface-2/70 border border-border/80 gap-1"
              aria-label="Main Navigation"
            >
              {/* Feed Link */}
              <Link
                href="/"
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 select-none",
                  isFeedActive
                    ? "bg-surface-1 text-foreground shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
                )}
                aria-current={isFeedActive ? "page" : undefined}
              >
                <Tv className="w-3.5 h-3.5 text-primary" />
                <span>Feed</span>
              </Link>

              {/* Library Link */}
              <Link
                href="/library"
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 select-none",
                  isLibraryActive
                    ? "bg-surface-1 text-foreground shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
                )}
                aria-current={isLibraryActive ? "page" : undefined}
              >
                <Library className="w-3.5 h-3.5 text-primary" />
                <span>Library</span>
              </Link>

              {/* Settings Link */}
              <Link
                href="/settings"
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 select-none",
                  isSettingsActive
                    ? "bg-surface-1 text-foreground shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50",
                )}
                aria-current={isSettingsActive ? "page" : undefined}
              >
                <Settings className="w-3.5 h-3.5 text-primary" />
                <span>Settings</span>
              </Link>
            </nav>
          )}
        </div>

        {/* Center/Right Section: Global Spotlight Search Trigger (Desktop) */}
        {session && (
          <button
            type="button"
            onClick={() => openCommandPalette()}
            className="relative flex-1 max-w-xs sm:max-w-sm hidden sm:flex items-center h-9 pl-9 pr-3 rounded-md border border-border bg-surface-2/80 hover:bg-surface-2 hover:border-border-strong text-xs sm:text-sm text-muted-foreground shadow-sm transition-all cursor-pointer text-left select-none group"
            aria-label="Open global search and command palette (Cmd+K)"
          >
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors pointer-events-none" />
            <span className="truncate">Search videos, notes, creators...</span>
            <kbd className="ml-auto hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground bg-surface-1 border border-border rounded-sm pointer-events-none shadow-2xs">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Right Section: Mobile Search, Theme Toggle, Profile / Auth Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Global Compact Sync Status Indicator */}
          {session && (
            <SyncStatusIndicator
              variant="compact"
              className="hidden lg:inline-flex"
            />
          )}

          {/* Mobile Search Button (1-tap Spotlight / Command Palette) */}
          {session && (
            <button
              type="button"
              onClick={() => openCommandPalette()}
              className="sm:hidden h-9 w-9 p-0 rounded-md border border-border bg-surface-2 text-foreground shadow-sm hover:bg-surface-3 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              aria-label="Open search and command palette"
              title="Search videos, notes, creators"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Quick Theme Switcher */}
          <ThemeToggle />

          {/* Authenticated User: Profile Avatar & Accessible Dropdown */}
          {session && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="h-9 flex items-center gap-2 px-2 rounded-md border border-border bg-surface-2 hover:bg-surface-3 hover:border-border-strong shadow-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none"
                aria-expanded={isDropdownOpen}
                aria-haspopup="menu"
                aria-label="User profile menu"
              >
                {/* Avatar with image or fallback initials */}
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || "User avatar"}
                    className="w-6 h-6 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-surface-3 border border-border flex items-center justify-center font-mono font-bold text-[11px] text-foreground select-none">
                    {initials}
                  </div>
                )}

                {/* User Name / Identifier */}
                <span className="hidden lg:inline-block max-w-[130px] truncate text-xs font-mono font-semibold text-foreground">
                  {user.name || user.email}
                </span>

                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-muted-foreground transition-transform duration-150",
                    isDropdownOpen && "rotate-180",
                  )}
                />
              </button>

              {/* Profile Dropdown Menu */}
              {isDropdownOpen && (
                <div
                  role="menu"
                  aria-orientation="vertical"
                  aria-label="User Options"
                  className="absolute right-0 top-full mt-2 w-56 rounded-md border-2 border-border-strong bg-surface-1 shadow-brutal p-1.5 z-50 animate-in fade-in"
                >
                  {/* User Meta Header */}
                  <div className="px-2.5 py-2 rounded-sm bg-surface-2 border border-border-strong/60 mb-1">
                    <p className="text-xs font-bold text-foreground truncate">
                      {user.name || "Account"}
                    </p>
                    <p className="text-[11px] font-mono text-muted-foreground truncate" title={user.email}>
                      {user.email}
                    </p>
                  </div>

                  <div className="h-[1px] bg-border my-1" />

                  {/* Personal Library Link */}
                  <Link
                    href="/library"
                    role="menuitem"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-xs font-medium text-foreground hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:bg-surface-2 focus-visible:text-primary"
                  >
                    <Library className="w-4 h-4 text-primary" />
                    <span>Personal Library</span>
                  </Link>

                  {/* Settings Link */}
                  <Link
                    href="/settings"
                    role="menuitem"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-xs font-medium text-foreground hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:bg-surface-2 focus-visible:text-primary"
                  >
                    <Settings className="w-4 h-4 text-primary" />
                    <span>Settings</span>
                  </Link>

                  {/* Send Feedback / Bug Report Trigger */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      openFeedback("bug");
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-xs font-medium text-foreground hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:bg-surface-2 focus-visible:text-primary cursor-pointer text-left"
                  >
                    <MessageSquarePlus className="w-4 h-4 text-primary" />
                    <span>Report Bug / Feature</span>
                  </button>

                  {/* Admin Triage Dashboard (Only visible if Admin) */}
                  {isAdmin && (
                    <Link
                      href="/admin/feedback"
                      role="menuitem"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:bg-destructive/10"
                    >
                      <ShieldAlert className="w-4 h-4 text-destructive" />
                      <span>Admin Triage</span>
                    </Link>
                  )}

                  <div className="h-[1px] bg-border my-1" />

                  {/* Legal & Compliance Links */}
                  <div className="px-2.5 py-1 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <Link
                      href="/terms"
                      onClick={() => setIsDropdownOpen(false)}
                      className="hover:text-primary hover:underline"
                    >
                      Terms
                    </Link>
                    <span>•</span>
                    <Link
                      href="/privacy"
                      onClick={() => setIsDropdownOpen(false)}
                      className="hover:text-primary hover:underline"
                    >
                      Privacy
                    </Link>
                    <span>•</span>
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary hover:underline"
                    >
                      Permissions
                    </a>
                  </div>

                  <div className="h-[1px] bg-border my-1" />

                  {/* Sign Out Action */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-xs font-medium text-destructive hover:bg-destructive/15 transition-colors focus-visible:outline-none focus-visible:bg-destructive/15 cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 text-destructive" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Unauthenticated: Sign In Button */
            <Button variant="default" size="sm" asChild>
              <Link href="/">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
