import { Code2Icon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onNew: () => void;
}

export function EmptyState({ onNew }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Code2Icon className="size-8" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Your snippets live here</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a snippet to get started, or press Ctrl+N.
        </p>
      </div>
      <Button onClick={onNew}>
        <PlusIcon />
        New snippet
      </Button>
    </div>
  );
}
