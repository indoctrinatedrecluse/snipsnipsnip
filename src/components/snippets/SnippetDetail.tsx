import { useEffect, useState } from "react";

import { CodeEditor } from "@/components/editor/CodeEditor";
import { HighlightedCode } from "@/components/editor/HighlightedCode";
import { Toolbar, type EditorMode } from "@/components/layout/Toolbar";
import { Input } from "@/components/ui/input";
import { formatRelativeTime } from "@/hooks/useRelativeTime";
import { useSettingsStore } from "@/stores/settings-store";
import { useSnippetStore } from "@/stores/snippet-store";

export function SnippetDetail() {
  const snippet = useSnippetStore((store) =>
    store.snippets.find((item) => item.id === store.activeId),
  );
  const updateSnippet = useSnippetStore((store) => store.updateSnippet);
  const theme = useSettingsStore((store) => store.theme);

  const [mode, setMode] = useState<EditorMode>("edit");

  // Reset to edit mode whenever a different snippet is opened.
  useEffect(() => {
    setMode("edit");
  }, [snippet?.id]);

  if (!snippet) return null;

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="border-b px-4 pt-4 pb-2">
        <Input
          value={snippet.title}
          onChange={(event) =>
            updateSnippet(snippet.id, { title: event.target.value })
          }
          placeholder="Untitled snippet"
          aria-label="Snippet title"
          className="h-9 border-none bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Updated {formatRelativeTime(snippet.updatedAt)} ·{" "}
          {snippet.tags.length > 0 ? snippet.tags.join(", ") : "No tags"}
        </p>
      </div>

      <Toolbar snippetId={snippet.id} mode={mode} onModeChange={setMode} />

      <div className="min-h-0 flex-1 p-4">
        {mode === "edit" ? (
          <div className="size-full overflow-hidden rounded-lg border bg-background">
            <CodeEditor
              value={snippet.code}
              onChange={(code) => updateSnippet(snippet.id, { code })}
              language={snippet.language}
              theme={theme}
              placeholder="Start typing your code..."
            />
          </div>
        ) : (
          <div className="size-full overflow-hidden rounded-lg border bg-background">
            <HighlightedCode
              code={snippet.code}
              language={snippet.language}
              theme={theme}
              className="size-full p-4"
            />
          </div>
        )}
      </div>
    </div>
  );
}
