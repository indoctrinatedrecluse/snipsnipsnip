import { describe, expect, it } from "vitest";
import { buildVsCodeSnippets, toPrefix } from "./ide-export";
import type { Snippet } from "@/types/snippet";

describe("ide-export", () => {
  it("generates a clean prefix from a title", () => {
    expect(toPrefix("Debounce utility (TypeScript)")).toBe("debounce-utility-typescript");
    expect(toPrefix("  Hello World!  ")).toBe("hello-world");
    expect(toPrefix("")).toBe("snippet");
  });

  it("converts snippets into valid VS Code code-snippets format", () => {
    const snippets: Snippet[] = [
      {
        id: "1",
        title: "Log Debug",
        description: "Logs a debug message",
        code: "console.log('debug:', val);",
        language: "typescript",
        tags: ["debug"],
        createdAt: 1000,
        updatedAt: 1000,
        isFavorite: false,
      },
    ];

    const jsonStr = buildVsCodeSnippets(snippets);
    const parsed = JSON.parse(jsonStr);

    expect(parsed["Log Debug"]).toBeDefined();
    expect(parsed["Log Debug"].prefix).toBe("log-debug");
    expect(parsed["Log Debug"].body).toEqual(["console.log('debug:', val);"]);
    expect(parsed["Log Debug"].description).toBe("Logs a debug message");
    expect(parsed["Log Debug"].scope).toBe("typescript");
  });

  it("skips deleted/trashed snippets", () => {
    const snippets: Snippet[] = [
      {
        id: "1",
        title: "Active",
        code: "a",
        language: "plaintext",
        description: "",
        tags: [],
        createdAt: 1000,
        updatedAt: 1000,
        isFavorite: false,
      },
      {
        id: "2",
        title: "Trashed",
        code: "b",
        language: "plaintext",
        description: "",
        tags: [],
        createdAt: 1000,
        updatedAt: 1000,
        isFavorite: false,
        deletedAt: 2000,
      },
    ];

    const parsed = JSON.parse(buildVsCodeSnippets(snippets));
    expect(Object.keys(parsed)).toHaveLength(1);
    expect(parsed["Active"]).toBeDefined();
    expect(parsed["Trashed"]).toBeUndefined();
  });
});
