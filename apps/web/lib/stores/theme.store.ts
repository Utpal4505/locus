"use client";

import { create } from "zustand";

export type LocusTheme = "seren" | "classic";

export interface ThemeState {
  theme: LocusTheme;
  setTheme: (theme: LocusTheme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "locus_theme_id";

function getInitialTheme(): LocusTheme {
  if (typeof window === "undefined") return "classic";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "seren" || saved === "classic") {
      return saved;
    }
  } catch {
    // ignore restricted localStorage
  }
  return "classic";
}

function applyThemeToDocument(theme: LocusTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (theme: LocusTheme) => {
    applyThemeToDocument(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === "seren" ? "classic" : "seren";
    applyThemeToDocument(next);
    set({ theme: next });
  },
}));

/**
 * Helper hook to synchronize DOM data-theme attribute on client mount
 */
export function useInitTheme() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  if (typeof window !== "undefined") {
    // Immediately apply on first render pass
    applyThemeToDocument(theme);
  }

  return { theme, setTheme };
}

