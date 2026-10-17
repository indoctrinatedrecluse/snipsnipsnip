import { useEffect, useState } from "react";
import { FolderIcon, LockIcon, RotateCcwIcon, Trash2Icon, UnlockIcon, ZapIcon } from "lucide-react";
import { toast } from "sonner";

import { CodeEditor } from "@/components/editor/CodeEditor";
import { FindReplaceBar } from "@/components/editor/FindReplaceBar";
import { HighlightedCode } from "@/components/editor/HighlightedCode";
import { Toolbar, type EditorMode } from "@/components/layout/Toolbar";
import { SandboxPanel } from "@/components/sandbox/SandboxPanel";
import { SnippetFileTabs } from "@/components/snippets/SnippetFileTabs";
import { TagInput } from "@/components/snippets/TagInput";
import { VaultDialog } from "@/components/vault/VaultDialog";
import { getSnippetFiles } from "@/types/snippet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFindReplace } from "@/hooks/useFindReplace";
import { useHotkeys } from "@/hooks/useHotkeys";
import { formatRelativeTime } from "@/hooks/useRelativeTime";
import { useSettingsStore } from "@/stores/settings-store";
import { useSnippetStore } from "@/stores/snippet-store";

export function SnippetDetail() {
  const snippet = useSnippetStore((store) =>
    store.snippets.find((item) => item.id === store.activeId),
  );
  const updateSnippet = useSnippetStore((store) => store.updateSnippet);
  const restoreSnippet = useSnippetStore((store) => store.restoreSnippet);
  const deleteSnippet = useSnippetStore((store) => store.deleteSnippet);
  const setSnippetFolder = useSnippetStore((store) => store.setSnippetFolder);
  const addHistorySnapshot = useSnippetStore((store) => store.addHistorySnapshot);
  const folders = useSnippetStore((store) => store.folders);
  const theme = useSettingsStore((store) => store.theme);

  const [mode, setMode] = useState<EditorMode>("edit");
  const [showSandbox, setShowSandbox] = useState(false);
  const [showVaultDialog, setShowVaultDialog] = useState(false);

  // Reset to edit mode whenever a different snippet is opened.
  useEffect(() => {
    setMode("edit");
  }, [snippet?.id]);

  // Debounce history snapshot capture on code edit
  useEffect(() => {
    if (!snippet?.id || !snippet?.code) return;
    const timer = setTimeout(() => {
      addHistorySnapshot(snippet.id, "Auto save");
    }, 2500);
    return () => clearTimeout(timer);
  }, [snippet?.code, snippet?.id, addHistorySnapshot]);

  const find = useFindReplace(snippet?.code ?? "");

  useHotkeys({
    "ctrl+f": (event) => {
      event.preventDefault();
      find.openFind();
    },
    "ctrl+shift+c": async (event) => {
      event.preventDefault();
      if (!snippet?.code) return;
      try {
        await navigator.clipboard.writeText(snippet.code);
        toast.success("Copied to clipboard");
      } catch {
        toast.error("Failed to copy code");
      }
    },
    "ctrl+enter": (event) => {
      event.preventDefault();
      setShowSandbox((prev) => !prev);
    },
  });

  if (!snippet) return null;

  const isTrashed = Boolean(snippet.deletedAt);

  const applyCodeChange = (code: string) =>
    updateSnippet(snippet.id, { code });

  return (
    <div className="flex h-full min-w-0 flex-col">
      {isTrashed && (
        <div className="flex items-center justify-between border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <div className="flex items-center gap-2">
            <Trash2Icon className="size-4" />
            <span className="font-medium">This snippet is in Trash.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => {
                restoreSnippet(snippet.id);
                toast.success("Snippet restored");
              }}
            >
              <RotateCcwIcon className="size-3.5" />
              Restore
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              onClick={() => {
                deleteSnippet(snippet.id);
                toast.success("Permanently deleted");
              }}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 border-b px-4 pt-4 pb-3">
        <Input
          value={snippet.title}
          onChange={(event) =>
            updateSnippet(snippet.id, { title: event.target.value })
          }
          placeholder="Untitled snippet"
          aria-label="Snippet title"
          className="h-9 border-none bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
        />
        <Input
          value={snippet.description}
          onChange={(event) =>
            updateSnippet(snippet.id, { description: event.target.value })
          }
          placeholder="Add a description…"
          aria-label="Snippet description"
          className="h-7 border-none bg-transparent px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
        />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <TagInput
            value={snippet.tags}
            onChange={(tags) => updateSnippet(snippet.id, { tags })}
            className="w-full sm:max-w-md"
          />

          <div className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs">
            <FolderIcon className="size-3.5 text-muted-foreground" />
            <Select
              value={snippet.folder ?? "none"}
              onValueChange={(val) =>
                setSnippetFolder(snippet.id, val && val !== "none" ? val : undefined)
              }
            >
              <SelectTrigger
                aria-label="Collection folder"
                className="h-5 border-none bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
              >
                <SelectValue placeholder="No collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unfiled (no collection)</SelectItem>
                {folders.map((folderName) => (
                  <SelectItem key={folderName} value={folderName}>
                    {folderName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs"
            title="Text expansion trigger prefix (e.g. ;clg or ;date)"
          >
            <ZapIcon className="size-3.5 text-amber-500 fill-amber-500" />
            <Input
              value={snippet.shortcutPrefix ?? ""}
              onChange={(e) =>
                updateSnippet(snippet.id, {
                  shortcutPrefix: e.target.value.trim(),
                  shortcutEnabled: true,
                })
              }
              placeholder="Prefix (;clg)"
              aria-label="Expansion trigger prefix"
              className="h-5 border-none bg-transparent p-0 text-xs font-mono shadow-none focus-visible:ring-0 w-20"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Updated {formatRelativeTime(snippet.updatedAt)}
        </p>
      </div>

      <Toolbar
        snippetId={snippet.id}
        mode={mode}
        onModeChange={setMode}
        showSandbox={showSandbox}
        onToggleSandbox={() => setShowSandbox((prev) => !prev)}
      />

      <div className="min-h-0 flex-1 p-4">
        <div className="flex size-full flex-col overflow-hidden rounded-lg border bg-background">
          <SnippetFileTabs snippet={snippet} />
          {find.open && (
            <FindReplaceBar
              findQuery={find.findQuery}
              onFindQueryChange={find.setFindQuery}
              replaceQuery={find.replaceQuery}
              onReplaceQueryChange={find.setReplaceQuery}
              useRegex={find.useRegex}
              onUseRegexChange={find.setUseRegex}
              caseSensitive={find.caseSensitive}
              onCaseSensitiveChange={find.setCaseSensitive}
              matchCount={find.matches.length}
              matchIndex={find.matchIndex}
              regexError={find.regexError}
              onNext={find.next}
              onPrev={find.prev}
              onReplace={() => find.replace(applyCodeChange)}
              onReplaceAll={() => find.replaceAll(applyCodeChange)}
              onClose={() => find.setOpen(false)}
            />
          )}
          <div className="min-h-0 flex-1">
            {snippet.isEncrypted && snippet.code.includes("Locked with AES-GCM-256") ? (
              <div className="flex flex-col items-center justify-center size-full p-8 text-center bg-muted/10 space-y-3">
                <div className="size-14 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <LockIcon className="size-6 text-amber-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    Encrypted Vault Snippet
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    This snippet is protected with zero-knowledge AES-GCM-256 encryption. Unlock with your passphrase to view or edit.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowVaultDialog(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                >
                  <UnlockIcon className="size-3.5" />
                  Unlock Snippet
                </Button>
              </div>
            ) : mode === "edit" ? (
              <CodeEditor
                value={snippet.code}
                onChange={applyCodeChange}
                language={snippet.language}
                theme={theme}
                placeholder="Start typing your code..."
                matches={find.matches}
                currentMatchIndex={find.matchIndex}
              />
            ) : (
              <HighlightedCode
                code={snippet.code}
                language={snippet.language}
                theme={theme}
                className="size-full p-4"
              />
            )}
          </div>
          {showSandbox && (
            <SandboxPanel
              files={getSnippetFiles(snippet)}
              code={snippet.code}
              language={snippet.language}
              onClose={() => setShowSandbox(false)}
            />
          )}
        </div>
      </div>

      <VaultDialog
        open={showVaultDialog}
        onOpenChange={setShowVaultDialog}
        snippet={snippet}
      />
    </div>
  );
}
