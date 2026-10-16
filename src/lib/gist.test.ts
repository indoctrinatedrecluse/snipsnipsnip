import { describe, expect, it } from "vitest";
import { getFilenameForSnippet, parseGistId } from "./gist";
import type { Snippet } from "@/types/snippet";

describe("gist helpers", () => {
  it("determines filename and extension from language and title", () => {
    const snippet: Snippet = {
      id: "1",
      title: "Quick React Hook",
      code: "const useX = () => {}",
      language: "typescript",
      description: "",
      tags: [],
      createdAt: 1000,
      updatedAt: 1000,
      isFavorite: false,
    };
    expect(getFilenameForSnippet(snippet)).toBe("quick_react_hook.ts");
  });

  it("extracts Gist ID from full URL or bare ID", () => {
    expect(parseGistId("https://gist.github.com/username/aa55bb66cc77")).toBe(
      "aa55bb66cc77",
    );
    expect(parseGistId("aa55bb66cc77")).toBe("aa55bb66cc77");
  });
});
