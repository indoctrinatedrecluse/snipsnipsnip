import { getSnippetFiles, type Snippet } from "@/types/snippet";

export interface VsCodeSnippetEntry {
  prefix: string;
  body: string[];
  description?: string;
  scope?: string;
}

export type VsCodeSnippetsPayload = Record<string, VsCodeSnippetEntry>;

export function toPrefix(title: string): string {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "snippet";
}

/**
 * Converts SnippetVault snippets to the VS Code / Cursor `.code-snippets` JSON format.
 */
export function buildVsCodeSnippets(snippets: Snippet[]): string {
  const payload: VsCodeSnippetsPayload = {};

  for (const snippet of snippets) {
    if (snippet.deletedAt) continue;
    const files = getSnippetFiles(snippet);

    if (files.length <= 1) {
      const key = snippet.title || `Snippet ${snippet.id.slice(0, 8)}`;
      const prefix = toPrefix(snippet.title);
      const body = snippet.code.split("\n");

      payload[key] = {
        prefix,
        body,
        description: snippet.description || undefined,
        scope: snippet.language !== "plaintext" ? snippet.language : undefined,
      };
    } else {
      for (const file of files) {
        const key = `${snippet.title || "Snippet"} - ${file.name}`;
        const prefix = toPrefix(`${snippet.title}-${file.name}`);
        const body = file.code.split("\n");

        payload[key] = {
          prefix,
          body,
          description: `${snippet.description ? `${snippet.description} — ` : ""}${file.name}`,
          scope: file.language !== "plaintext" ? file.language : undefined,
        };
      }
    }
  }

  return JSON.stringify(payload, null, 2);
}

export function downloadVsCodeSnippets(
  snippets: Snippet[],
  filename = "snippetvault.code-snippets",
): void {
  const content = buildVsCodeSnippets(snippets);
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
