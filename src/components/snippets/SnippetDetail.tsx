import { useEffect, useState } from "react";

import { CodeEditor } from "@/components/editor/CodeEditor";
import { FindReplaceBar } from "@/components/editor/FindReplaceBar";
import { HighlightedCode } from "@/components/editor/HighlightedCode";
import { Toolbar, type EditorMode } from "@/components/layout/Toolbar";
import { TagInput } from "@/components/snippets/TagInput";
import { Input } from "@/components/ui/input";
import { useFindReplace } from "@/hooks/useFindReplace";
import { useHotkeys } from "@/hooks/useHotkeys";
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

  const find = useFindReplace(snippet?.code ?? "");

  useHotkeys({
    "ctrl+f": (event) => {
      event.preventDefault();
      find.openFind();
    },
  });

  if (!snippet) return null;

  const applyCodeChange = (code: string) =>
    updateSnippet(snippet.id, { code });

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="space-y-2 border-b px-4 pt-4 pb-3">
        <Input
          value={snippet.title}
          onChange={(event) =>
            updateSnippet(snippet.id, { title: event.target.value })
          }
          placeholder="Untitled snippet"
          aria-label="Snippet title"
          className="h-9 border-none bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
        />
        <Input
          value={snippet.description}
          onChange={(event) =>
            updateSnippet(snippet.id, { description: event.target.value })
          }
          placeholder="Add a description…"
          aria-label="Snippet description"
          className="h-7 border-none bg-transparent px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
        />
        <TagInput
          value={snippet.tags}
          onChange={(tags) => updateSnippet(snippet.id, { tags })}
          className="w-full sm:max-w-md"
        />
        <p className="text-xs text-muted-foreground">
          Updated {formatRelativeTime(snippet.updatedAt)}
        </p>
      </div>

      <Toolbar snippetId={snippet.id} mode={mode} onModeChange={setMode} />

      <div className="min-h-0 flex-1 p-4">
        <div className="flex size-full flex-col overflow-hidden rounded-lg border bg-background">
          {find.open && (
            <FindReplaceBar
              findQuery={find.findQuery}
              onFindQueryChange={find.setFindQuery}
              replaceQuery={find.replaceQuery}
              onReplaceQueryChange={find.setReplaceQuery}
              useRegex={find.useRegex}
              onUseRegexChange={find.setUseRegex}
              caseSensitive={find.caseSensitive}
              onCaseSensitiveChange={find.setCaseSensitive}
              matchCount={find.matches.length}
              matchIndex={find.matchIndex}
              regexError={find.regexError}
              onNext={find.next}
              onPrev={find.prev}
              onReplace={() => find.replace(applyCodeChange)}
              onReplaceAll={() => find.replaceAll(applyCodeChange)}
              onClose={() => find.setOpen(false)}
            />
          )}
          <div className="min-h-0 flex-1">
            {mode === "edit" ? (
              <CodeEditor
                value={snippet.code}
                onChange={applyCodeChange}
                language={snippet.language}
                theme={theme}
                placeholder="Start typing your code..."
                matches={find.matches}
                currentMatchIndex={find.matchIndex}
              />
            ) : (
              <HighlightedCode
                code={snippet.code}
                language={snippet.language}
                theme={theme}
                className="size-full p-4"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
