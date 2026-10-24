"use client";

import * as React from "react";
import { Tag, X } from "lucide-react";
import { useTopicsQuery } from "../../lib/queries";
import { cn } from "../../lib/utils";

interface TopicFilterChipsProps {
  selectedTopics: string[];
  onToggleTopic: (slug: string) => void;
  onClearTopics: () => void;
}

export function TopicFilterChips({
  selectedTopics,
  onToggleTopic,
  onClearTopics,
}: TopicFilterChipsProps) {
  const { data, isLoading } = useTopicsQuery();
  const topics = data?.topics ?? [];

  if (isLoading || topics.length === 0) {
    return null;
  }

  const hasSelection = selectedTopics.length > 0;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-border">
      <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
        <button
          type="button"
          onClick={onClearTopics}
          className={cn(
            "text-xs px-2.5 py-1 rounded-full font-medium transition-all shrink-0 border flex items-center gap-1",
            !hasSelection
              ? "bg-primary text-primary-foreground border-primary shadow-xs"
              : "bg-surface-2 text-foreground-muted hover:text-foreground border-border hover:border-border-strong",
          )}
        >
          <Tag className="w-3 h-3" />
          <span>All</span>
        </button>

        {topics.map((t) => {
          const isSelected = selectedTopics.includes(t.slug);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onToggleTopic(t.slug)}
              title={t.description || t.name}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full font-medium transition-all shrink-0 border cursor-pointer",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-surface-2 text-foreground-muted hover:text-foreground border-border hover:border-border-strong",
              )}
            >
              {t.name}
            </button>
          );
        })}

        {hasSelection && (
          <button
            type="button"
            onClick={onClearTopics}
            className="text-xs px-2 py-1 rounded-full text-foreground-muted hover:text-foreground border border-dashed border-border hover:border-border-strong transition-colors flex items-center gap-1 shrink-0"
            title="Clear topic filters"
          >
            <X className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}

