"use client";

import * as React from "react";
import { Sparkles, Layers } from "lucide-react";
import { cn } from "../../lib/utils";

interface FeedModeToggleProps {
  feedMode: "normal" | "tagged_only";
  onChange: (mode: "normal" | "tagged_only") => void;
}

export function FeedModeToggle({ feedMode, onChange }: FeedModeToggleProps) {
  return (
    <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-2 border border-border text-xs font-medium">
      <button
        type="button"
        onClick={() => onChange("normal")}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer",
          feedMode === "normal"
            ? "bg-surface-1 text-foreground shadow-xs font-semibold border border-border/80"
            : "text-foreground-muted hover:text-foreground",
        )}
        title="Normal Feed: shows all videos immediately, displaying tags as classification completes"
      >
        <Layers className="w-3.5 h-3.5" />
        <span>Hybrid Feed</span>
      </button>

      <button
        type="button"
        onClick={() => onChange("tagged_only")}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer",
          feedMode === "tagged_only"
            ? "bg-primary text-primary-foreground shadow-xs font-semibold"
            : "text-foreground-muted hover:text-foreground",
        )}
        title="Tag-based Only: strictly shows videos that have received at least one AI topic tag"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Tagged Only</span>
      </button>
    </div>
  );
}

