import { useEffect } from "react";

import {
  bulkPutSnippets,
  deleteSnippetRecord,
  getAllSnippets,
  getMeta,
  setMeta,
} from "@/lib/db";
import { createDemoSnippets, SEEDED_KEY } from "@/lib/demo-snippets";
import { useSnippetStore } from "@/stores/snippet-store";

/**
 * Bridges the Zustand snippet store and IndexedDB.
 *
 * - Hydrates the store from IndexedDB on mount.
 * - Seeds a few demo snippets the very first time the app runs, so the
 *   editor opens with something to look at.
 * - Persists mutations by diffing state snapshots by object identity:
 *   unchanged snippets keep their reference, so only genuinely new/changed
 *   snippets are written, and removed ids are deleted.
 */
export function useSnippetPersistence(): void {
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let disposed = false;

    void getAllSnippets().then(async (stored) => {
      if (disposed) return;

      // Persist mutations as they happen.
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

      const state = useSnippetStore.getState();
      if (stored.length === 0 && state.snippets.length === 0) {
        const seeded = await getMeta<boolean>(SEEDED_KEY);
        if (!seeded) {
          const demos = createDemoSnippets();
          useSnippetStore.setState({
            snippets: demos,
            activeId: demos[0]?.id ?? null,
          });
          void setMeta(SEEDED_KEY, true);
        }
      } else {
        useSnippetStore.setState((prev) => {
          const existingIds = new Set(prev.snippets.map((s) => s.id));
          const merged = [
            ...prev.snippets,
            ...stored.filter((snippet) => !existingIds.has(snippet.id)),
          ];
          return { snippets: merged };
        });
      }
    });

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);
}
