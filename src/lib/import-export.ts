import { normalizeTags } from "@/lib/tags";
import type { Snippet } from "@/types/snippet";

export const EXPORT_VERSION = 1;

export interface ExportPayload {
  version: number;
  exportedAt: string;
  snippets: Snippet[];
}

/** Builds the versioned export payload for a snippet collection. */
export function buildExportPayload(snippets: Snippet[]): ExportPayload {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    snippets,
  };
}

/** e.g. `snippetvault-2026-08-19.json` */
export function exportFileName(date: Date = new Date()): string {
  return `snippetvault-${date.toISOString().slice(0, 10)}.json`;
}

/** Triggers a browser download of `payload` as a pretty-printed JSON file. */
export function downloadJson(payload: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Validates a single raw entry and coerces it into a full Snippet. */
export function normalizeImportedSnippet(raw: unknown): Snippet | null {
  if (
    !isRecord(raw) ||
    typeof raw.id !== "string" ||
    typeof raw.title !== "string" ||
    typeof raw.code !== "string"
  ) {
    return null;
  }
  const now = Date.now();
  return {
    id: raw.id,
    title: raw.title,
    description: typeof raw.description === "string" ? raw.description : "",
    code: raw.code,
    language:
      typeof raw.language === "string" && raw.language
        ? raw.language
        : "plaintext",
    tags: Array.isArray(raw.tags)
      ? normalizeTags(raw.tags.map(String))
      : [],
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : now,
    isFavorite: raw.isFavorite === true,
  };
}

/**
 * Parses an export file. Accepts the versioned payload format or a bare
 * array of snippets. Malformed entries are skipped.
 */
export function parseImportPayload(text: string): Snippet[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }

  const rawList: unknown[] | null = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.snippets)
      ? data.snippets
      : null;

  if (!rawList) {
    throw new Error(
      "Unrecognized file format. Expected a SnippetVault export.",
    );
  }

  return rawList
    .map(normalizeImportedSnippet)
    .filter((snippet): snippet is Snippet => snippet !== null);
}
