import { beforeEach, describe, expect, it } from "vitest";

import { createSnippet } from "@/types/snippet";
import { useSnippetStore } from "@/stores/snippet-store";

describe("snippet store", () => {
  beforeEach(() => {
    useSnippetStore.setState({
      snippets: [],
      activeId: null,
      searchQuery: "",
      languageFilter: null,
    });
  });

  it("adds a snippet and returns its id", () => {
    const id = useSnippetStore.getState().addSnippet({
      title: "Hello",
      code: "console.log('hi')",
      language: "javascript",
    });
    const snippet = useSnippetStore
      .getState()
      .snippets.find((item) => item.id === id);

    expect(snippet).toBeDefined();
    expect(snippet?.title).toBe("Hello");
    expect(snippet?.language).toBe("javascript");
    expect(snippet?.isFavorite).toBe(false);
    expect(snippet?.tags).toEqual([]);
  });

  it("creates snippets with the default language when omitted", () => {
    const id = useSnippetStore.getState().addSnippet({
      title: "Note",
      code: "plain text",
    });
    const snippet = useSnippetStore
      .getState()
      .snippets.find((item) => item.id === id);
    expect(snippet?.language).toBe("plaintext");
  });

  it("updates a snippet and bumps updatedAt", () => {
    const id = useSnippetStore.getState().addSnippet({
      title: "Before",
      code: "",
    });
    const before = useSnippetStore.getState().snippets[0].updatedAt;

    useSnippetStore.getState().updateSnippet(id, { title: "After" });
    const after = useSnippetStore.getState().snippets[0];

    expect(after.title).toBe("After");
    expect(after.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it("deletes a snippet and clears the active selection", () => {
    const id = useSnippetStore.getState().addSnippet({ title: "X", code: "" });
    useSnippetStore.getState().setActive(id);
    useSnippetStore.getState().deleteSnippet(id);

    expect(useSnippetStore.getState().snippets).toHaveLength(0);
    expect(useSnippetStore.getState().activeId).toBeNull();
  });

  it("duplicates a snippet with a '(copy)' suffix", () => {
    const id = useSnippetStore.getState().addSnippet({
      title: "Original",
      code: "const a = 1;",
      language: "javascript",
      tags: ["demo"],
    });
    const copyId = useSnippetStore.getState().duplicateSnippet(id);
    const copy = useSnippetStore
      .getState()
      .snippets.find((item) => item.id === copyId);

    expect(copy).toBeDefined();
    expect(copy?.title).toBe("Original (copy)");
    expect(copy?.code).toBe("const a = 1;");
    expect(copy?.language).toBe("javascript");
    expect(copy?.tags).toEqual(["demo"]);
  });

  it("toggles favorites", () => {
    const id = useSnippetStore.getState().addSnippet({ title: "X", code: "" });
    useSnippetStore.getState().toggleFavorite(id);
    expect(
      useSnippetStore.getState().snippets.find((item) => item.id === id)
        ?.isFavorite,
    ).toBe(true);
    useSnippetStore.getState().toggleFavorite(id);
    expect(
      useSnippetStore.getState().snippets.find((item) => item.id === id)
        ?.isFavorite,
    ).toBe(false);
  });

  it("imports snippets and keeps the newer version of clashes", () => {
    const existing = createSnippet({ title: "Old", code: "v1" });
    useSnippetStore.setState({ snippets: [existing] });

    const newer = { ...existing, updatedAt: existing.updatedAt + 1000, code: "v2" };
    const older = {
      ...existing,
      updatedAt: existing.updatedAt - 1000,
      code: "v1-older",
    };
    const brandNew = createSnippet({ title: "New", code: "n" });

    useSnippetStore.getState().importSnippets([newer, older, brandNew]);

    const byId = new Map(
      useSnippetStore.getState().snippets.map((s) => [s.id, s]),
    );
    expect(byId.size).toBe(2);
    expect(byId.get(existing.id)?.code).toBe("v2");
    expect(byId.has(brandNew.id)).toBe(true);
  });
});

describe("createSnippet", () => {
  it("assigns an id, timestamps, and defaults", () => {
    const snippet = createSnippet({ title: "T", code: "C" });
    expect(snippet.id).toBeTruthy();
    expect(snippet.createdAt).toBeGreaterThan(0);
    expect(snippet.updatedAt).toBe(snippet.createdAt);
    expect(snippet.description).toBe("");
    expect(snippet.isFavorite).toBe(false);
  });
});
