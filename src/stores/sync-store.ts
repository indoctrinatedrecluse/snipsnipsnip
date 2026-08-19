import { create } from "zustand";

import { getMeta } from "@/lib/db";
import {
  getAccessToken,
  getClientId,
  requestAccessToken,
  signOutFromGoogle,
} from "@/lib/gdrive-auth";
import { LAST_SYNCED_KEY, syncWithDrive } from "@/lib/sync";

interface SyncState {
  isConfigured: boolean;
  isSignedIn: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  error: string | null;

  refreshAuth: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
}

export const useSyncStore = create<SyncState>()((set, get) => ({
  isConfigured: getClientId() !== null,
  isSignedIn: getAccessToken() !== null,
  isSyncing: false,
  lastSyncedAt: null,
  error: null,

  refreshAuth: async () => {
    set({
      isConfigured: getClientId() !== null,
      isSignedIn: getAccessToken() !== null,
    });
    const lastSynced = await getMeta<number>(LAST_SYNCED_KEY);
    set({ lastSyncedAt: lastSynced ?? null });
  },

  signIn: async () => {
    set({ error: null, isSyncing: true });
    try {
      await requestAccessToken();
      set({ isSignedIn: true, isConfigured: true });
      await get().syncNow();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Sign-in failed.",
      });
    } finally {
      set({ isSyncing: false });
    }
  },

  signOut: async () => {
    await signOutFromGoogle();
    set({ isSignedIn: false, error: null });
  },

  syncNow: async () => {
    if (!get().isSignedIn || get().isSyncing) return;
    set({ isSyncing: true, error: null });
    try {
      await syncWithDrive();
      const lastSynced = await getMeta<number>(LAST_SYNCED_KEY);
      set({ lastSyncedAt: lastSynced ?? Date.now() });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Sync failed." });
    } finally {
      set({ isSyncing: false });
    }
  },
}));
