import { create } from "zustand";

import { detectLanguageFromFilename } from "@/lib/languages";
import {
  createSnippet,
  getActiveFile,
  getSnippetFiles,
  type Snippet,
  type SnippetDraft,
  type SnippetFile,
  type SnippetHistoryEntry,
} from "@/types/snippet";

export type ViewFilter = "all" | "favorites" | "trash" | "folder";

interface SnippetState {
  snippets: Snippet[];
  activeId: string | null;
  searchQuery: string;
  languageFilter: string | null;
  viewFilter: ViewFilter;
  selectedFolder: string | null;
  folders: string[];

  addSnippet: (draft: SnippetDraft) => string;
  updateSnippet: (
    id: string,
    patch: Partial<Omit<Snippet, "id" | "createdAt">>,
  ) => void;
  moveToTrash: (id: string) => void;
  restoreSnippet: (id: string) => void;
  emptyTrash: () => void;
  deleteSnippet: (id: string) => void;
  duplicateSnippet: (id: string) => string | null;
  toggleFavorite: (id: string) => void;
  setSnippetFolder: (id: string, folder?: string) => void;
  createFolder: (name: string) => void;
  renameFolder: (oldName: string, newName: string) => void;
  deleteFolder: (name: string) => void;

  // Multi-file tabs
  addSnippetFile: (
    snippetId: string,
    name?: string,
    code?: string,
    language?: string,
  ) => string;
  updateSnippetFile: (
    snippetId: string,
    fileId: string,
    patch: Partial<SnippetFile>,
  ) => void;
  deleteSnippetFile: (snippetId: string, fileId: string) => void;
  setActiveSnippetFile: (snippetId: string, fileId: string) => void;

  // Revision history
  addHistorySnapshot: (snippetId: string, summary?: string) => void;
  restoreSnippetVersion: (snippetId: string, historyId: string) => void;

  /** Merges imported snippets: adds new ones, keeps the newer of clashes. */
  importSnippets: (imported: Snippet[]) => void;
  setActive: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setLanguageFilter: (language: string | null) => void;
  setViewFilter: (filter: ViewFilter) => void;
  setSelectedFolder: (folder: string | null) => void;
}

