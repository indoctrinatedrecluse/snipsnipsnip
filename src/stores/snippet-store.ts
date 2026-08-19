import { create } from "zustand";

import { createSnippet, type Snippet, type SnippetDraft } from "@/types/snippet";

interface SnippetState {
  snippets: Snippet[];
  activeId: string | null;
  searchQuery: string;
  languageFilter: string | null;

  addSnippet: (draft: SnippetDraft) => string;
  updateSnippet: (
    id: string,
    patch: Partial<Omit<Snippet, "id" | "createdAt">>,
  ) => void;
  deleteSnippet: (id: string) => void;
  duplicateSnippet: (id: string) => string | null;
  toggleFavorite: (id: string) => void;
  /** Merges imported snippets: adds new ones, keeps the newer of clashes. */
  importSnippets: (imported: Snippet[]) => void;
  setActive: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setLanguageFilter: (language: string | null) => void;
}

export const useSnippetStore = create<SnippetState>()((set, get) => ({
  snippets: [],
  activeId: null,
  searchQuery: "",
  languageFilter: null,

  addSnippet: (draft) => {
    const snippet = createSnippet(draft);
    set((state) => ({ snippets: [...state.snippets, snippet] }));
    return snippet.id;
  },

  updateSnippet: (id, patch) => {
    set((state) => ({
      snippets: state.snippets.map((snippet) =>
        snippet.id === id
          ? { ...snippet, ...patch, updatedAt: Date.now() }
          : snippet,
      ),
    }));
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

  importSnippets: (imported) => {
    set((state) => {
      const byId = new Map(
        state.snippets.map((snippet) => [snippet.id, snippet]),
      );
      for (const snippet of imported) {
        const existing = byId.get(snippet.id);
        if (!existing || snippet.updatedAt > existing.updatedAt) {
          byId.set(snippet.id, snippet);
        }
      }
      return { snippets: [...byId.values()] };
    });
  },

  setActive: (activeId) => set({ activeId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLanguageFilter: (languageFilter) => set({ languageFilter }),
}));
