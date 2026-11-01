"use client";

import * as React from "react";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains("dark");
    const stored = localStorage.getItem("locus-theme") as "light" | "dark" | null;

    if (stored === "dark" || (!stored && isDark)) {
      setTheme("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);

    if (nextTheme === "dark") {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }

    try {
      localStorage.setItem("locus-theme", nextTheme);
    } catch {
      // Storage unavailable in restricted sandboxes
    }
  };

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={toggleTheme}
      className={cn(
        "h-9 w-9 rounded-xl border border-border/60 bg-surface-2/50 text-foreground shadow-xs hover:bg-surface-2 hover:border-border-strong transition-all cursor-pointer flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none",
        className,
      )}
      aria-label={
        mounted && theme === "dark"
          ? "Switch to light theme"
          : "Switch to dark theme"
      }
      title={
        mounted && theme === "dark"
          ? "Switch to light theme"
          : "Switch to dark theme"
      }
    >
      {mounted ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={theme}
            initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
            transition={{ duration: 0.18 }}
            className="flex items-center justify-center"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-foreground" />
            )}
          </motion.div>
        </AnimatePresence>
      ) : (
        <span className="w-4 h-4 block" />
      )}
    </motion.button>
  );
}
