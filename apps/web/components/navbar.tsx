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
import { NavbarSearch } from "./navbar-search";
import { useCommandPaletteStore } from "../lib/stores/command-palette.store";
import { useFeedbackStore } from "../lib/stores/feedback.store";
import { motion, AnimatePresence } from "motion/react";

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
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl pt-[env(safe-area-inset-top,0px)]">
      {/* Safely sync URL search params without breaking static site generation */}
      <React.Suspense fallback={null}>
        <SearchParamSync onQueryChange={setSearchQuery} />
      </React.Suspense>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-15 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left Section: Brand & Modern Tab Navigation */}
        <div className="flex items-center gap-5 sm:gap-7">
          {/* Locus Minimalist Brand Lockup */}
          <Link
            href="/"
            className="flex items-center gap-2 font-mono font-black text-base sm:text-lg tracking-wider text-foreground hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm select-none shrink-0"
            aria-label="Locus Home"
          >
            <Image
              src="/logo.svg"
              alt="Locus Logo"
              width={26}
              height={26}
              className="w-6 h-6 sm:w-7 sm:h-7 object-contain select-none"
              priority
            />
            <span className="font-sans font-black text-base sm:text-lg tracking-tight">LOCUS</span>
          </Link>

          {/* Desktop Navigation Interactive Tabs with Motion Indicator */}
          {session && (
            <nav
              className="hidden md:flex items-center gap-1"
              aria-label="Main Navigation"
            >
              {/* Feed Link */}
              <Link
                href="/"
                className={cn(
                  "relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 select-none",
                  isFeedActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-2/50",
                )}
                aria-current={isFeedActive ? "page" : undefined}
              >
                {isFeedActive && (
                  <motion.span
                    layoutId="navbarActiveTab"
                    className="absolute inset-0 bg-surface-2 rounded-lg border border-border/60 shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Tv className={cn("w-3.5 h-3.5", isFeedActive ? "text-primary" : "text-muted-foreground")} />
                  <span>Feed</span>
                </span>
              </Link>

              {/* Library Link */}
              <Link
                href="/library"
                className={cn(
                  "relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 select-none",
                  isLibraryActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-2/50",
                )}
                aria-current={isLibraryActive ? "page" : undefined}
              >
                {isLibraryActive && (
                  <motion.span
                    layoutId="navbarActiveTab"
                    className="absolute inset-0 bg-surface-2 rounded-lg border border-border/60 shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Library className={cn("w-3.5 h-3.5", isLibraryActive ? "text-primary" : "text-muted-foreground")} />
                  <span>Library</span>
                </span>
              </Link>

              {/* Settings Link */}
              <Link
                href="/settings"
                className={cn(
                  "relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 select-none",
                  isSettingsActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-2/50",
                )}
                aria-current={isSettingsActive ? "page" : undefined}
              >
                {isSettingsActive && (
                  <motion.span
                    layoutId="navbarActiveTab"
                    className="absolute inset-0 bg-surface-2 rounded-lg border border-border/60 shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Settings className={cn("w-3.5 h-3.5", isSettingsActive ? "text-primary" : "text-muted-foreground")} />
                  <span>Settings</span>
                </span>
              </Link>
            </nav>
          )}
        </div>

        {/* Center Section: Dedicated Content Search with Auto-Select & Instant Dropdown */}
        {session && (
          <NavbarSearch onOpenCommandPalette={() => openCommandPalette()} />
        )}

        {/* Right Section: Sync Indicator, Theme Toggle, Profile / Auth Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Global Compact Sync Status Indicator */}
          {session && (
            <SyncStatusIndicator
              variant="compact"
              className="hidden lg:inline-flex"
            />
          )}

          {/* Unified 1-Click Dark/Light Theme Toggle */}
          <ThemeToggle />

          {/* Authenticated User: Profile Avatar & Accessible Dropdown */}
          {session && user ? (
            <div className="relative" ref={dropdownRef}>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="h-9 flex items-center gap-2 px-2.5 rounded-xl border border-border/60 bg-surface-2/50 hover:bg-surface-2 hover:border-border-strong shadow-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none"
                aria-expanded={isDropdownOpen}
                aria-haspopup="menu"
                aria-label="User profile menu"
              >
                {/* Avatar with image or fallback initials */}
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || "User avatar"}
                    className="w-6 h-6 rounded-full border border-border/60 object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-surface-3 border border-border/60 flex items-center justify-center font-mono font-bold text-[11px] text-foreground select-none">
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
              </motion.button>

              {/* Profile Dropdown Menu */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    role="menu"
                    aria-orientation="vertical"
                    aria-label="User Options"
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border/60 bg-surface-1/95 backdrop-blur-xl shadow-2xl p-1.5 z-50 space-y-0.5 text-xs font-medium"
                  >
                    {/* User Meta Header */}
                    <div className="px-2.5 py-2 rounded-lg bg-surface-2/70 border border-border/60 mb-1">
                      <p className="text-xs font-bold text-foreground truncate m-0">
                        {user.name || "Account"}
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground truncate m-0 mt-0.5" title={user.email}>
                        {user.email}
                      </p>
                    </div>

                    <div className="h-[1px] bg-border/60 my-1" />

                    {/* Personal Library Link */}
                    <Link
                      href="/library"
                      role="menuitem"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:bg-surface-2 focus-visible:text-primary"
                    >
                      <Library className="w-4 h-4 text-primary" />
                      <span>Personal Library</span>
                    </Link>

                    {/* Settings Link */}
                    <Link
                      href="/settings"
                      role="menuitem"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:bg-surface-2 focus-visible:text-primary"
                    >
                      <Settings className="w-4 h-4 text-primary" />
                      <span>Settings & Preferences</span>
                    </Link>

                    {/* Send Feedback / Bug Report Trigger */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        openFeedback("bug");
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:bg-surface-2 focus-visible:text-primary cursor-pointer text-left"
                    >
                      <MessageSquarePlus className="w-4 h-4 text-primary" />
                      <span>Report Bug / Feature</span>
                    </button>

                    {/* Admin Triage Dashboard (Only visible if Admin) */}
                    {isAdmin && (
                      <Link
                        href="/admin"
                        role="menuitem"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:bg-destructive/10"
                      >
                        <ShieldAlert className="w-4 h-4 text-destructive" />
                        <span>Admin Triage</span>
                      </Link>
                    )}

                    <div className="h-[1px] bg-border/60 my-1" />

                    {/* Sign Out Action */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/15 transition-colors focus-visible:outline-none focus-visible:bg-destructive/15 cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4 text-destructive" />
                      <span>Sign Out</span>
                    </button>

                    {/* Legal & Compliance Links */}
                    <div className="px-2.5 py-1.5 flex items-center justify-between text-[11px] font-mono text-muted-foreground border-t border-border/40 mt-1">
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
                  </motion.div>
                )}
              </AnimatePresence>
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
