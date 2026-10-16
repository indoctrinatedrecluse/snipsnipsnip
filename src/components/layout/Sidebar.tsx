import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Code2Icon,
  DownloadIcon,
  FolderIcon,
  FolderPlusIcon,
  InfoIcon,
  MoonIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  SunIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AboutDialog } from "@/components/layout/AboutDialog";
import { GistDialog } from "@/components/snippets/GistDialog";
import { SnippetList } from "@/components/snippets/SnippetList";
import { SyncStatus } from "@/components/layout/SyncStatus";
import { AppLogo } from "@/components/ui/app-logo";
import { GitHubIcon } from "@/components/ui/github-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadVsCodeSnippets } from "@/lib/ide-export";
import {
  buildExportPayload,
  downloadJson,
  exportFileName,
  parseImportPayload,
} from "@/lib/import-export";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
import { searchSnippets } from "@/lib/search";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings-store";
import { useSnippetStore } from "@/stores/snippet-store";

interface SidebarProps {
  onNew: () => void;
  onOpenSpotlight?: () => void;
}

export function Sidebar({ onNew, onOpenSpotlight }: SidebarProps) {
  const snippets = useSnippetStore((store) => store.snippets);
  const activeId = useSnippetStore((store) => store.activeId);
  const searchQuery = useSnippetStore((store) => store.searchQuery);
  const languageFilter = useSnippetStore((store) => store.languageFilter);
  const viewFilter = useSnippetStore((store) => store.viewFilter);
  const selectedFolder = useSnippetStore((store) => store.selectedFolder);
  const folders = useSnippetStore((store) => store.folders);

  const setSearchQuery = useSnippetStore((store) => store.setSearchQuery);
  const setLanguageFilter = useSnippetStore((store) => store.setLanguageFilter);
  const setViewFilter = useSnippetStore((store) => store.setViewFilter);
  const setSelectedFolder = useSnippetStore((store) => store.setSelectedFolder);
  const setActive = useSnippetStore((store) => store.setActive);
  const importSnippets = useSnippetStore((store) => store.importSnippets);
  const createFolder = useSnippetStore((store) => store.createFolder);
  const renameFolder = useSnippetStore((store) => store.renameFolder);
  const deleteFolder = useSnippetStore((store) => store.deleteFolder);
  const emptyTrash = useSnippetStore((store) => store.emptyTrash);

  const theme = useSettingsStore((store) => store.theme);
  const toggleTheme = useSettingsStore((store) => store.toggleTheme);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aboutOpen, setAboutOpen] = useState(false);
  const [gistImportOpen, setGistImportOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);

  // Group counts
  const activeSnippets = useMemo(
    () => snippets.filter((s) => !s.deletedAt),
    [snippets],
  );
  const trashedSnippets = useMemo(
    () => snippets.filter((s) => Boolean(s.deletedAt)),
    [snippets],
  );
  const favoriteCount = useMemo(
    () => activeSnippets.filter((s) => s.isFavorite).length,
    [activeSnippets],
  );

  // Filter pool based on active view navigation
  const pool = useMemo(() => {
    if (viewFilter === "trash") {
      return trashedSnippets;
    }
    if (viewFilter === "favorites") {
      return activeSnippets.filter((s) => s.isFavorite);
    }
    if (viewFilter === "folder" && selectedFolder) {
      return activeSnippets.filter((s) => s.folder === selectedFolder);
    }
    return activeSnippets;
  }, [viewFilter, activeSnippets, trashedSnippets, selectedFolder]);

  const searchResults = useMemo(
    () => searchSnippets(pool, searchQuery, languageFilter),
    [pool, searchQuery, languageFilter],
  );

  const handleExport = () => {
    if (activeSnippets.length === 0) {
      toast.error("Nothing to export yet.");
      return;
    }
    downloadJson(buildExportPayload(activeSnippets), exportFileName());
    toast.success(
      `Exported ${activeSnippets.length} snippet${activeSnippets.length === 1 ? "" : "s"}`,
    );
  };

  const handleExportVsCode = () => {
    if (activeSnippets.length === 0) {
      toast.error("Nothing to export yet.");
      return;
    }
    downloadVsCodeSnippets(activeSnippets);
    toast.success("Exported VS Code / Cursor snippets (.code-snippets)");
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = parseImportPayload(await file.text());
      if (imported.length === 0) {
        toast.error("No valid snippets found in that file.");
        return;
      }
      importSnippets(imported);
      toast.success(
        `Imported ${imported.length} snippet${imported.length === 1 ? "" : "s"}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Import failed.",
      );
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder(newFolderName.trim());
    setSelectedFolder(newFolderName.trim());
    setNewFolderName("");
    setNewFolderOpen(false);
    toast.success(`Created collection “${newFolderName.trim()}”`);
  };

  const handleRenameFolder = () => {
    if (!renamingFolder || !renameValue.trim()) return;
    renameFolder(renamingFolder, renameValue.trim());
    setRenamingFolder(null);
    setRenameValue("");
    toast.success("Collection renamed");
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <AppLogo className="size-7 rounded-md shadow-sm" size={28} />
          <span className="text-sm font-semibold tracking-tight">SnippetVault</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onNew}
            aria-label="New snippet (Ctrl+N)"
          >
            <PlusIcon />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="More options"
                />
              }
            >
              <MoreVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExport}>
                <DownloadIcon />
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportVsCode}>
                <Code2Icon />
                Export VS Code (.code-snippets)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <UploadIcon />
                Import JSON…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGistImportOpen(true)}>
                <GitHubIcon />
                Import from GitHub Gist…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAboutOpen(true)}>
                <InfoIcon />
                About SnippetVault
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void handleImportFile(event)}
          />
        </div>
      </header>

      {/* Navigation Views */}
      <div className="px-3 py-1 space-y-0.5">
        <button
          type="button"
          onClick={() => {
            setViewFilter("all");
            setSelectedFolder(null);
          }}
          className={cn(
            "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            viewFilter === "all"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          <span className="flex items-center gap-2">
            <Code2Icon className="size-3.5" />
            All Snippets
          </span>
          <span className="tabular-nums text-[11px] opacity-70">
            {activeSnippets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewFilter("favorites");
            setSelectedFolder(null);
          }}
          className={cn(
            "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            viewFilter === "favorites"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          <span className="flex items-center gap-2">
            <StarIcon className="size-3.5 fill-amber-400/30 text-amber-500" />
            Favorites
          </span>
          <span className="tabular-nums text-[11px] opacity-70">
            {favoriteCount}
          </span>
        </button>

        {/* Collections / Folders Section */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Collections</span>
            <button
              type="button"
              onClick={() => setNewFolderOpen(true)}
              className="rounded p-0.5 hover:bg-muted hover:text-foreground"
              title="Add Collection"
            >
              <FolderPlusIcon className="size-3.5" />
            </button>
          </div>

          <div className="space-y-0.5 max-h-36 overflow-y-auto">
            {folders.map((folderName) => {
              const isSelected =
                viewFilter === "folder" && selectedFolder === folderName;
              const count = activeSnippets.filter(
                (s) => s.folder === folderName,
              ).length;

              return (
                <div
                  key={folderName}
                  className={cn(
                    "group flex items-center justify-between rounded-md px-2.5 py-1 text-xs transition-colors",
                    isSelected
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedFolder(folderName)}
                    className="flex flex-1 items-center gap-2 truncate text-left"
                  >
                    <FolderIcon className="size-3.5 shrink-0" />
                    <span className="truncate">{folderName}</span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] tabular-nums opacity-60">
                      {count}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            className="hidden size-5 p-0 text-muted-foreground group-hover:flex focus-visible:flex"
                            aria-label={`Options for ${folderName}`}
                          />
                        }
                      >
                        <MoreVerticalIcon className="size-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setRenamingFolder(folderName);
                            setRenameValue(folderName);
                          }}
                        >
                          <PencilIcon className="size-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteFolder(folderName)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2Icon className="size-3.5" />
                          Delete Collection
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trash view */}
        {trashedSnippets.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setViewFilter("trash");
                setSelectedFolder(null);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                viewFilter === "trash"
                  ? "bg-destructive/15 text-destructive"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <Trash2Icon className="size-3.5" />
                Trash
              </span>
              <span className="tabular-nums text-[11px] opacity-70">
                {trashedSnippets.length}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-2 px-4 py-2 border-t mt-1">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search snippets..."
            className="bg-background pl-8 pr-12"
          />
          {onOpenSpotlight && (
            <button
              type="button"
              onClick={onOpenSpotlight}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground"
              title="Open Spotlight (Ctrl+K)"
            >
              Ctrl+K
            </button>
          )}
        </div>
        <Select
          value={languageFilter ?? "all"}
          onValueChange={(value) =>
            setLanguageFilter(value === "all" ? null : value)
          }
        >
          <SelectTrigger className="w-full" aria-label="Filter by language">
            <SelectValue placeholder="All languages" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All languages</SelectItem>
            {LANGUAGE_OPTIONS.map((language) => (
              <SelectItem key={language.id} value={language.id}>
                {language.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {viewFilter === "trash" && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-destructive/10 text-xs text-destructive">
          <span>Viewing Trash</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmEmptyTrash(true)}
            className="h-6 text-[11px] hover:bg-destructive/20 text-destructive"
          >
            Empty Trash
          </Button>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1 px-2 pb-2">
        <SnippetList
          results={searchResults}
          activeId={activeId}
          onSelect={setActive}
          emptyMessage={
            viewFilter === "trash"
              ? "Trash is empty."
              : viewFilter === "favorites"
                ? "No favorite snippets yet."
                : viewFilter === "folder"
                  ? `No snippets in “${selectedFolder}”.`
                  : undefined
          }
        />
      </ScrollArea>

      <SyncStatus />

      {/* Dialogs */}
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
      <GistDialog
        open={gistImportOpen}
        onOpenChange={setGistImportOpen}
        mode="import"
      />

      {/* New Collection Dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>New Collection</DialogTitle>
            <DialogDescription>
              Group snippets by project or stack.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="e.g. React Hooks, DevOps"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Collection Dialog */}
      <Dialog
        open={Boolean(renamingFolder)}
        onOpenChange={(open) => !open && setRenamingFolder(null)}
      >
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Rename Collection</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameFolder();
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenamingFolder(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameFolder} disabled={!renameValue.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empty Trash Confirmation */}
      <Dialog open={confirmEmptyTrash} onOpenChange={setConfirmEmptyTrash}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Empty Trash?</DialogTitle>
            <DialogDescription>
              All {trashedSnippets.length} snippets in Trash will be permanently
              deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmEmptyTrash(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                emptyTrash();
                setConfirmEmptyTrash(false);
                toast.success("Trash emptied");
              }}
            >
              Empty Trash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
