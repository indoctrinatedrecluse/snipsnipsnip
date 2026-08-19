import { useEffect } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { prewarmHighlighter } from "@/lib/highlight";
import { useSnippetPersistence } from "@/hooks/useSnippetPersistence";
import { useSync } from "@/hooks/useSync";
import { useSettingsStore } from "@/stores/settings-store";

export default function App() {
  const theme = useSettingsStore((store) => store.theme);

  // Apply the theme class to <html> for Tailwind's dark variant.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Warm the highlighter so the first visible highlight is instant.
  useEffect(() => {
    prewarmHighlighter();
  }, []);

  // IndexedDB persistence + Google Drive sync.
  useSnippetPersistence();
  useSync();

  return (
    <TooltipProvider>
      <AppLayout />
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}
