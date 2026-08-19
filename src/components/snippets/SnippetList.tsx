import { StarIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/hooks/useRelativeTime";
import { getLanguageLabel } from "@/lib/languages";
import { cn } from "@/lib/utils";
import type { Snippet } from "@/types/snippet";

interface SnippetListProps {
  snippets: Snippet[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function SnippetList({ snippets, activeId, onSelect }: SnippetListProps) {
  if (snippets.length === 0) {
    return (
      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
        No snippets found. Create one with Ctrl+N.
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {snippets.map((snippet) => {
        const isActive = snippet.id === activeId;
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
                  {snippet.title || "Untitled snippet"}
                </span>
                {snippet.isFavorite && (
                  <StarIcon className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                )}
              </span>
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
