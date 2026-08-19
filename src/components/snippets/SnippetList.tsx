import { StarIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { HighlightedText } from "@/components/snippets/HighlightedText";
import { formatRelativeTime } from "@/hooks/useRelativeTime";
import { getLanguageLabel } from "@/lib/languages";
import type { SnippetSearchResult } from "@/lib/search";
import { cn } from "@/lib/utils";

interface SnippetListProps {
  results: SnippetSearchResult[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

type MatchIndices = ReadonlyArray<readonly [number, number]>;

function clampIndices(
  indices: MatchIndices | undefined,
  limit: number,
): MatchIndices | undefined {
  if (!indices) return undefined;
  return indices
    .filter(([start]) => start < limit)
    .map(([start, end]) => [start, Math.min(end, limit - 1)] as const);
}

function codePreview(code: string): string {
  const firstLine = code.split("\n")[0] ?? "";
  return firstLine.length > 60 ? firstLine.slice(0, 57) + "…" : firstLine;
}

export function SnippetList({ results, activeId, onSelect }: SnippetListProps) {
  if (results.length === 0) {
    return (
      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
        No snippets found. Try a different search, or create one with Ctrl+N.
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {results.map(({ snippet, highlights }) => {
        const isActive = snippet.id === activeId;
        const preview = snippet.code ? codePreview(snippet.code) : "";
        return (
          <li key={snippet.id}>
            <button
              type="button"
              onClick={() => onSelect(snippet.id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "group flex w-full flex-col gap-1 rounded-lg px-3 py-2 text-left transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50",
              )}
            >
              <span className="flex w-full items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  <HighlightedText
                    text={snippet.title || "Untitled snippet"}
                    indices={highlights.title}
                  />
                </span>
                {snippet.isFavorite && (
                  <StarIcon className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                )}
              </span>
              {snippet.description && (
                <span className="truncate text-xs text-muted-foreground">
                  <HighlightedText
                    text={snippet.description}
                    indices={highlights.description}
                  />
                </span>
              )}
              {preview && (
                <span className="truncate font-mono text-xs text-muted-foreground/80">
                  <HighlightedText
                    text={preview}
                    indices={clampIndices(highlights.code, preview.length)}
                  />
                </span>
              )}
              <span className="flex w-full items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {getLanguageLabel(snippet.language)}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatRelativeTime(snippet.updatedAt)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
