import { describe, expect, it } from "vitest";

import {
  buildExportPayload,
  exportFileName,
  normalizeImportedSnippet,
  parseImportPayload,
} from "@/lib/import-export";
import type { Snippet } from "@/types/snippet";

const sample: Snippet = {
  id: "abc-123",
  title: "Debounce",
  description: "Utility",
  code: "const x = 1;",
  language: "typescript",
  tags: ["react", "hooks"],
  createdAt: 1000,
  updatedAt: 2000,
  isFavorite: true,
};

describe("export helpers", () => {
  it("builds a versioned payload", () => {
    const payload = buildExportPayload([sample]);
    expect(payload.version).toBe(1);
    expect(payload.snippets).toHaveLength(1);
    expect(typeof payload.exportedAt).toBe("string");
  });

  it("produces a dated filename", () => {
    const name = exportFileName(new Date("2026-08-19T00:00:00Z"));
    expect(name).toBe("snippetvault-2026-08-19.json");
  });
});

describe("parseImportPayload", () => {
  it("parses the versioned wrapper format", () => {
    const text = JSON.stringify(buildExportPayload([sample]));
    expect(parseImportPayload(text)).toEqual([sample]);
  });

  it("accepts a bare array of snippets", () => {
    expect(parseImportPayload(JSON.stringify([sample]))).toEqual([sample]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseImportPayload("{not json")).toThrow(/valid JSON/);
  });

  it("throws on unrecognized shapes", () => {
    expect(() => parseImportPayload(JSON.stringify({ hello: 1 }))).toThrow(
      /Unrecognized/,
    );
  });

  it("skips malformed entries and fills defaults", () => {
    const text = JSON.stringify([
      sample,
      { id: "broken" }, // missing title/code
      { id: "minimal", title: "T", code: "C" }, // fills defaults
    ]);
    const parsed = parseImportPayload(text);
    expect(parsed).toHaveLength(2);
    const minimal = parsed.find((s) => s.id === "minimal");
    expect(minimal?.language).toBe("plaintext");
    expect(minimal?.tags).toEqual([]);
    expect(minimal?.isFavorite).toBe(false);
  });
});

describe("normalizeImportedSnippet", () => {
  it("normalizes tags and coerces fields", () => {
    const result = normalizeImportedSnippet({
      id: "n",
      title: "T",
      code: "C",
      tags: ["React", "  hooks "],
    });
    expect(result?.tags).toEqual(["react", "hooks"]);
  });

  it("returns null for invalid entries", () => {
    expect(normalizeImportedSnippet({ id: "x" })).toBeNull();
    expect(normalizeImportedSnippet(null)).toBeNull();
  });
});
