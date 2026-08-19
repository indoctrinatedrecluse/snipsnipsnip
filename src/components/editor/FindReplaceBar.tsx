import {
  ArrowDownIcon,
  ArrowUpIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FindReplaceBarProps {
  findQuery: string;
  onFindQueryChange: (value: string) => void;
  replaceQuery: string;
  onReplaceQueryChange: (value: string) => void;
  useRegex: boolean;
  onUseRegexChange: (value: boolean) => void;
  caseSensitive: boolean;
  onCaseSensitiveChange: (value: boolean) => void;
  matchCount: number;
  matchIndex: number;
  regexError: string | null;
  onNext: () => void;
  onPrev: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

/**
 * Compact find & replace bar, VS Code-style. Enter = next match,
 * Shift+Enter = previous, Alt+Enter = replace all, Esc = close.
 */
export function FindReplaceBar({
  findQuery,
  onFindQueryChange,
  replaceQuery,
  onReplaceQueryChange,
  useRegex,
  onUseRegexChange,
  caseSensitive,
  onCaseSensitiveChange,
  matchCount,
  matchIndex,
  regexError,
  onNext,
  onPrev,
  onReplace,
  onReplaceAll,
  onClose,
}: FindReplaceBarProps) {
  const canNavigate = matchCount > 0;
  const countLabel = regexError
    ? "Invalid regex"
    : canNavigate
      ? `${matchIndex + 1} / ${matchCount}`
      : "0 / 0";

  return (
    <div className="flex flex-col gap-2 border-b bg-muted/30 p-2 text-sm">
      <div className="flex items-center gap-1.5">
        <SearchIcon className="ml-1 size-4 shrink-0 text-muted-foreground" />
        <Input
          value={findQuery}
          onChange={(event) => onFindQueryChange(event.target.value)}
          placeholder="Find"
          autoFocus
          aria-label="Find"
          className="h-7 flex-1"
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.shiftKey) {
              event.preventDefault();
              onPrev();
            } else if (event.key === "Enter") {
              event.preventDefault();
              onNext();
            } else if (event.key === "Escape") {
              onClose();
            }
          }}
        />
        <span
          className={cn(
            "w-18 shrink-0 text-center text-xs tabular-nums",
            regexError ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {countLabel}
        </span>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onPrev}
          disabled={!canNavigate}
          aria-label="Previous match"
        >
          <ArrowUpIcon />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onNext}
          disabled={!canNavigate}
          aria-label="Next match"
        >
          <ArrowDownIcon />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={cn(
            "px-1.5 text-xs",
            caseSensitive && "bg-accent text-accent-foreground",
          )}
          onClick={() => onCaseSensitiveChange(!caseSensitive)}
          aria-pressed={caseSensitive}
          aria-label="Match case"
          title="Match case (Aa)"
        >
          Aa
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={cn(
            "px-1.5 font-mono text-xs",
            useRegex && "bg-accent text-accent-foreground",
          )}
          onClick={() => onUseRegexChange(!useRegex)}
          aria-pressed={useRegex}
          aria-label="Use regular expression"
          title="Use regular expression (.*)"
        >
          .*
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onClose}
          aria-label="Close find"
        >
          <XIcon />
        </Button>
      </div>

      <div className="flex items-center gap-1.5 pl-7">
        <Input
          value={replaceQuery}
          onChange={(event) => onReplaceQueryChange(event.target.value)}
          placeholder="Replace"
          aria-label="Replace"
          className="h-7 flex-1"
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.altKey) {
              event.preventDefault();
              onReplaceAll();
            } else if (event.key === "Enter") {
              event.preventDefault();
              onReplace();
            } else if (event.key === "Escape") {
              onClose();
            }
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={onReplace}
          disabled={!canNavigate}
        >
          Replace
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={onReplaceAll}
          disabled={!canNavigate}
        >
          Replace all
        </Button>
      </div>
    </div>
  );
}
