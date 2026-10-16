import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface HighlightedTextProps {
  text: string;
  /** Inclusive [start, end] ranges (Fuse.js format) to highlight. */
  indices?: ReadonlyArray<readonly [number, number]>;
  className?: string;
}

/**
 * Renders `text` with matched ranges wrapped in a <mark> highlight.
 * Merges overlapping ranges and guards against out-of-bounds indices.
 */
export function HighlightedText({
  text,
  indices,
  className,
}: HighlightedTextProps) {
  if (!indices || indices.length === 0 || !text) return <>{text}</>;

  // Sort and merge overlapping/adjacent ranges safely
  const sorted = [...indices]
    .filter(([start, end]) => start <= end && start < text.length)
    .sort((a, b) => a[0] - b[0]);

  if (sorted.length === 0) return <>{text}</>;

  const merged: Array<[number, number]> = [];
  for (const [start, end] of sorted) {
    const clampedEnd = Math.min(end, text.length - 1);
    const last = merged[merged.length - 1];
    if (last && start <= last[1] + 1) {
      last[1] = Math.max(last[1], clampedEnd);
    } else {
      merged.push([start, clampedEnd]);
    }
  }

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) {
      parts.push(text.slice(cursor, start));
    }
    parts.push(
      <mark
        key={`${start}-${end}`}
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
  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }
  return <>{parts}</>;
}
