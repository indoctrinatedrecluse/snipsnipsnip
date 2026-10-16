import type { Snippet } from "@/types/snippet";

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  javascript: "js",
  typescript: "ts",
  jsx: "jsx",
  tsx: "tsx",
  python: "py",
  html: "html",
  css: "css",
  json: "json",
  markdown: "md",
  bash: "sh",
  powershell: "ps1",
  sql: "sql",
  yaml: "yaml",
  java: "java",
  c: "c",
  cpp: "cpp",
  csharp: "cs",
  go: "go",
  rust: "rs",
  php: "php",
  ruby: "rb",
  swift: "swift",
  kotlin: "kt",
  dockerfile: "Dockerfile",
  vue: "vue",
  svelte: "svelte",
  xml: "xml",
  toml: "toml",
  graphql: "graphql",
  plaintext: "txt",
};

export function getFilenameForSnippet(snippet: Snippet): string {
  const ext = LANGUAGE_EXTENSIONS[snippet.language.toLowerCase()] ?? "txt";
  const safeName = snippet.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${safeName || "snippet"}.${ext}`;
}

export function parseGistId(gistIdOrUrl: string): string {
  const trimmed = gistIdOrUrl.trim();
  if (!trimmed.includes("/")) return trimmed;
  const parts = trimmed.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

export interface PublishGistOptions {
  snippet: Snippet;
  isPublic: boolean;
  token: string;
}

export interface PublishGistResult {
  id: string;
  htmlUrl: string;
}

export async function publishToGist({
  snippet,
  isPublic,
  token,
}: PublishGistOptions): Promise<PublishGistResult> {
  const filename = getFilenameForSnippet(snippet);
  const response = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description: snippet.description || snippet.title,
      public: isPublic,
      files: {
        [filename]: {
          content: snippet.code || " ",
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub Gist API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as { id: string; html_url: string };
  return { id: data.id, htmlUrl: data.html_url };
}

export interface ImportedGistData {
  title: string;
  description: string;
  code: string;
  language: string;
}

export async function importFromGist(
  gistIdOrUrl: string,
  token?: string,
): Promise<ImportedGistData> {
  const gistId = parseGistId(gistIdOrUrl);
  if (!gistId) throw new Error("Invalid Gist ID or URL.");

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token?.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Gist (${response.status})`);
  }

  const data = (await response.json()) as {
    description?: string;
    files: Record<string, { filename: string; content: string; language?: string }>;
  };

  const fileEntries = Object.values(data.files);
  if (fileEntries.length === 0) {
    throw new Error("Gist contains no files.");
  }

  const firstFile = fileEntries[0];
  const detectedLang = firstFile.language?.toLowerCase() ?? "plaintext";

  return {
    title: data.description || firstFile.filename || "Imported from Gist",
    description: data.description ?? "",
    code: firstFile.content ?? "",
    language: detectedLang,
  };
}
