import { describe, expect, it } from "vitest";

import { normalizeTag, normalizeTags } from "@/lib/tags";

describe("normalizeTag", () => {
  it("trims, lowercases, and slugifies", () => {
    expect(normalizeTag("  React Hooks ")).toBe("react-hooks");
    expect(normalizeTag("PYTHON")).toBe("python");
  });
});

describe("normalizeTags", () => {
  it("deduplicates case-insensitively", () => {
    expect(normalizeTags(["react", "React", "REACT"])).toEqual(["react"]);
  });

  it("drops empty and oversized tags", () => {
    expect(normalizeTags(["", "   ", "ok", "x".repeat(25)])).toEqual(["ok"]);
  });
});
