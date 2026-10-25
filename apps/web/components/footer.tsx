"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Shield, MessageSquarePlus, Sparkles } from "lucide-react";
import { Badge } from "./ui/badge";
import { useFeedbackStore } from "../lib/stores/feedback.store";

export function Footer() {
  const openFeedback = useFeedbackStore((s) => s.open);

  return (
    <footer
      aria-label="Site Footer"
      className="w-full border-t-2 border-border-strong bg-surface-1 text-foreground mt-auto relative z-10 select-none pb-24 md:pb-8"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-border/60">
          {/* Brand & Purpose Column */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.svg"
                alt="Locus Logo"
                width={28}
                height={28}
                className="w-7 h-7 object-contain"
              />
              <span className="font-mono font-black text-base sm:text-lg tracking-tight text-foreground">
                LOCUS
              </span>
              <Badge variant="accent" className="text-[10px] py-0 px-2">
                Beta
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm">
              An intentional, distraction-free YouTube learning platform. Pure chronological
              feeds, private timestamped Markdown notes, and no algorithmic rabbit holes.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Independent Technical Learning Environment</span>
            </div>
          </div>

          {/* Platform Navigation */}
          <div className="md:col-span-3 space-y-2.5">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
              Platform
            </h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <Link
                  href="/"
                  className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline"
                >
                  Chronological Feed
                </Link>
              </li>
              <li>
                <Link
                  href="/library"
                  className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline"
                >
                  Personal Library & Queue
                </Link>
              </li>
              <li>
                <Link
                  href="/settings"
                  className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline"
                >
                  Channels & Settings
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openFeedback("bug")}
                  className="inline-flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:underline"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5 text-primary" />
                  <span>Report Bug / Send Feedback</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance Links */}
          <div className="md:col-span-4 space-y-2.5">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>Legal & Compliance</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <Link
                  href="/terms"
                  className="font-medium hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline text-foreground"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="font-medium hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline"
                >
                  Privacy Policy
                </Link>
              </li>
              <li className="pt-1 text-[11px] font-mono leading-relaxed text-muted-foreground/90">
                Locus uses YouTube API Services. By using Locus, you also agree to be bound by the{" "}
                <a
                  href="https://www.youtube.com/t/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  YouTube Terms of Service
                  <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                </a>{" "}
                and the{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Google Privacy Policy
                  <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                </a>
                .
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <p>© {new Date().getFullYear()} Locus. All rights reserved.</p>
          <div className="flex items-center gap-4 flex-wrap">
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors inline-flex items-center gap-1 text-[11px]"
            >
              <span>Manage Google Permissions</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <Link href="/terms" className="hover:text-foreground transition-colors text-[11px]">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors text-[11px]">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
