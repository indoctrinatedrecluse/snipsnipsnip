import { useState, type KeyboardEvent } from "react";
import { FileCodeIcon, PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSnippetStore } from "@/stores/snippet-store";
import { getActiveFile, getSnippetFiles, type Snippet } from "@/types/snippet";

interface SnippetFileTabsProps {
  snippet: Snippet;
}

export function SnippetFileTabs({ snippet }: SnippetFileTabsProps) {
  const addSnippetFile = useSnippetStore((store) => store.addSnippetFile);
  const updateSnippetFile = useSnippetStore((store) => store.updateSnippetFile);
  const deleteSnippetFile = useSnippetStore((store) => store.deleteSnippetFile);
  const setActiveSnippetFile = useSnippetStore(
    (store) => store.setActiveSnippetFile,
  );

  const files = getSnippetFiles(snippet);
  const activeFile = getActiveFile(snippet);

  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleStartRename = (fileId: string, currentName: string) => {
    setEditingFileId(fileId);
    setEditingName(currentName);
  };

  const handleFinishRename = (fileId: string) => {
    const trimmed = editingName.trim();
    if (trimmed) {
      updateSnippetFile(snippet.id, fileId, { name: trimmed });
    }
    setEditingFileId(null);
  };

  const handleRenameKeyDown = (e: KeyboardEvent<HTMLInputElement>, fileId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFinishRename(fileId);
    } else if (e.key === "Escape") {
      setEditingFileId(null);
    }
  };

  const handleAddFile = () => {
    const newId = addSnippetFile(snippet.id);
    toast.success("Added new file tab");
    setTimeout(() => {
      const added = getSnippetFiles(snippet).find((f) => f.id === newId);
      if (added) handleStartRename(newId, added.name);
    }, 50);
  };

  const handleDeleteFile = (fileId: string, name: string) => {
    if (files.length <= 1) return;
    deleteSnippetFile(snippet.id, fileId);
    toast.success(`Removed “${name}”`);
  };

  return (
    <div className="flex items-center gap-1 border-b bg-muted/40 px-3 py-1.5 overflow-x-auto text-xs">
      <div className="flex items-center gap-1 min-w-0">
        {files.map((file) => {
          const isActive = file.id === activeFile.id;
          const isEditing = editingFileId === file.id;

          return (
            <div
              key={file.id}
              className={cn(
                "group flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all select-none border",
                isActive
                  ? "bg-background text-foreground border-border shadow-xs font-medium"
                  : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <FileCodeIcon className="size-3.5 shrink-0 opacity-70" />

              {isEditing ? (
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleFinishRename(file.id)}
                  onKeyDown={(e) => handleRenameKeyDown(e, file.id)}
                  autoFocus
                  className="h-5 w-28 px-1 py-0 text-xs shadow-none border-primary"
                />
              ) : (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveSnippetFile(snippet.id, file.id)}
                  onDoubleClick={() => handleStartRename(file.id, file.name)}
                  className="truncate max-w-[140px] cursor-pointer"
                  title={`${file.name} (${file.language}) — double-click to rename`}
                >
                  {file.name}
                </span>
              )}

              {files.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(file.id, file.name);
                  }}
                  className="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity"
                  title="Remove file"
                  aria-label={`Remove ${file.name}`}
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <Button
        size="icon-xs"
        variant="ghost"
        onClick={handleAddFile}
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        title="Add file to snippet"
        aria-label="Add file to snippet"
      >
        <PlusIcon className="size-3.5" />
      </Button>

      {files.length > 1 && (
        <span className="ml-auto text-[11px] text-muted-foreground/70 shrink-0 tabular-nums">
          {files.length} files
        </span>
      )}
    </div>
  );
}
