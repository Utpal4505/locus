"use client";

import * as React from "react";
import { Clock } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  onSeek?: (seconds: number) => void;
}

// Parses timestamps like 04:20, [04:20], 01:23:45, [01:23:45] into total seconds
function parseTimestampToSeconds(text: string): number | null {
  const clean = text.replace(/[\[\]]/g, "").trim();
  const parts = clean.split(":").map(Number);
  if (parts.some(isNaN)) return null;

  if (parts.length === 2) {
    return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  }
  if (parts.length === 3) {
    return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  }
  return null;
}

/**
 * Tokenizes and renders inline Markdown tokens:
 * - Timestamps: [04:20], 04:20, [01:15:30]
 * - Bold: **text**
 * - Italic: *text*
 * - Inline code: `text`
 * - Links: [label](url)
 */
function renderInlineContent(
  text: string,
  onSeek?: (seconds: number) => void,
  keyPrefix = "inline",
): React.ReactNode[] {
  // Regex identifying markdown inline elements and timestamps
  // Groups:
  // 1: Timestamp [00:00] or 00:00
  // 2: Bold **...**
  // 3: Italic *...*
  // 4: Inline code `...`
  // 5: Link label, 6: Link href
  const inlineRegex =
    /(\[?\b\d{1,2}:\d{2}(?::\d{2})?\b\]?)|\*\*(.+?)\*\*|\*([^*]+?)\*|`([^`]+?)`|\[([^\]]+)\]\(([^)]+)\)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Append plain text before match
    if (match.index > lastIndex) {
      elements.push(
        <React.Fragment key={`${keyPrefix}-text-${index++}`}>
          {text.substring(lastIndex, match.index)}
        </React.Fragment>,
      );
    }

    const [fullMatch, timestamp, bold, italic, code, linkText, linkHref] = match;

    if (timestamp) {
      const seconds = parseTimestampToSeconds(timestamp);
      if (seconds !== null && onSeek) {
        elements.push(
          <button
            key={`${keyPrefix}-ts-${index++}`}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSeek(seconds);
            }}
            title={`Seek player to ${timestamp}`}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-primary/15 text-primary border border-primary/40 font-mono font-bold text-[11px] hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all cursor-pointer shadow-brutal-sm"
          >
            <Clock className="w-2.5 h-2.5 stroke-[2.2]" />
            <span>{timestamp}</span>
          </button>,
        );
      } else {
        elements.push(
          <span
            key={`${keyPrefix}-ts-plain-${index++}`}
            className="font-mono font-bold text-primary"
          >
            {timestamp}
          </span>,
        );
      }
    } else if (bold) {
      elements.push(
        <strong
          key={`${keyPrefix}-bold-${index++}`}
          className="font-black text-foreground"
        >
          {bold}
        </strong>,
      );
    } else if (italic) {
      elements.push(
        <em key={`${keyPrefix}-italic-${index++}`} className="italic">
          {italic}
        </em>,
      );
    } else if (code) {
      elements.push(
        <code
          key={`${keyPrefix}-code-${index++}`}
          className="px-1 py-0.5 rounded bg-surface-3 border border-border font-mono text-[11px] text-primary"
        >
          {code}
        </code>,
      );
    } else if (linkText && linkHref) {
      elements.push(
        <a
          key={`${keyPrefix}-link-${index++}`}
          href={linkHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary-hover transition-colors font-medium"
        >
          {linkText}
        </a>,
      );
    } else {
      elements.push(fullMatch);
    }

    lastIndex = inlineRegex.lastIndex;
  }

  // Append remaining text
  if (lastIndex < text.length) {
    elements.push(
      <React.Fragment key={`${keyPrefix}-tail`}>
        {text.substring(lastIndex)}
      </React.Fragment>,
    );
  }

  return elements;
}

export function MarkdownRenderer({ content, onSeek }: MarkdownRendererProps) {
  if (!content || !content.trim()) {
    return (
      <div className="text-muted-foreground text-xs italic py-4 text-center font-mono">
        No notes yet. Switch to &ldquo;Write&rdquo; to start drafting.
      </div>
    );
  }

  const lines = content.split("\n");
  const renderedBlocks: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let listItems: string[] = [];
  let blockIndex = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      const items = [...listItems];
      listItems = [];
      renderedBlocks.push(
        <ul
          key={`list-${blockIndex++}`}
          className="list-disc list-outside pl-4 my-2 space-y-1 text-xs sm:text-sm font-mono text-foreground leading-relaxed"
        >
          {items.map((item, idx) => (
            <li key={`li-${idx}`}>{renderInlineContent(item, onSeek, `li-${blockIndex}-${idx}`)}</li>
          ))}
        </ul>,
      );
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? "";
    const trimmed = rawLine.trim();

    // Check code block fence ```
    if (trimmed.startsWith("```")) {
      flushList();
      if (inCodeBlock) {
        // Closing code block
        const codeText = codeBlockLines.join("\n");
        renderedBlocks.push(
          <pre
            key={`code-${blockIndex++}`}
            className="p-3 my-2.5 rounded-md bg-surface-3 border-2 border-border-strong text-xs font-mono text-foreground overflow-x-auto shadow-brutal-sm whitespace-pre"
          >
            <code>{codeText}</code>
          </pre>,
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        // Opening code block
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // Unordered list item (- or *)
    const listMatch = rawLine.match(/^[-*]\s+(.*)$/);
    if (listMatch && listMatch[1]) {
      listItems.push(listMatch[1]);
      continue;
    } else {
      flushList();
    }

    // Empty line -> spacing
    if (!trimmed) {
      renderedBlocks.push(<div key={`empty-${blockIndex++}`} className="h-2" />);
      continue;
    }

    // Headings
    if (trimmed.startsWith("# ")) {
      renderedBlocks.push(
        <h1
          key={`h1-${blockIndex++}`}
          className="text-base sm:text-lg font-black font-sans tracking-tight text-foreground mt-4 mb-2 pb-1 border-b-2 border-border"
        >
          {renderInlineContent(trimmed.slice(2), onSeek, `h1-${blockIndex}`)}
        </h1>,
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      renderedBlocks.push(
        <h2
          key={`h2-${blockIndex++}`}
          className="text-sm sm:text-base font-bold font-sans tracking-tight text-foreground mt-3 mb-1.5"
        >
          {renderInlineContent(trimmed.slice(3), onSeek, `h2-${blockIndex}`)}
        </h2>,
      );
      continue;
    }
    if (trimmed.startsWith("### ")) {
      renderedBlocks.push(
        <h3
          key={`h3-${blockIndex++}`}
          className="text-xs sm:text-sm font-bold font-sans text-foreground mt-2.5 mb-1"
        >
          {renderInlineContent(trimmed.slice(4), onSeek, `h3-${blockIndex}`)}
        </h3>,
      );
      continue;
    }

    // Blockquote (> )
    if (trimmed.startsWith("> ")) {
      renderedBlocks.push(
        <blockquote
          key={`quote-${blockIndex++}`}
          className="border-l-4 border-primary bg-surface-2 p-2 px-3 my-2 text-xs italic font-mono text-muted-foreground rounded-r"
        >
          {renderInlineContent(trimmed.slice(2), onSeek, `quote-${blockIndex}`)}
        </blockquote>,
      );
      continue;
    }

    // Regular paragraph line
    renderedBlocks.push(
      <p
        key={`p-${blockIndex++}`}
        className="my-1.5 text-xs sm:text-sm font-mono text-foreground leading-relaxed break-words"
      >
        {renderInlineContent(rawLine, onSeek, `p-${blockIndex}`)}
      </p>,
    );
  }

  flushList();

  if (inCodeBlock && codeBlockLines.length > 0) {
    renderedBlocks.push(
      <pre
        key={`code-unclosed-${blockIndex++}`}
        className="p-3 my-2.5 rounded-md bg-surface-3 border-2 border-border-strong text-xs font-mono text-foreground overflow-x-auto whitespace-pre shadow-brutal-sm"
      >
        <code>{codeBlockLines.join("\n")}</code>
      </pre>,
    );
  }

  return <div className="space-y-0.5">{renderedBlocks}</div>;
}

