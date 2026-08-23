import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AppTheme } from "@/types/app";

interface SettingsState {
  theme: AppTheme;
  editorFontSize: number;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  setEditorFontSize: (size: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      editorFontSize: 14,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setEditorFontSize: (editorFontSize) => set({ editorFontSize }),
    }),
    { name: "snippetvault-settings" },
  ),
);
