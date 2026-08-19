import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AppTheme } from "@/types/app";

interface SettingsState {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set({ theme: get().theme === "dark" ? "light" : "dark" }),
    }),
    { name: "snippetvault-settings" },
  ),
);
