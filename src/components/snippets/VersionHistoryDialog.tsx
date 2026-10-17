import { useMemo, useState } from "react";
import {
  CameraIcon,
  CheckIcon,
  ClockIcon,
  GitCommitIcon,
  RotateCcwIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelativeTime } from "@/hooks/useRelativeTime";
import { computeDiffStats, computeLineDiff } from "@/lib/diff";
import { cn } from "@/lib/utils";
import { useSnippetStore } from "@/stores/snippet-store";
import type { Snippet } from "@/types/snippet";

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snippet?: Snippet;
  snippetId?: string;
}

export function VersionHistoryDialog({
  open,
  onOpenChange,
  snippet: propSnippet,
  snippetId,
}: VersionHistoryDialogProps) {
  const storeSnippet = useSnippetStore((store) =>
    snippetId ? store.snippets.find((s) => s.id === snippetId) : undefined,
  );
  const snippet = propSnippet ?? storeSnippet;

  const addHistorySnapshot = useSnippetStore(
    (store) => store.addHistorySnapshot,
  );
  const restoreSnippetVersion = useSnippetStore(
    (store) => store.restoreSnippetVersion,
  );

  const history = snippet?.history ?? [];
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    history[0]?.id ?? null,
  );

  if (!snippet) return null;

  // Sync default selected when dialog opens or history changes
  const activeSelectedId =
    selectedHistoryId && history.some((h) => h.id === selectedHistoryId)
      ? selectedHistoryId
      : (history[0]?.id ?? null);

  const selectedRevision = useMemo(
    () => history.find((h) => h.id === activeSelectedId),
    [history, activeSelectedId],
  );

  // Compare selected revision code against CURRENT snippet code
  const diffLines = useMemo(() => {
    if (!selectedRevision) return [];
    return computeLineDiff(selectedRevision.code, snippet.code);
  }, [selectedRevision, snippet.code]);

  const diffStats = useMemo(() => computeDiffStats(diffLines), [diffLines]);

  const handleTakeSnapshot = () => {
    addHistorySnapshot(snippet.id, "Manual checkpoint");
    toast.success("Saved new revision snapshot");
  };

  const handleRestore = () => {
    if (!activeSelectedId) return;
    restoreSnippetVersion(snippet.id, activeSelectedId);
    toast.success("Restored snippet to historical revision");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[650px] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-3 border-b flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ClockIcon className="size-4 text-primary" />
              Version History & Rollback
            </DialogTitle>
            <DialogDescription className="text-xs">
              Inspect historical revisions, view visual diffs, and revert anytime.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTakeSnapshot}
              className="gap-1.5 text-xs h-8"
            >
              <CameraIcon className="size-3.5" />
              Save Checkpoint
            </Button>
            {selectedRevision && (
              <Button
                size="sm"
                onClick={handleRestore}
                className="gap-1.5 text-xs h-8"
              >
                <RotateCcwIcon className="size-3.5" />
                Restore This Revision
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden divide-x">
          {/* Revisions Sidebar */}
          <div className="w-64 shrink-0 flex flex-col bg-muted/20">
            <div className="p-2.5 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Revisions ({history.length})
            </div>
            <ScrollArea className="flex-1">
              {history.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No snapshots recorded yet. Click &quot;Save Checkpoint&quot; to
                  snapshot the current code state.
                </div>
              ) : (
                <div className="p-1 space-y-1">
                  {history.map((entry) => {
                    const isSelected = entry.id === activeSelectedId;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setSelectedHistoryId(entry.id)}
                        className={cn(
                          "w-full text-left rounded-md px-2.5 py-2 text-xs transition-colors flex flex-col gap-1 border",
                          isSelected
                            ? "bg-accent text-accent-foreground border-border shadow-xs"
                            : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium truncate max-w-[130px]">
                            {entry.summary || "Snapshot"}
                          </span>
                          <span className="text-[10px] opacity-70 tabular-nums">
                            {formatRelativeTime(entry.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] opacity-70">
                          <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          <span className="uppercase">{entry.language}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Visual Diff Panel */}
          <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
            {selectedRevision ? (
              <>
                <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/30 text-xs">
                  <div className="flex items-center gap-2">
                    <GitCommitIcon className="size-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      Comparing revision ({new Date(selectedRevision.timestamp).toLocaleDateString()}{" "}
                      {new Date(selectedRevision.timestamp).toLocaleTimeString()}) with Current
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-500 font-mono font-medium">
                      +{diffStats.additions}
                    </span>
                    <span className="text-rose-500 font-mono font-medium">
                      -{diffStats.deletions}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-auto font-mono text-xs leading-5">
                  {diffLines.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <CheckIcon className="size-8 mx-auto mb-2 text-emerald-500" />
                      Revision matches current code exactly.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/20">
                      {diffLines.map((line, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-start px-3 py-0.5",
                            line.type === "insert" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                            line.type === "delete" && "bg-rose-500/15 text-rose-700 dark:text-rose-300",
                            line.type === "equal" && "text-foreground hover:bg-muted/40",
                          )}
                        >
                          <span className="w-10 shrink-0 select-none text-[10px] text-muted-foreground/60 text-right pr-2">
                            {line.oldLineNumber ?? ""}
                          </span>
                          <span className="w-10 shrink-0 select-none text-[10px] text-muted-foreground/60 text-right pr-3">
                            {line.newLineNumber ?? ""}
                          </span>
                          <span className="w-4 shrink-0 select-none font-bold">
                            {line.type === "insert" ? "+" : line.type === "delete" ? "-" : " "}
                          </span>
                          <span className="flex-1 whitespace-pre-wrap break-all">
                            {line.text || " "}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <ClockIcon className="size-10 mb-2 opacity-30" />
                <p className="text-sm font-medium">No revision selected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Select a historical snapshot on the left to inspect code diffs.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
