import { FolderIcon, StarIcon, Trash2Icon } from "lucide-react";

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
  emptyMessage?: string;
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

export function SnippetList({
  results,
  activeId,
  onSelect,
  emptyMessage = "No snippets found. Try a different search, or create one with Ctrl+N.",
}: SnippetListProps) {
  if (results.length === 0) {
    return (
      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {results.map(({ snippet, highlights }) => {
        const isActive = snippet.id === activeId;
        const preview = snippet.code ? codePreview(snippet.code) : "";
        const isTrashed = Boolean(snippet.deletedAt);

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
                isTrashed && "opacity-75",
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
                {isTrashed && (
                  <Trash2Icon className="size-3 shrink-0 text-destructive" />
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
              <span className="flex w-full items-center gap-1.5 flex-wrap">
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {getLanguageLabel(snippet.language)}
                </Badge>
                {snippet.folder && (
                  <span className="inline-flex items-center gap-1 rounded bg-muted/70 px-1.5 py-0 text-[10px] text-muted-foreground">
                    <FolderIcon className="size-2.5" />
                    {snippet.folder}
                  </span>
                )}
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