export const useSnippetStore = create<SnippetState>()((set, get) => ({
  snippets: [],
  activeId: null,
  searchQuery: "",
  languageFilter: null,
  viewFilter: "all",
  selectedFolder: null,
  folders: [],

  addSnippet: (draft) => {
    const snippet = createSnippet(draft);
    set((state) => ({
      snippets: [...state.snippets, snippet],
      folders:
        snippet.folder && !state.folders.includes(snippet.folder)
          ? [...state.folders, snippet.folder]
          : state.folders,
    }));
    return snippet.id;
  },

  updateSnippet: (id, patch) => {
    set((state) => {
      let folders = state.folders;
      if (patch.folder && !folders.includes(patch.folder)) {
        folders = [...folders, patch.folder];
      }
      return {
        folders,
        snippets: state.snippets.map((snippet) => {
          if (snippet.id !== id) return snippet;
          let files = snippet.files ? [...snippet.files] : getSnippetFiles(snippet);
          const activeFileId = snippet.activeFileId ?? files[0]?.id;

          if (patch.code !== undefined || patch.language !== undefined) {
            files = files.map((file) => {
              if (file.id === activeFileId || (!activeFileId && files[0]?.id === file.id)) {
                return {
                  ...file,
                  code: patch.code !== undefined ? patch.code : file.code,
                  language: patch.language !== undefined ? patch.language : file.language,
                };
              }
              return file;
            });
          }

          return {
            ...snippet,
            ...patch,
            files: patch.files ?? files,
            activeFileId,
            updatedAt: Date.now(),
          };
        }),
      };
    });
  },

  addSnippetFile: (snippetId, name, code = "", language) => {
    let createdFileId = "";
    set((state) => ({
      snippets: state.snippets.map((snippet) => {
        if (snippet.id !== snippetId) return snippet;
        const currentFiles = getSnippetFiles(snippet);
        const fileName = (name && name.trim()) || `file-${currentFiles.length + 1}.txt`;
        const fileLang = language || detectLanguageFromFilename(fileName) || "plaintext";
        const newFile: SnippetFile = {
          id: crypto.randomUUID(),
          name: fileName,
          code,
          language: fileLang,
        };
        createdFileId = newFile.id;
        const nextFiles = [...currentFiles, newFile];
        return {
          ...snippet,
          files: nextFiles,
          activeFileId: newFile.id,
          code: newFile.code,
          language: newFile.language,
          updatedAt: Date.now(),
        };
      }),
    }));
    return createdFileId;
  },

  updateSnippetFile: (snippetId, fileId, patch) => {
    set((state) => ({
      snippets: state.snippets.map((snippet) => {
        if (snippet.id !== snippetId) return snippet;
        const currentFiles = getSnippetFiles(snippet);
        let activeFile = getActiveFile(snippet);
        const nextFiles = currentFiles.map((file) => {
          if (file.id === fileId) {
            const nextLang =
              patch.language ||
              (patch.name ? detectLanguageFromFilename(patch.name) || file.language : file.language);
            const updated = {
              ...file,
              ...patch,
              language: nextLang,
            };
            if (file.id === activeFile.id) {
              activeFile = updated;
            }
            return updated;
          }
          return file;
        });

        return {
          ...snippet,
          files: nextFiles,
          code: activeFile.code,
          language: activeFile.language,
          updatedAt: Date.now(),
        };
      }),
    }));
  },

  deleteSnippetFile: (snippetId, fileId) => {
    set((state) => ({
      snippets: state.snippets.map((snippet) => {
        if (snippet.id !== snippetId) return snippet;
        const currentFiles = getSnippetFiles(snippet);
        if (currentFiles.length <= 1) return snippet;
        const nextFiles = currentFiles.filter((f) => f.id !== fileId);
        const nextActive =
          snippet.activeFileId === fileId ? nextFiles[0] : getActiveFile(snippet);
        return {
          ...snippet,
          files: nextFiles,
          activeFileId: nextActive.id,
          code: nextActive.code,
          language: nextActive.language,
          updatedAt: Date.now(),
        };
      }),
    }));
  },

  setActiveSnippetFile: (snippetId, fileId) => {
    set((state) => ({
      snippets: state.snippets.map((snippet) => {
        if (snippet.id !== snippetId) return snippet;
        const currentFiles = getSnippetFiles(snippet);
        const target = currentFiles.find((f) => f.id === fileId);
        if (!target) return snippet;
        return {
          ...snippet,
          activeFileId: fileId,
          code: target.code,
          language: target.language,
        };
      }),
    }));
  },

  addHistorySnapshot: (snippetId, summary) => {
    set((state) => ({
      snippets: state.snippets.map((snippet) => {
        if (snippet.id !== snippetId) return snippet;
        const files = getSnippetFiles(snippet);
        const history = snippet.history ? [...snippet.history] : [];
        const last = history[0];
        if (last && last.code === snippet.code && last.language === snippet.language) {
          return snippet;
        }
        const newEntry: SnippetHistoryEntry = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          code: snippet.code,
          language: snippet.language,
          files: JSON.parse(JSON.stringify(files)),
          summary: summary || "Snapshot",
        };
        return {
          ...snippet,
          history: [newEntry, ...history.slice(0, 24)],
        };
      }),
    }));
  },

  restoreSnippetVersion: (snippetId, historyId) => {
    set((state) => ({
      snippets: state.snippets.map((snippet) => {
        if (snippet.id !== snippetId) return snippet;
        const entry = snippet.history?.find((h) => h.id === historyId);
        if (!entry) return snippet;
        const currentFiles = getSnippetFiles(snippet);
        const newHistory: SnippetHistoryEntry[] = [
          {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            code: snippet.code,
            language: snippet.language,
            files: JSON.parse(JSON.stringify(currentFiles)),
            summary: "Pre-rollback snapshot",
          },
          ...(snippet.history ?? []),
        ].slice(0, 25);

        const restoredFiles =
          entry.files && entry.files.length > 0
            ? entry.files
            : [
                {
                  id: crypto.randomUUID(),
                  name: snippet.title.includes(".")
                    ? snippet.title
                    : `main.${entry.language === "plaintext" ? "txt" : entry.language}`,
                  code: entry.code,
                  language: entry.language,
                },
              ];

        return {
          ...snippet,
          code: entry.code,
          language: entry.language,
          files: restoredFiles,
          activeFileId: restoredFiles[0]?.id,
          history: newHistory,
          updatedAt: Date.now(),
        };
      }),
    }));
  },

  moveToTrash: (id) => {
    set((state) => ({
      snippets: state.snippets.map((snippet) =>
        snippet.id === id
          ? { ...snippet, deletedAt: Date.now(), updatedAt: Date.now() }
          : snippet,
      ),
      activeId: state.activeId === id ? null : state.activeId,
    }));
  },

  restoreSnippet: (id) => {
    set((state) => ({
      snippets: state.snippets.map((snippet) =>
        snippet.id === id
          ? { ...snippet, deletedAt: undefined, updatedAt: Date.now() }
          : snippet,
      ),
    }));
  },

  emptyTrash: () => {
    set((state) => {
      const activeTrashed = state.snippets.find(
        (s) => s.id === state.activeId,
      )?.deletedAt;
      return {
        snippets: state.snippets.filter((snippet) => !snippet.deletedAt),
        activeId: activeTrashed ? null : state.activeId,
      };
    });
  },

  deleteSnippet: (id) => {
    set((state) => ({
      snippets: state.snippets.filter((snippet) => snippet.id !== id),
      activeId: state.activeId === id ? null : state.activeId,
    }));
  },

  duplicateSnippet: (id) => {
    const source = get().snippets.find((snippet) => snippet.id === id);
    if (!source) return null;
    const copy = createSnippet({
      title: `${source.title} (copy)`,
      description: source.description,
      code: source.code,
      language: source.language,
      tags: source.tags,
      folder: source.folder,
      files: source.files ? JSON.parse(JSON.stringify(source.files)) : undefined,
    });
    set((state) => ({ snippets: [...state.snippets, copy] }));
    return copy.id;
  },

  toggleFavorite: (id) => {
    set((state) => ({
      snippets: state.snippets.map((snippet) =>
        snippet.id === id
          ? { ...snippet, isFavorite: !snippet.isFavorite }
          : snippet,
      ),
    }));
  },

  setSnippetFolder: (id, folder) => {
    set((state) => {
      const folders =
        folder && !state.folders.includes(folder)
          ? [...state.folders, folder]
          : state.folders;
      return {
        folders,
        snippets: state.snippets.map((snippet) =>
          snippet.id === id
            ? { ...snippet, folder: folder || undefined, updatedAt: Date.now() }
            : snippet,
        ),
      };
    });
  },

  createFolder: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((state) =>
      state.folders.includes(trimmed)
        ? state
        : { folders: [...state.folders, trimmed] },
    );
  },

  renameFolder: (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || oldName === trimmed) return;
    set((state) => ({
      folders: state.folders.map((f) => (f === oldName ? trimmed : f)),
      selectedFolder:
        state.selectedFolder === oldName ? trimmed : state.selectedFolder,
      snippets: state.snippets.map((snippet) =>
        snippet.folder === oldName
          ? { ...snippet, folder: trimmed, updatedAt: Date.now() }
          : snippet,
      ),
    }));
  },

  deleteFolder: (name) => {
    set((state) => ({
      folders: state.folders.filter((f) => f !== name),
      selectedFolder:
        state.selectedFolder === name ? null : state.selectedFolder,
      viewFilter:
        state.viewFilter === "folder" && state.selectedFolder === name
          ? "all"
          : state.viewFilter,
      snippets: state.snippets.map((snippet) =>
        snippet.folder === name
          ? { ...snippet, folder: undefined, updatedAt: Date.now() }
          : snippet,
      ),
    }));
  },

  importSnippets: (imported) => {
    set((state) => {
      const byId = new Map(
        state.snippets.map((snippet) => [snippet.id, snippet]),
      );
      const newFolders = new Set(state.folders);

      for (const snippet of imported) {
        if (snippet.folder) newFolders.add(snippet.folder);
        const existing = byId.get(snippet.id);
        if (!existing || snippet.updatedAt > existing.updatedAt) {
          byId.set(snippet.id, snippet);
        }
      }
      return {
        folders: [...newFolders],
        snippets: [...byId.values()],
      };
    });
  },

  setActive: (activeId) => set({ activeId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLanguageFilter: (languageFilter) => set({ languageFilter }),
  setViewFilter: (viewFilter) => set({ viewFilter }),
  setSelectedFolder: (selectedFolder) =>
    set({
      selectedFolder,
      viewFilter: selectedFolder ? "folder" : "all",
    }),
}));
