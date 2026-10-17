import { useState, useEffect, useMemo, useRef } from "react";
import {
  SearchIcon,
  FileCodeIcon,
  SparklesIcon,
  PlayIcon,
  HistoryIcon,
  ZapIcon,
  CopyIcon,
  MoonIcon,
  SunIcon,
  PlusIcon,
  Share2Icon,
  DownloadIcon,
  CameraIcon,
  ShieldLockIcon,
  InfoIcon,
  ChevronRightIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSnippetStore } from "@/stores/snippet-store";
import { useSettingsStore } from "@/stores/settings-store";
import { getSnippetFiles } from "@/types/snippet";

export type CommandPaletteMode = "files" | "commands";

interface CommandItem {
  id: string;
  category: "Actions" | "Navigation" | "AI & Runner" | "Security & Export" | "Settings";
  title: string;
  subtitle?: string;
  shortcut?: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: CommandPaletteMode;
  onOpenNewSnippet?: () => void;
  onOpenSpotlight?: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  initialMode = "files",
  onOpenNewSnippet,
  onOpenSpotlight,
}: CommandPaletteProps) {
  const snippets = useSnippetStore((s) => s.snippets);
  const activeId = useSnippetStore((s) => s.activeId);
  const setActive = useSnippetStore((s) => s.setActive);
  const setActiveSnippetFile = useSnippetStore((s) => s.setActiveSnippetFile);

  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // If query starts with '>', we are in commands mode
  const isCommandMode = initialMode === "commands" || query.startsWith(">");
  const cleanQuery = query.startsWith(">") ? query.slice(1).trim().toLowerCase() : query.trim().toLowerCase();

  useEffect(() => {
    if (open) {
      if (initialMode === "commands") {
        setQuery(">");
      } else {
        setQuery("");
      }
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initialMode]);

  const activeSnippet = snippets.find((s) => s.id === activeId);

  // Build the list of all available application commands
  const allCommands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      {
        id: "new-snippet",
        category: "Actions",
        title: "New Snippet",
        subtitle: "Create a new snippet bundle",
        shortcut: "Ctrl+N",
        icon: <PlusIcon className="size-4 text-emerald-500" />,
        onSelect: () => {
          onOpenChange(false);
          onOpenNewSnippet?.();
        },
      },
      {
        id: "search-snippets",
        category: "Navigation",
        title: "Search Snippets & Tags",
        subtitle: "Open spotlight fuzzy search",
        shortcut: "Ctrl+K",
        icon: <SearchIcon className="size-4 text-blue-500" />,
        onSelect: () => {
          onOpenChange(false);
          onOpenSpotlight?.();
        },
      },
      {
        id: "toggle-sandbox",
        category: "AI & Runner",
        title: "Toggle Web & Code Sandbox Runner",
        subtitle: "Execute code and preview interactive web bundles",
        shortcut: "Ctrl+Enter",
        icon: <PlayIcon className="size-4 text-emerald-500" />,
        onSelect: () => {
          onOpenChange(false);
          window.dispatchEvent(new CustomEvent("snippetvault:toggle-sandbox"));
        },
      },
      {
        id: "smart-ai",
        category: "AI & Runner",
        title: "Smart AI Code Actions (BYOK)",
        subtitle: "Explain, refactor, generate types, docstrings or tests",
        icon: <SparklesIcon className="size-4 text-indigo-500" />,
        onSelect: () => {
          onOpenChange(false);
          window.dispatchEvent(new CustomEvent("snippetvault:open-ai"));
        },
      },
      {
        id: "version-history",
        category: "Actions",
        title: "Snippet Version History & Rollback",
        subtitle: "View local revision timeline and visual diffs",
        icon: <HistoryIcon className="size-4 text-blue-400" />,
        onSelect: () => {
          onOpenChange(false);
          window.dispatchEvent(new CustomEvent("snippetvault:open-history"));
        },
      },
      {
        id: "text-expander",
        category: "Actions",
        title: "Text Expander & Trigger Abbreviations",
        subtitle: "Configure global snippet auto-expansion keywords",
        icon: <ZapIcon className="size-4 text-amber-500" />,
        onSelect: () => {
          onOpenChange(false);
          window.dispatchEvent(new CustomEvent("snippetvault:open-expander"));
        },
      },
      {
        id: "code-card",
        category: "Security & Export",
        title: "Export Carbon-Style Code Card",
        subtitle: "Generate social image card with themes and frames",
        icon: <CameraIcon className="size-4 text-pink-500" />,
        onSelect: () => {
          onOpenChange(false);
          window.dispatchEvent(new CustomEvent("snippetvault:open-code-card"));
        },
      },
      {
        id: "vault-lock",
        category: "Security & Export",
        title: "Zero-Knowledge Encrypted Vaults",
        subtitle: "Protect sensitive credentials with AES-GCM-256",
        icon: <ShieldLockIcon className="size-4 text-amber-500" />,
        onSelect: () => {
          onOpenChange(false);
          window.dispatchEvent(new CustomEvent("snippetvault:open-vault"));
        },
      },
      {
        id: "share-gist",
        category: "Security & Export",
        title: "Share Snippet to GitHub Gist",
        subtitle: "Publish multi-file bundle to Gist",
        icon: <Share2Icon className="size-4 text-muted-foreground" />,
        onSelect: () => {
          onOpenChange(false);
          window.dispatchEvent(new CustomEvent("snippetvault:open-gist"));
        },
      },
      {
        id: "export-vscode",
        category: "Security & Export",
        title: "Export to VS Code / Cursor",
        subtitle: "Download VS Code snippets JSON file",
        icon: <DownloadIcon className="size-4 text-muted-foreground" />,
        onSelect: () => {
          onOpenChange(false);
          window.dispatchEvent(new CustomEvent("snippetvault:export-vscode"));
        },
      },
      {
        id: "copy-code",
        category: "Actions",
        title: "Copy Current Snippet Code",
        subtitle: activeSnippet ? `Copy “${activeSnippet.title}”` : "No snippet active",
        shortcut: "Ctrl+Shift+C",
        icon: <CopyIcon className="size-4 text-muted-foreground" />,
        onSelect: async () => {
          onOpenChange(false);
          if (activeSnippet) {
            await navigator.clipboard.writeText(activeSnippet.code);
            toast.success("Copied snippet code");
          }
        },
      },
      {
        id: "toggle-theme",
        category: "Settings",
        title: `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`,
        subtitle: "Toggle application appearance theme",
        icon: theme === "dark" ? <SunIcon className="size-4 text-amber-400" /> : <MoonIcon className="size-4 text-blue-400" />,
        onSelect: () => {
          toggleTheme();
          toast.success(`Switched to ${theme === "dark" ? "light" : "dark"} theme`);
        },
      },
      {
        id: "about",
        category: "Settings",
        title: "About SnippetVault",
        subtitle: "Version info, diagnostics, and licenses",
        icon: <InfoIcon className="size-4 text-muted-foreground" />,
        onSelect: () => {
          onOpenChange(false);
          window.dispatchEvent(new CustomEvent("snippetvault:open-about"));
        },
      },
    ];

    return list;
  }, [activeSnippet, onOpenChange, onOpenNewSnippet, onOpenSpotlight, theme, toggleTheme]);

  // Filter commands
  const filteredCommands = useMemo(() => {
    if (!cleanQuery) return allCommands;
    return allCommands.filter(
      (c) =>
        c.title.toLowerCase().includes(cleanQuery) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(cleanQuery)),
    );
  }, [allCommands, cleanQuery]);

  // Build snippet/file items when in files mode
  const fileItems = useMemo(() => {
    const list: Array<{
      id: string;
      snippetId: string;
      fileId?: string;
      title: string;
      subtitle: string;
      badge: string;
    }> = [];

    const activeSnippets = snippets.filter((s) => !s.deletedAt);

    for (const snippet of activeSnippets) {
      const files = getSnippetFiles(snippet);
      if (files.length > 1) {
        for (const file of files) {
          list.push({
            id: `${snippet.id}-${file.id}`,
            snippetId: snippet.id,
            fileId: file.id,
            title: `${snippet.title || "Untitled"} / ${file.name}`,
            subtitle: file.language || snippet.language,
            badge: file.name.split(".").pop() || "file",
          });
        }
      } else {
        list.push({
          id: snippet.id,
          snippetId: snippet.id,
          title: snippet.title || "Untitled snippet",
          subtitle: snippet.description || (snippet.folder ? `In ${snippet.folder}` : snippet.language),
          badge: snippet.language,
        });
      }
    }

    if (!cleanQuery) return list.slice(0, 30);

    return list
      .filter(
        (item) =>
          item.title.toLowerCase().includes(cleanQuery) ||
          item.subtitle.toLowerCase().includes(cleanQuery) ||
          item.badge.toLowerCase().includes(cleanQuery),
      )
      .slice(0, 40);
  }, [snippets, cleanQuery]);

  const activeItemsCount = isCommandMode ? filteredCommands.length : fileItems.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, activeItemsCount));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + activeItemsCount) % Math.max(1, activeItemsCount));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isCommandMode) {
        const cmd = filteredCommands[selectedIndex];
        if (cmd) cmd.onSelect();
      } else {
        const file = fileItems[selectedIndex];
        if (file) {
          setActive(file.snippetId);
          if (file.fileId) {
            setActiveSnippetFile(file.snippetId, file.fileId);
          }
          onOpenChange(false);
        }
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden shadow-2xl border bg-background">
        {/* Search Input Bar */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b">
          {isCommandMode ? (
            <ChevronRightIcon className="size-5 text-primary shrink-0 animate-pulse" />
          ) : (
            <SearchIcon className="size-5 text-muted-foreground shrink-0" />
          )}
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isCommandMode
                ? "Type a command or action name..."
                : "Search snippets and files... (Type > for commands)"
            }
            className="h-7 border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
              {isCommandMode ? "Commands" : "Ctrl+P"}
            </span>
          </div>
        </div>

        {/* Results List */}
        <ScrollArea className="max-h-[360px] p-2">
          {isCommandMode ? (
            filteredCommands.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No matching commands found.
              </div>
            ) : (
              <div className="space-y-1">
                {filteredCommands.map((cmd, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={cmd.id}
                      onClick={cmd.onSelect}
                      className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors text-xs ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`shrink-0 ${
                            isSelected ? "text-primary-foreground" : ""
                          }`}
                        >
                          {cmd.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{cmd.title}</div>
                          {cmd.subtitle && (
                            <div
                              className={`text-[11px] truncate ${
                                isSelected
                                  ? "text-primary-foreground/80"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {cmd.subtitle}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            isSelected
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {cmd.category}
                        </span>
                        {cmd.shortcut && (
                          <kbd
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              isSelected
                                ? "bg-primary-foreground/10 border-primary-foreground/20"
                                : "bg-muted/50 border-border"
                            }`}
                          >
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : fileItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No matching files or snippets. Type <code className="text-foreground font-mono">&gt;</code> for commands.
            </div>
          ) : (
            <div className="space-y-1">
              {fileItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActive(item.snippetId);
                      if (item.fileId) {
                        setActiveSnippetFile(item.snippetId, item.fileId);
                      }
                      onOpenChange(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileCodeIcon
                        className={`size-4 shrink-0 ${
                          isSelected ? "text-primary-foreground" : "text-muted-foreground"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{item.title}</div>
                        <div
                          className={`text-[11px] truncate ${
                            isSelected
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-background px-1 py-0.5 rounded border mr-1">↑↓</kbd>
              Navigate
            </span>
            <span>
              <kbd className="font-mono bg-background px-1 py-0.5 rounded border mr-1">↵</kbd>
              Select
            </span>
            <span>
              <kbd className="font-mono bg-background px-1 py-0.5 rounded border mr-1">&gt;</kbd>
              Commands
            </span>
          </div>
          <span>SnippetVault Universal Palette</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
