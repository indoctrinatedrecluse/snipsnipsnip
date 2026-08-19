import { useEffect } from "react";

import { useSnippetStore } from "@/stores/snippet-store";
import { useSyncStore } from "@/stores/sync-store";

const AUTO_SYNC_DELAY_MS = 2000;

/**
 * Wires Google Drive sync into the app lifecycle:
 * - restores auth/sync state on mount,
 * - debounced auto-sync after snippet changes,
 * - a sync when the connection returns,
 * - one initial sync shortly after startup (when signed in).
 */
export function useSync(): void {
  const isSignedIn = useSyncStore((store) => store.isSignedIn);
  const refreshAuth = useSyncStore((store) => store.refreshAuth);
  const syncNow = useSyncStore((store) => store.syncNow);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (!isSignedIn) return;
    let timer: number | null = null;
    const unsubscribe = useSnippetStore.subscribe((state, previous) => {
      if (state.snippets === previous.snippets) return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        void useSyncStore.getState().syncNow();
      }, AUTO_SYNC_DELAY_MS);
    });
    return () => {
      unsubscribe();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) return;
    const handleOnline = () => void syncNow();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [isSignedIn, syncNow]);

  useEffect(() => {
    if (!isSignedIn) return;
    const timer = window.setTimeout(() => void syncNow(), 800);
    return () => window.clearTimeout(timer);
  }, [isSignedIn, syncNow]);
}
