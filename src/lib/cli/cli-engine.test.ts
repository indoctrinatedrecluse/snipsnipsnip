import { describe, expect, it, vi } from "vitest";
import { parseCliArgs, runCliCommand } from "./cli-engine";
import type { Snippet } from "@/types/snippet";

const mockSnippets: Snippet[] = [
  {
    id: "101",
    title: "Debounce Function",
    description: "Debounce helper",
    code: "function debounce() {}",
    language: "typescript",
    tags: ["utils"],
    createdAt: 0,
    updatedAt: 0,
    isFavorite: false,
  },
  {
    id: "102",
    title: "SQL Select All",
    description: "Basic query",
    code: "SELECT * FROM users;",
    language: "sql",
    tags: ["database"],
    createdAt: 0,
    updatedAt: 0,
    isFavorite: false,
  },
];

describe("cli-engine", () => {
  it("parses CLI arguments correctly", () => {
    expect(parseCliArgs(["node", "sv", "ls"]).command).toBe("list");
    expect(parseCliArgs(["node", "sv", "get", "debounce"]).query).toBe("debounce");
    expect(parseCliArgs(["node", "sv", "search", "sql"]).query).toBe("sql");

    const addArgs = parseCliArgs([
      "node",
      "sv",
      "add",
      "--title",
      "My Snippet",
      "--lang",
      "python",
      "print(1)",
    ]);
    expect(addArgs.command).toBe("add");
    expect(addArgs.title).toBe("My Snippet");
    expect(addArgs.language).toBe("python");
    expect(addArgs.code).toBe("print(1)");
  });

  it("lists all snippets", () => {
    const res = runCliCommand({ command: "list" }, mockSnippets);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("Debounce Function");
    expect(res.stdout).toContain("SQL Select All");
  });

  it("gets snippet code by title or id for piping", () => {
    const res = runCliCommand({ command: "get", query: "debounce" }, mockSnippets);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toBe("function debounce() {}");
  });

  it("searches snippets by keyword", () => {
    const res = runCliCommand({ command: "search", query: "users" }, mockSnippets);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("SQL Select All");
  });

  it("adds a new snippet via callback", () => {
    const onAdd = vi.fn();
    const res = runCliCommand(
      { command: "add", title: "New One", language: "rust", code: "fn main() {}" },
      mockSnippets,
      onAdd,
    );
    expect(res.exitCode).toBe(0);
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New One",
        language: "rust",
        code: "fn main() {}",
      }),
    );
  });
});
