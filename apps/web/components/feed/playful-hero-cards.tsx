"use client";

import * as React from "react";
import Link from "next/link";
import { Play, Sparkles, BookOpen, ArrowRight, Clock, Plus } from "lucide-react";
import { authClient } from "../../lib/auth-client";
import { useLibraryQuery } from "../../lib/queries";
import { cn } from "../../lib/utils";

interface PlayfulHeroCardsProps {
  className?: string;
}

export function PlayfulHeroCards({ className }: PlayfulHeroCardsProps) {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const firstName = user?.name ? user.name.split(" ")[0] : "Learner";

  // Fetch library items for "Jump Back In" card
  const { data: libraryData } = useLibraryQuery(
    "history",
    { status: "in_progress", limit: 3 },
    { enabled: !!session },
  );

  const queuedVideos = libraryData?.items ?? [];
  const activeVideo = queuedVideos[0];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Playful Greeting Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight m-0 flex items-center gap-2">
            <span>Welcome Back, {firstName}!</span>
            <span className="text-amber-500 animate-pulse text-lg select-none">✱</span>
          </h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5 m-0">
            Distraction-free learning space. Choose a focus area below.
          </p>
        </div>
      </div>

      {/* Hero Cards Grid (Coral Action Card + Sunshine Insight Card) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Card 1: Vibrant Coral Card ("Jump Back In / Continue Learning") */}
        <div className="md:col-span-2 rounded-3xl border-2 border-zinc-900 bg-[#FF6B4A] text-white p-4 sm:p-5 shadow-brutal relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          {/* Subtle background doodle circle */}
          <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full border-4 border-white/15 pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white/90 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Jump Back In</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white font-bold border border-white/30 select-none">
                Focus Mode
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-black text-white mt-1.5 mb-1 leading-snug line-clamp-1">
              {activeVideo ? activeVideo.title : "Ready for your next study session?"}
            </h2>
            <p className="text-xs text-white/85 leading-relaxed line-clamp-1 font-mono m-0">
              {activeVideo
                ? `Published by ${activeVideo.channelName || "Creator"}`
                : "Explore curated tech talks and capture key insights."}
            </p>
          </div>

          {/* Action pill inside card */}
          <div className="mt-4 pt-2 border-t border-white/20 flex items-center justify-between gap-3">
            {activeVideo ? (
              <Link
                href={`/watch/${activeVideo.id}`}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-zinc-950 font-bold text-xs border-2 border-zinc-900 shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition-all cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Resume Video</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            ) : (
              <Link
                href="/library"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-zinc-950 font-bold text-xs border-2 border-zinc-900 shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>View Library Notes</span>
              </Link>
            )}

            <div className="text-[11px] font-mono text-white/80 hidden sm:flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Zero-distraction playback</span>
            </div>
          </div>
        </div>

        {/* Card 2: Sunshine Mustard Insight Card ("Study Insight 84%") */}
        <div className="rounded-3xl border-2 border-zinc-900 bg-[#FFC83B] text-zinc-900 p-4 sm:p-5 shadow-brutal flex flex-col justify-between min-h-[160px]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1">
                <span>Study Insight</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/10 border border-zinc-900/30">
                Weekly
              </span>
            </div>

            <p className="text-[11px] text-zinc-800 leading-snug mt-1 font-mono m-0">
              Tech content completed without ads or algorithm rabbit holes.
            </p>
          </div>

          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight leading-none">
                100%
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-800 mt-1 block">
                Focused Learning
              </span>
            </div>

            {/* Playful Dot Cluster Graphic (inspired by reference bubble matrix) */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-black/10 border border-black/15 shrink-0">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full border border-black/20",
                    i < 9 ? "bg-zinc-950" : "bg-white/60",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
