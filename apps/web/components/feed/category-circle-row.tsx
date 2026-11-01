"use client";

import * as React from "react";
import {
  Sparkles,
  Bot,
  Server,
  Layout,
  Binary,
  Flame,
  Check,
} from "lucide-react";
import { useTopicsQuery } from "../../lib/queries";
import { cn } from "../../lib/utils";

interface CategoryCircleRowProps {
  selectedTopics: string[];
  onToggleTopic: (slug: string) => void;
  onClearTopics: () => void;
  className?: string;
}

interface StaticCategory {
  slug: string;
  label: string;
  bgColor: string;
  textColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DEFAULT_CATEGORIES: StaticCategory[] = [
  {
    slug: "ai",
    label: "AI & ML",
    bgColor: "#EDE9FE",
    textColor: "#5B21B6",
    icon: Bot,
  },
  {
    slug: "backend",
    label: "Backend",
    bgColor: "#FEF3C7",
    textColor: "#92400E",
    icon: Server,
  },
  {
    slug: "web",
    label: "Web Dev",
    bgColor: "#DCFCE7",
    textColor: "#166534",
    icon: Layout,
  },
  {
    slug: "dsa",
    label: "DSA & CS",
    bgColor: "#E0F2FE",
    textColor: "#075985",
    icon: Binary,
  },
  {
    slug: "tech-news",
    label: "Tech News",
    bgColor: "#FFE4E6",
    textColor: "#9F1239",
    icon: Flame,
  },
];

export function CategoryCircleRow({
  selectedTopics,
  onToggleTopic,
  onClearTopics,
  className,
}: CategoryCircleRowProps) {
  const { data } = useTopicsQuery();
  const serverTopics = data?.topics ?? [];

  // Match available topics or use vibrant defaults
  const categories = React.useMemo(() => {
    if (serverTopics.length === 0) return DEFAULT_CATEGORIES;

    return DEFAULT_CATEGORIES.map((cat) => {
      const match = serverTopics.find((t) => t.slug === cat.slug);
      return {
        ...cat,
        label: match ? match.name : cat.label,
      };
    });
  }, [serverTopics]);

  const isAllSelected = selectedTopics.length === 0;

  return (
    <section className={cn("space-y-2.5", className)} aria-label="Topic Categories">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <span>Focus Topics</span>
          <span className="text-[10px] text-zinc-400">✱</span>
        </span>
        {!isAllSelected && (
          <button
            type="button"
            onClick={onClearTopics}
            className="text-xs font-mono text-muted-foreground hover:text-foreground font-medium underline underline-offset-2 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Horizontal scrolling pill circles */}
      <div className="flex items-center gap-3.5 sm:gap-5 overflow-x-auto pb-2 pt-1 scrollbar-none">
        {/* "All" Category Circle */}
        <button
          type="button"
          onClick={onClearTopics}
          className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus-visible:outline-none"
        >
          <div
            className={cn(
              "w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-zinc-900 flex items-center justify-center transition-all duration-150 select-none",
              isAllSelected
                ? "bg-zinc-900 text-white shadow-brutal -translate-y-0.5"
                : "bg-surface-1 text-foreground hover:bg-surface-2 hover:-translate-y-0.5 shadow-brutal-sm",
            )}
          >
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span
            className={cn(
              "text-[11px] sm:text-xs font-mono transition-colors",
              isAllSelected ? "font-bold text-foreground" : "text-muted-foreground group-hover:text-foreground",
            )}
          >
            All
          </span>
        </button>

        {/* Dynamic Category Circles */}
        {categories.map((cat) => {
          const isSelected = selectedTopics.includes(cat.slug);
          const Icon = cat.icon;

          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => onToggleTopic(cat.slug)}
              className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus-visible:outline-none"
            >
              <div
                className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-zinc-900 flex items-center justify-center transition-all duration-150 relative select-none",
                  isSelected
                    ? "shadow-brutal -translate-y-1 ring-2 ring-zinc-900 ring-offset-2"
                    : "shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal",
                )}
                style={{ backgroundColor: cat.bgColor, color: cat.textColor }}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-zinc-900 text-white rounded-full flex items-center justify-center border border-white">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[11px] sm:text-xs font-mono transition-colors max-w-[70px] truncate text-center",
                  isSelected ? "font-bold text-foreground" : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
