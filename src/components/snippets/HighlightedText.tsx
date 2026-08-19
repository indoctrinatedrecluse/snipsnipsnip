import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface HighlightedTextProps {
  text: string;
  /** Inclusive [start, end] ranges (Fuse.js format) to highlight. */
  indices?: ReadonlyArray<readonly [number, number]>;
  className?: string;
}

/**
 * Renders `text` with any matched ranges wrapped in a <mark> highlight.
 * Used by the snippet list to show *why* a snippet matched the search.
 */
export function HighlightedText({
  text,
  indices,
  className,
}: HighlightedTextProps) {
  if (!indices || indices.length === 0) return <>{text}</>;

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const [start, end] of indices) {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark
        key={start}
        className={cn(
          "rounded-sm bg-amber-400/40 text-inherit",
          className,
        )}
      >
        {text.slice(start, end + 1)}
      </mark>,
    );
    cursor = end + 1;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}
