import { describe, expect, it } from "vitest";

import {
  findMatches,
  replaceAllMatches,
  replaceCurrentMatch,
} from "@/lib/find-replace";

describe("findMatches", () => {
  it("finds all plain matches", () => {
    const { matches } = findMatches("foo bar foo baz", "foo", false, false);
    expect(matches.map((m) => [m.start, m.end])).toEqual([
      [0, 3],
      [8, 11],
    ]);
  });

  it("respects case sensitivity", () => {
    const insensitive = findMatches("Foo foo", "foo", false, false).matches;
    const sensitive = findMatches("Foo foo", "foo", false, true).matches;
    expect(insensitive).toHaveLength(2);
    expect(sensitive).toHaveLength(1);
    expect(sensitive[0].start).toBe(4);
  });

  it("supports regex search", () => {
    const { matches } = findMatches(
      "abc123 def456",
      "\\d+",
      true,
      false,
    );
    expect(matches.map((m) => m.start)).toEqual([3, 10]);
  });

  it("reports an error for invalid regex", () => {
    const { matches, error } = findMatches("abc", "(", true, false);
    expect(matches).toHaveLength(0);
    expect(error).toBeTruthy();
  });

  it("computes line/column with tab expansion (tab stops every 2)", () => {
    const { matches } = findMatches("a\tb\nc", "b", false, false);
    expect(matches[0]).toMatchObject({ line: 0, col: 2, len: 1 });
  });

  it("computes multi-line matches across lines", () => {
    const { matches } = findMatches("line one\nline two", "line", false, false);
    expect(matches.map((m) => m.line)).toEqual([0, 1]);
    expect(matches.map((m) => m.col)).toEqual([0, 0]);
  });

  it("returns no matches for an empty query", () => {
    expect(findMatches("anything", "", false, false).matches).toHaveLength(0);
  });
});

describe("replaceCurrentMatch", () => {
  it("replaces a plain match in place", () => {
    const { matches } = findMatches("one two one", "one", false, false);
    const out = replaceCurrentMatch(
      "one two one",
      matches[0],
      "one",
      "ONE",
      false,
      false,
    );
    expect(out).toBe("ONE two one");
  });

  it("supports capture groups in regex mode", () => {
    const { matches } = findMatches(
      "2024-01-15",
      "(\\d{4})-(\\d{2})",
      true,
      false,
    );
    const out = replaceCurrentMatch(
      "2024-01-15",
      matches[0],
      "(\\d{4})-(\\d{2})",
      "$2/$1",
      true,
      false,
    );
    expect(out).toBe("01/2024-15");
  });
});

describe("replaceAllMatches", () => {
  it("replaces all plain matches", () => {
    const { matches } = findMatches("one two one one", "one", false, false);
    const out = replaceAllMatches(
      "one two one one",
      matches,
      "one",
      "1",
      false,
      false,
    );
    expect(out).toBe("1 two 1 1");
  });

  it("replaces all regex matches with group patterns", () => {
    const { matches } = findMatches("a1 b2", "\\d", true, false);
    const out = replaceAllMatches("a1 b2", matches, "\\d", "#", true, false);
    expect(out).toBe("a# b#");
  });

  it("is a no-op when there are no matches", () => {
    const out = replaceAllMatches("same", [], "x", "y", false, false);
    expect(out).toBe("same");
  });
});
