import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  DownloadIcon,
  InfoIcon,
  MoonIcon,
  MoreVerticalIcon,
  PlusIcon,
  SearchIcon,
  SunIcon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AboutDialog } from "@/components/layout/AboutDialog";
import { SnippetList } from "@/components/snippets/SnippetList";
import { SyncStatus } from "@/components/layout/SyncStatus";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  buildExportPayload,
  downloadJson,
  exportFileName,
  parseImportPayload,
} from "@/lib/import-export";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
import { searchSnippets } from "@/lib/search";
import { useSettingsStore } from "@/stores/settings-store";
import { useSnippetStore } from "@/stores/snippet-store";

interface SidebarProps {
  onNew: () => void;
}

export function Sidebar({ onNew }: SidebarProps) {
  const snippets = useSnippetStore((store) => store.snippets);
  const activeId = useSnippetStore((store) => store.activeId);
  const searchQuery = useSnippetStore((store) => store.searchQuery);
  const languageFilter = useSnippetStore((store) => store.languageFilter);
  const setSearchQuery = useSnippetStore((store) => store.setSearchQuery);
  const setLanguageFilter = useSnippetStore((store) => store.setLanguageFilter);
  const setActive = useSnippetStore((store) => store.setActive);
  const importSnippets = useSnippetStore((store) => store.importSnippets);

  const theme = useSettingsStore((store) => store.theme);
  const toggleTheme = useSettingsStore((store) => store.toggleTheme);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const searchResults = useMemo(
    () => searchSnippets(snippets, searchQuery, languageFilter),
    [snippets, searchQuery, languageFilter],
  );

  const handleExport = () => {
    if (snippets.length === 0) {
      toast.error("Nothing to export yet.");
      return;
    }
    downloadJson(buildExportPayload(snippets), exportFileName());
    toast.success(
      `Exported ${snippets.length} snippet${snippets.length === 1 ? "" : "s"}`,
    );
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

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary font-mono text-xs font-bold text-primary-foreground">
            {"</>"}
          </div>
          <span className="text-sm font-semibold">SnippetVault</span>
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
              <DropdownMenuItem
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon />
                Import JSON…
              </DropdownMenuItem>
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

      <div className="space-y-2 px-4 pb-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search snippets..."
            className="bg-background pl-8"
          />
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

      <ScrollArea className="min-h-0 flex-1 px-2 pb-2">
        <SnippetList
          results={searchResults}
          activeId={activeId}
          onSelect={setActive}
        />
      </ScrollArea>

      <SyncStatus />

      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </aside>
  );
}
