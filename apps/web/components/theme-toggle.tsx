"use client";

import * as React from "react";
import { Sun, Moon } from "lucide-react";
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
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "p-2 rounded-md border-2 border-border-strong bg-surface-2 text-foreground shadow-brutal-sm hover:bg-surface-3 hover:border-foreground/40 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
        theme === "dark" ? (
          <Sun className="w-4 h-4 text-accent transition-transform hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-foreground transition-transform hover:-rotate-12" />
        )
      ) : (
        <span className="w-4 h-4 block" />
      )}
    </button>
  );
}
