import { describe, expect, it } from "vitest";

import { computeDiffStats, computeLineDiff } from "@/lib/diff";

describe("diff utility", () => {
  it("identifies matching lines", () => {
    const text = "line 1\nline 2";
    const diff = computeLineDiff(text, text);
    expect(diff).toHaveLength(2);
    expect(diff.every((l) => l.type === "equal")).toBe(true);
  });

  it("detects additions and deletions", () => {
    const oldText = "const a = 1;\nconst b = 2;\nconst c = 3;";
    const newText = "const a = 1;\nconst b = 20;\nconst c = 3;\nconst d = 4;";

    const diff = computeLineDiff(oldText, newText);
    const stats = computeDiffStats(diff);

    expect(stats.deletions).toBe(1); // "const b = 2;"
    expect(stats.additions).toBe(2); // "const b = 20;" and "const d = 4;"
  });

  it("handles empty strings", () => {
    const diff = computeLineDiff("", "new line");
    expect(diff).toHaveLength(1);
    expect(diff[0].type).toBe("insert");
  });
});
