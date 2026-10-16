import { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardCopyIcon,
  ClipboardPasteIcon,
  CornerDownLeftIcon,
  FolderIcon,
  SearchIcon,
  StarIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { detectLanguageFromCode, getLanguageLabel } from "@/lib/languages";
import { searchSnippets } from "@/lib/search";
import { cn } from "@/lib/utils";
import { useSnippetStore } from "@/stores/snippet-store";

interface SpotlightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpotlightDialog({ open, onOpenChange }: SpotlightDialogProps) {
  const snippets = useSnippetStore((store) => store.snippets);
  const addSnippet = useSnippetStore((store) => store.addSnippet);
  const setActive = useSnippetStore((store) => store.setActive);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter out trashed snippets from spotlight
  const activeSnippets = useMemo(
    () => snippets.filter((s) => !s.deletedAt),
    [snippets],
  );

  const results = useMemo(
    () => searchSnippets(activeSnippets, query, null),
    [activeSnippets, query],
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleCopySnippet = async (index: number) => {
    const item = results[index]?.snippet;
    if (!item) return;
    try {
      await navigator.clipboard.writeText(item.code);
      toast.success(`Copied “${item.title || "snippet"}” code`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to copy snippet");
    }
  };

  const handleSelectSnippet = (index: number) => {
    const item = results[index]?.snippet;
    if (!item) return;
    setActive(item.id);
    onOpenChange(false);
  };

  const handleQuickCapture = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.error("Clipboard is empty.");
        return;
      }
      const firstLine = text.trim().split("\n")[0].slice(0, 40);
      const title = firstLine || "Quick captured snippet";
      const detected = detectLanguageFromCode(text) || "plaintext";
      const id = addSnippet({
        title,
        code: text,
        language: detected,
        tags: ["quick-capture"],
      });
      setActive(id);
      toast.success("Captured from clipboard!");
      onOpenChange(false);
    } catch {
      toast.error("Unable to read clipboard. Check permissions.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? Math.max(0, results.length - 1) : prev - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        handleSelectSnippet(selectedIndex);
      } else {
        void handleCopySnippet(selectedIndex);
      }
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") {
      e.preventDefault();
      void handleQuickCapture();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl gap-0 overflow-hidden p-0 border shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center border-b px-3 py-2.5">
          <SearchIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search snippets to copy code, or press Ctrl+Shift+V to quick capture..."
            className="h-8 border-none bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          />
          <button
            type="button"
            onClick={() => void handleQuickCapture()}
            className="ml-2 inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title="Quick Capture Clipboard (Ctrl+Shift+V)"
          >
            <ClipboardPasteIcon className="size-3.5" />
            Capture Clipboard
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No matching snippets found.
            </div>
          ) : (
            <ul className="space-y-0.5">
              {results.map(({ snippet }, index) => {
                const isSelected = index === selectedIndex;
                const firstLine = snippet.code.split("\n")[0] ?? "";
                const preview =
                  firstLine.length > 55 ? firstLine.slice(0, 52) + "…" : firstLine;

                return (
                  <li key={snippet.id}>
                    <button
                      type="button"
                      onClick={() => void handleCopySnippet(index)}
                      className={cn(
                        "group flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors",
                        isSelected
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted/50",
                      )}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-sm">
                            {snippet.title || "Untitled snippet"}
                          </span>
                          {snippet.isFavorite && (
                            <StarIcon className="size-3 shrink-0 fill-amber-400 text-amber-400" />
                          )}
                          {snippet.folder && (
                            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0 text-[10px] text-muted-foreground">
                              <FolderIcon className="size-2.5" />
                              {snippet.folder}
                            </span>
                          )}
                        </div>
                        {preview && (
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {preview}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {getLanguageLabel(snippet.language)}
                        </Badge>
                        <span className="hidden items-center gap-1 text-[10px] text-muted-foreground group-hover:inline-flex">
                          <ClipboardCopyIcon className="size-3" />
                          Copy
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded bg-muted px-1 font-mono text-[10px]">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="rounded bg-muted px-1 font-mono text-[10px]">
                <CornerDownLeftIcon className="inline size-2.5" />
              </kbd> copy code
            </span>
            <span>
              <kbd className="rounded bg-muted px-1 font-mono text-[10px]">Ctrl+Enter</kbd> open in editor
            </span>
          </div>
          <span>
            {results.length} snippet{results.length === 1 ? "" : "s"}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
