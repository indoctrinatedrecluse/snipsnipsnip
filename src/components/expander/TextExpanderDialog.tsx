import { useState } from "react";
import {
  ZapIcon,
  CheckIcon,
  CopyIcon,
  TerminalIcon,
  InfoIcon,
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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { matchExpansionPrefix, expandSnippetTemplate } from "@/lib/expander/expander";
import { useSnippetStore } from "@/stores/snippet-store";

interface TextExpanderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TextExpanderDialog({
  open,
  onOpenChange,
}: TextExpanderDialogProps) {
  const snippets = useSnippetStore((s) => s.snippets);
  const updateSnippet = useSnippetStore((s) => s.updateSnippet);

  const [testBuffer, setTestBuffer] = useState("");
  const [lastExpanded, setLastExpanded] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeShortcuts = snippets.filter(
    (s) => !s.deletedAt && s.shortcutPrefix && s.shortcutPrefix.trim().length > 0,
  );

  const handleTestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const match = matchExpansionPrefix(snippets, val);
    if (match) {
      // Replace the prefix in the test input with the expanded snippet
      const newText =
        val.slice(0, val.length - match.prefix.length) + match.expanded;
      setTestBuffer(newText);
      setLastExpanded(match.snippet.title);
      toast.success(`Expanded “${match.prefix}” -> “${match.snippet.title}”`);
    } else {
      setTestBuffer(val);
    }
  };

  const handleCopySnippet = async (snippetId: string, code: string) => {
    try {
      const expanded = expandSnippetTemplate(code);
      await navigator.clipboard.writeText(expanded);
      setCopiedId(snippetId);
      toast.success("Copied expanded snippet to clipboard");
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <ZapIcon className="size-5 text-amber-500 fill-amber-500" />
            Text Expansion & Trigger Abbreviations
          </DialogTitle>
          <DialogDescription className="text-xs">
            Type keyword abbreviations anywhere in the app to instantly expand snippets,
            with dynamic tokens like <code className="text-foreground">{"{{date}}"}</code> and <code className="text-foreground">{"{{uuid}}"}</code>.
          </DialogDescription>
        </DialogHeader>

        {/* Live Test Playground */}
        <div className="p-3.5 rounded-lg border bg-muted/30 space-y-2 mt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-1.5 text-foreground">
              <TerminalIcon className="size-3.5 text-primary" />
              Live Expansion Playground
            </span>
            {lastExpanded && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                Last matched: {lastExpanded}
              </span>
            )}
          </div>
          <Input
            value={testBuffer}
            onChange={handleTestInputChange}
            placeholder="Type any configured abbreviation here (e.g. ;clg or ;date) to test..."
            className="h-9 text-xs font-mono bg-background"
          />
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <InfoIcon className="size-3" />
            <span>Try typing an abbreviation suffix; it will instantly auto-expand inline!</span>
          </div>
        </div>

        {/* Shortcuts list */}
        <div className="flex-1 min-h-[220px] flex flex-col pt-2">
          <div className="flex items-center justify-between text-xs font-semibold pb-1.5 border-b">
            <span>Configured Abbreviations ({activeShortcuts.length})</span>
            <span className="text-[11px] text-muted-foreground font-normal">
              Edit triggers inside any snippet detail pane
            </span>
          </div>

          {activeShortcuts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2">
              <ZapIcon className="size-8 opacity-30 text-amber-500" />
              <div className="text-xs font-medium">No expansion abbreviations configured</div>
              <div className="text-[11px] max-w-xs">
                Open any snippet and add a shortcut prefix like{" "}
                <code className="text-foreground font-mono">;log</code> or{" "}
                <code className="text-foreground font-mono">;comp</code> in the header.
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 pt-2">
              <div className="space-y-1.5">
                {activeShortcuts.map((snippet) => {
                  const isEnabled = snippet.shortcutEnabled !== false;
                  return (
                    <div
                      key={snippet.id}
                      className="flex items-center justify-between p-2.5 rounded-md border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {snippet.shortcutPrefix}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground truncate">
                            {snippet.title || "Untitled snippet"}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {snippet.description || `${snippet.language} snippet`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateSnippet(snippet.id, {
                              shortcutEnabled: !isEnabled,
                            })
                          }
                          className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                            isEnabled
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {isEnabled ? "Active" : "Paused"}
                        </button>

                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="Copy expanded code"
                          onClick={() => handleCopySnippet(snippet.id, snippet.code)}
                        >
                          {copiedId === snippet.id ? (
                            <CheckIcon className="size-3.5 text-emerald-500" />
                          ) : (
                            <CopyIcon className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
