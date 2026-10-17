import type { Snippet } from "@/types/snippet";

export interface ExpandContext {
  clipboardText?: string;
  variables?: Record<string, string>;
  now?: Date;
}

/**
 * Expands a snippet code template with dynamic system tokens and custom variables.
 * Supported dynamic tokens:
 * - {{date}} -> YYYY-MM-DD
 * - {{time}} -> HH:mm:ss
 * - {{datetime}} -> ISO timestamp
 * - {{year}} -> 2026
 * - {{month}} -> MM
 * - {{day}} -> DD
 * - {{uuid}} -> random UUID
 * - {{clipboard}} -> clipboard text
 * - {{varName}} or {{varName:defaultValue}} -> custom variable
 */
export function expandSnippetTemplate(
  code: string,
  context: ExpandContext = {},
): string {
  if (!code) return "";
  const now = context.now || new Date();

  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());

  const dateStr = `${yyyy}-${mm}-${dd}`;
  const timeStr = `${hh}:${min}:${ss}`;
  const isoStr = now.toISOString();

  return code.replace(/\{\{([a-zA-Z0-9_-]+)(?::([^}]*))?\}\}/g, (match, key, defaultVal) => {
    const lowerKey = key.toLowerCase();
    switch (lowerKey) {
      case "date":
        return dateStr;
      case "time":
        return timeStr;
      case "datetime":
        return isoStr;
      case "year":
        return yyyy;
      case "month":
        return mm;
      case "day":
        return dd;
      case "uuid":
        return typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "mock-uuid-1234";
      case "clipboard":
        return context.clipboardText ?? "";
      default:
        if (context.variables && context.variables[key] !== undefined) {
          return context.variables[key];
        }
        return defaultVal !== undefined ? defaultVal : match;
    }
  });
}

/**
 * Finds if the end of a typed string buffer matches any active snippet shortcut prefix.
 */
export function matchExpansionPrefix(
  snippets: Snippet[],
  buffer: string,
  context: ExpandContext = {},
): { snippet: Snippet; prefix: string; expanded: string } | null {
  if (!buffer || snippets.length === 0) return null;

  // Filter only snippets with shortcutPrefix and not trashed
  const activeSnippets = snippets.filter(
    (s) => !s.deletedAt && s.shortcutEnabled !== false && Boolean(s.shortcutPrefix?.trim()),
  );

  // Sort longest prefix first to match more specific shortcuts first (e.g. ";reactcomp" over ";react")
  activeSnippets.sort(
    (a, b) => (b.shortcutPrefix?.length ?? 0) - (a.shortcutPrefix?.length ?? 0),
  );

  for (const snippet of activeSnippets) {
    const prefix = snippet.shortcutPrefix!.trim();
    if (buffer.endsWith(prefix)) {
      const expanded = expandSnippetTemplate(snippet.code, context);
      return { snippet, prefix, expanded };
    }
  }

  return null;
}
