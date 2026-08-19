import { create } from "zustand";

import { getMeta } from "@/lib/db";
import {
  fetchUserInfo,
  getClientId,
  getStoredUserInfo,
  hasStoredAuth,
  requestAccessToken,
  signOutFromGoogle,
  type UserInfo,
} from "@/lib/gdrive-auth";
import { LAST_SYNCED_KEY, syncWithDrive } from "@/lib/sync";

interface SyncState {
  isConfigured: boolean;
  isSignedIn: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  error: string | null;
  user: UserInfo | null;

  refreshAuth: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
}

export const useSyncStore = create<SyncState>()((set, get) => ({
  isConfigured: getClientId() !== null,
  isSignedIn: hasStoredAuth(),
  isSyncing: false,
  lastSyncedAt: null,
  error: null,
  user: getStoredUserInfo(),

  refreshAuth: async () => {
    set({
      isConfigured: getClientId() !== null,
      isSignedIn: hasStoredAuth(),
      user: getStoredUserInfo(),
    });
    const lastSynced = await getMeta<number>(LAST_SYNCED_KEY);
    set({ lastSyncedAt: lastSynced ?? null });
  },

  signIn: async () => {
    set({ error: null, isSyncing: true });
    try {
      await requestAccessToken();
      set({ isSignedIn: true, isConfigured: true });
      const user = await fetchUserInfo();
      set({ user });
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
    set({ isSignedIn: false, error: null, user: null });
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
