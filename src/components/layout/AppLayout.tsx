import { useState } from "react";
import { toast } from "sonner";

import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette, type CommandPaletteMode } from "@/components/layout/CommandPalette";
import { EmptyState } from "@/components/snippets/EmptyState";
import { NewSnippetDialog } from "@/components/snippets/NewSnippetDialog";
import { SnippetDetail } from "@/components/snippets/SnippetDetail";
import { SpotlightDialog } from "@/components/snippets/SpotlightDialog";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useSnippetStore } from "@/stores/snippet-store";

export function AppLayout() {
  const activeId = useSnippetStore((store) => store.activeId);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandPaletteMode, setCommandPaletteMode] =
    useState<CommandPaletteMode>("files");

  useHotkeys({
    "ctrl+n": () => setNewDialogOpen(true),
    "ctrl+k": (event) => {
      event.preventDefault();
      setSpotlightOpen(true);
    },
    "ctrl+p": (event) => {
      event.preventDefault();
      setCommandPaletteMode("files");
      setCommandPaletteOpen(true);
    },
    "ctrl+shift+p": (event) => {
      event.preventDefault();
      setCommandPaletteMode("commands");
      setCommandPaletteOpen(true);
    },
    "ctrl+s": (event) => {
      event.preventDefault();
      toast.success("All changes saved");
    },
  });

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <Sidebar
        onNew={() => setNewDialogOpen(true)}
        onOpenSpotlight={() => setSpotlightOpen(true)}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        {activeId ? (
          <SnippetDetail />
        ) : (
          <EmptyState onNew={() => setNewDialogOpen(true)} />
        )}
      </main>
      <NewSnippetDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
      />
      <SpotlightDialog
        open={spotlightOpen}
        onOpenChange={setSpotlightOpen}
      />
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        initialMode={commandPaletteMode}
        onOpenNewSnippet={() => setNewDialogOpen(true)}
        onOpenSpotlight={() => setSpotlightOpen(true)}
      />
    </div>
  );
}
