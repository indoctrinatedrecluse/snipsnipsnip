import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AppTheme } from "@/types/app";
import type { AiProvider } from "@/lib/ai/ai-service";
import {
  saveSecureSecret,
  loadSecureSecret,
  clearAllSecureSecrets,
} from "@/lib/crypto/secure-storage";

export interface AiSettings {
  provider: AiProvider;
  geminiApiKey: string;
  geminiModel: string;
  claudeApiKey: string;
  claudeModel: string;
  deepseekApiKey: string;
  deepseekModel: string;
  openaiApiKey: string;
  openaiModel: string;
  customBaseUrl: string;
  customApiKey: string;
  customModel: string;
}

export const defaultAiSettings: AiSettings = {
  provider: "gemini",
  geminiApiKey: "",
  geminiModel: "gemini-2.5-flash",
  claudeApiKey: "",
  claudeModel: "claude-3-5-sonnet-20241022",
  deepseekApiKey: "",
  deepseekModel: "deepseek-chat",
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  customBaseUrl: "http://localhost:11434/v1",
  customApiKey: "",
  customModel: "llama3.1",
};

interface SettingsState {
  theme: AppTheme;
  editorFontSize: number;
  aiSettings: AiSettings;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  setEditorFontSize: (size: number) => void;
  setAiSettings: (settings: Partial<AiSettings>) => void;
  clearApiKeys: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      editorFontSize: 14,
      aiSettings: defaultAiSettings,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setEditorFontSize: (editorFontSize) => set({ editorFontSize }),
      setAiSettings: (patch) => {
        if (patch.geminiApiKey !== undefined) void saveSecureSecret("gemini", patch.geminiApiKey);
        if (patch.claudeApiKey !== undefined) void saveSecureSecret("claude", patch.claudeApiKey);
        if (patch.deepseekApiKey !== undefined) void saveSecureSecret("deepseek", patch.deepseekApiKey);
        if (patch.openaiApiKey !== undefined) void saveSecureSecret("openai", patch.openaiApiKey);
        if (patch.customApiKey !== undefined) void saveSecureSecret("custom", patch.customApiKey);

        set({
          aiSettings: {
            ...get().aiSettings,
            ...patch,
          },
        });
      },
      clearApiKeys: () => {
        clearAllSecureSecrets();
        set({
          aiSettings: {
            ...get().aiSettings,
            geminiApiKey: "",
            claudeApiKey: "",
            deepseekApiKey: "",
            openaiApiKey: "",
            customApiKey: "",
          },
        });
      },
    }),
    {
      name: "snippetvault-settings",
      partialize: (state) => ({
        theme: state.theme,
        editorFontSize: state.editorFontSize,
        aiSettings: {
          ...state.aiSettings,
          // Never persist plaintext API keys to snippetvault-settings in localStorage
          geminiApiKey: "",
          claudeApiKey: "",
          deepseekApiKey: "",
          openaiApiKey: "",
          customApiKey: "",
        },
      }),
      onRehydrateStorage: () => async (state) => {
        if (!state) return;
        try {
          const [gemini, claude, deepseek, openai, custom] = await Promise.all([
            loadSecureSecret("gemini"),
            loadSecureSecret("claude"),
            loadSecureSecret("deepseek"),
            loadSecureSecret("openai"),
            loadSecureSecret("custom"),
          ]);
          state.setAiSettings({
            geminiApiKey: gemini,
            claudeApiKey: claude,
            deepseekApiKey: deepseek,
            openaiApiKey: openai,
            customApiKey: custom,
          });
        } catch (_) {}
      },
    },
  ),
);
