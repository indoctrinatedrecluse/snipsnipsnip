import { create } from "zustand";

import { createSnippet, type Snippet, type SnippetDraft } from "@/types/snippet";

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
        snippets: state.snippets.map((snippet) =>
          snippet.id === id
            ? { ...snippet, ...patch, updatedAt: Date.now() }
            : snippet,
        ),
      };
    });
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
