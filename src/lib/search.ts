import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";

import type { Snippet } from "@/types/snippet";

/** Fuse.js returns match indices as inclusive [start, end] ranges. */
type MatchIndices = ReadonlyArray<readonly [number, number]>;

export interface SnippetSearchResult {
  snippet: Snippet;
  /** Fuse relevance score (lower = better). 1 = fallback/unsorted. */
  score: number;
  /** Per-field match indices for highlight rendering. */
  highlights: {
    title?: MatchIndices;
    description?: MatchIndices;
    tags?: MatchIndices;
    code?: MatchIndices;
  };
}

const FUSE_OPTIONS: IFuseOptions<Snippet> = {
  keys: [
    { name: "title", weight: 0.4 },
    { name: "tags", weight: 0.25 },
    { name: "description", weight: 0.2 },
    { name: "code", weight: 0.15 },
  ],
  includeMatches: true,
  includeScore: true,
  shouldSort: true,
  // Code is not prose: a match in the middle of a long line is valuable,
  // so don't penalize it for distance from the start of the field.
  ignoreLocation: true,
  // Don't let field length normalize scores — the explicit key weights above
  // should fully govern priority (e.g. a title match beats a code match).
  fieldNormWeight: 0,
  // Allow fuzzy typos, but require at least 2 chars to avoid noise.
  threshold: 0.4,
  minMatchCharLength: 2,
};

const MIN_FUZZY_LENGTH = 2;

/**
 * Searches snippets with fuzzy, relevance-ranked matching.
 *
 * - Empty query: everything, sorted by most recently updated.
 * - Queries shorter than `MIN_FUZZY_LENGTH`: exact substring scan
 *   (fuzzy matching on 1 char is far too noisy).
 * - Otherwise: weighted fuzzy search across title, tags, description, code.
 */
export function searchSnippets(
  snippets: Snippet[],
  query: string,
  languageFilter: string | null,
): SnippetSearchResult[] {
  const trimmed = query.trim();
  const pool = languageFilter
    ? snippets.filter((snippet) => snippet.language === languageFilter)
    : snippets;

  if (!trimmed) {
    return [...pool]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((snippet) => ({ snippet, score: 1, highlights: {} }));
  }

  if (trimmed.length < MIN_FUZZY_LENGTH) {
    const needle = trimmed.toLowerCase();
    return pool
      .filter((snippet) =>
        [snippet.title, snippet.description, snippet.code, snippet.tags.join(" ")]
          .join("\n")
          .toLowerCase()
          .includes(needle),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((snippet) => ({ snippet, score: 1, highlights: {} }));
  }

  const fuse = new Fuse(pool, FUSE_OPTIONS);
  return fuse.search(trimmed).map((result) => {
    const highlights: SnippetSearchResult["highlights"] = {};
    for (const match of result.matches ?? []) {
      const key = match.key;
      if (key && match.indices.length > 0) {
        highlights[key as keyof SnippetSearchResult["highlights"]] =
          match.indices;
      }
    }
    return {
      snippet: result.item,
      score: result.score ?? 1,
      highlights,
    };
  });
}
