import { describe, expect, it } from "vitest";

import { searchSnippets } from "@/lib/search";
import type { Snippet } from "@/types/snippet";

function makeSnippet(overrides: Partial<Snippet>): Snippet {
  return {
    id: "default-id",
    title: "Untitled",
    description: "",
    code: "",
    language: "plaintext",
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    isFavorite: false,
    ...overrides,
  };
}

const fixtures: Snippet[] = [
  makeSnippet({
    id: "title-match",
    title: "Debounce utility",
    code: "const x = 1;",
    updatedAt: 100,
  }),
  makeSnippet({
    id: "code-match",
    title: "Helpers",
    description: "various utils",
    code: "export function debounce(fn) { return fn; }",
    updatedAt: 200,
  }),
  makeSnippet({
    id: "tag-match",
    title: "Notes",
    tags: ["react", "debounce"],
    updatedAt: 300,
  }),
  makeSnippet({
    id: "fuzzy",
    title: "Network fetch",
    code: "console.log('hello world');",
    updatedAt: 400,
  }),
];

describe("searchSnippets", () => {
  it("returns everything sorted by recency for an empty query", () => {
    const results = searchSnippets(fixtures, "", null);
    expect(results.map((r) => r.snippet.id)).toEqual([
      "fuzzy",
      "tag-match",
      "code-match",
      "title-match",
    ]);
  });

  it("ranks exact whole-field matches above partial matches", () => {
    // The tag "debounce" is an exact match (score ~0), the title
    // "Debounce utility" is a prefix match, and the code match is weakest.
    const results = searchSnippets(fixtures, "debounce", null);
    expect(results.map((r) => r.snippet.id)).toEqual([
      "tag-match",
      "title-match",
      "code-match",
    ]);
  });

  it("searches tags", () => {
    const results = searchSnippets(fixtures, "react", null);
    expect(results.map((r) => r.snippet.id)).toContain("tag-match");
  });

  it("fuzzily matches typos in code", () => {
    const results = searchSnippets(fixtures, "conol.log", null);
    expect(results.map((r) => r.snippet.id)).toContain("fuzzy");
  });

  it("is case-insensitive", () => {
    const results = searchSnippets(fixtures, "DEBOUNCE", null);
    const ids = results.map((r) => r.snippet.id);
    expect(ids).toEqual(
      expect.arrayContaining(["tag-match", "title-match", "code-match"]),
    );
    expect(results.find((r) => r.snippet.id === "title-match")?.highlights.title).toBeDefined();
  });

  it("applies the language filter", () => {
    const results = searchSnippets(fixtures, "debounce", "javascript");
    for (const r of results) {
      expect(r.snippet.language).toBe("javascript");
    }
  });

  it("falls back to substring matching for 1-char queries", () => {
    const results = searchSnippets(fixtures, "x", null);
    // "x" appears in "const x" (title-match) and in "export" (code-match).
    expect(results.map((r) => r.snippet.id)).toEqual(
      expect.arrayContaining(["title-match", "code-match"]),
    );
  });

  it("exposes highlight ranges for matched fields", () => {
    const results = searchSnippets(fixtures, "debounce", null);
    const titleResult = results.find((r) => r.snippet.id === "title-match");
    expect(titleResult?.highlights.title).toBeDefined();
    expect(titleResult?.highlights.title?.[0][0]).toBe(0);

    const codeResult = results.find((r) => r.snippet.id === "code-match");
    expect(codeResult?.highlights.code).toBeDefined();
  });
});
