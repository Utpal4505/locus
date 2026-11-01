"use client";

import * as React from "react";
import { Sparkles, Palette, Check } from "lucide-react";
import { useThemeStore, type LocusTheme } from "../lib/stores/theme.store";
import { cn } from "../lib/utils";

interface ThemeSwitcherProps {
  className?: string;
  variant?: "pill" | "button" | "compact";
}

const THEMES: {
  id: LocusTheme;
  name: string;
  badge: string;
  description: string;
  accentColor: string;
  borderColor: string;
  bgPreview: string;
}[] = [
  {
    id: "seren",
    name: "SerenMind",
    badge: "Playful",
    description: "Warm paper grid, chunky 2px outlines, pastel pills & playful cards",
    accentColor: "#FF6B4A",
    borderColor: "#18181B",
    bgPreview: "#FAF7F2",
  },
  {
    id: "classic",
    name: "Classic Locus",
    badge: "Minimal",
    description: "Clean modern tech aesthetic with precision borders",
    accentColor: "#2563EB",
    borderColor: "#09090B",
    bgPreview: "#F8FAFC",
  },
];

export function ThemeSwitcher({ className, variant = "pill" }: ThemeSwitcherProps) {
  const { theme, setTheme } = useThemeStore();
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentTheme =
    THEMES.find((t) => t.id === theme) ?? (THEMES[0] as (typeof THEMES)[number]);

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border-2 transition-all cursor-pointer select-none",
          "border-zinc-900 bg-surface-1 text-foreground hover:bg-surface-2",
          "shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 active:shadow-none",
        )}
        title={`Current Theme: ${currentTheme.name} (Click to change)`}
        aria-label={`Current Theme: ${currentTheme.name}. Click to change theme.`}
        aria-expanded={isOpen}
      >
        <span
          className="w-2.5 h-2.5 rounded-full border border-zinc-900 shrink-0"
          style={{ backgroundColor: currentTheme.accentColor }}
        />
        <span className="hidden sm:inline font-mono tracking-tight">
          {currentTheme.name}
        </span>
        <Palette className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-2xl border-2 border-zinc-900 bg-surface-1 p-2 shadow-brutal z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2.5 py-1.5 border-b border-border/50 mb-1 flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-muted-foreground">
              Select Theme
            </span>
            <Sparkles className="w-3 h-3 text-amber-500" />
          </div>

          <div className="space-y-1">
            {THEMES.map((t) => {
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 border-2 cursor-pointer",
                    isSelected
                      ? "border-zinc-900 bg-surface-2 shadow-xs"
                      : "border-transparent hover:border-border hover:bg-surface-2/60",
                  )}
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 border-zinc-900 shrink-0 mt-0.5 flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: t.accentColor }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {t.name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full border border-border/60 text-muted-foreground">
                        {t.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 mt-0.5 m-0 font-mono">
                      {t.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
