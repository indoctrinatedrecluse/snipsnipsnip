import { useMemo } from "react";
import { MoonIcon, PlusIcon, SearchIcon, SunIcon } from "lucide-react";

import { SnippetList } from "@/components/snippets/SnippetList";
import { SyncStatus } from "@/components/layout/SyncStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const theme = useSettingsStore((store) => store.theme);
  const toggleTheme = useSettingsStore((store) => store.toggleTheme);

  const searchResults = useMemo(
    () => searchSnippets(snippets, searchQuery, languageFilter),
    [snippets, searchQuery, languageFilter],
  );

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary font-mono text-xs font-bold text-primary-foreground">
            {"</>"}
          </div>
          <span className="text-sm font-semibold">SnippetVault</span>
        </div>
        <div className="flex items-center gap-1">
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
    </aside>
  );
}
