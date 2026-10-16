import { useState } from "react";
import { toast } from "sonner";

import { Sidebar } from "@/components/layout/Sidebar";
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

  useHotkeys({
    "ctrl+n": () => setNewDialogOpen(true),
    "ctrl+k": (event) => {
      event.preventDefault();
      setSpotlightOpen(true);
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
    </div>
  );
}
