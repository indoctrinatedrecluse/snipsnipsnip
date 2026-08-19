import { useEffect } from "react";

import {
  bulkPutSnippets,
  deleteSnippetRecord,
  getAllSnippets,
} from "@/lib/db";
import { useSnippetStore } from "@/stores/snippet-store";

/**
 * Bridges the Zustand snippet store and IndexedDB.
 *
 * - Hydrates the store from IndexedDB on mount.
 * - Persists mutations by diffing state snapshots by object identity:
 *   unchanged snippets keep their reference, so only genuinely new/changed
 *   snippets are written, and removed ids are deleted.
 */
export function useSnippetPersistence(): void {
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let disposed = false;

    void getAllSnippets().then((stored) => {
      if (disposed) return;

      useSnippetStore.setState((state) => {
        if (stored.length === 0) return state;
        const existingIds = new Set(state.snippets.map((s) => s.id));
        const merged = [
          ...state.snippets,
          ...stored.filter((snippet) => !existingIds.has(snippet.id)),
        ];
        return { snippets: merged };
      });

      unsubscribe = useSnippetStore.subscribe((state, previous) => {
        if (state.snippets === previous.snippets) return;

        const previousById = new Map(
          previous.snippets.map((snippet) => [snippet.id, snippet]),
        );
        const nextIds = new Set(state.snippets.map((snippet) => snippet.id));

        const toPut = state.snippets.filter(
          (snippet) => previousById.get(snippet.id) !== snippet,
        );
        const toDelete = [...previousById.keys()].filter(
          (id) => !nextIds.has(id),
        );

        if (toPut.length > 0) void bulkPutSnippets(toPut);
        for (const id of toDelete) void deleteSnippetRecord(id);
      });
    });

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);
}
