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

  it("moves a snippet to trash and clears active selection", () => {
    const id = useSnippetStore.getState().addSnippet({ title: "To trash", code: "" });
    useSnippetStore.getState().setActive(id);
    useSnippetStore.getState().moveToTrash(id);

    const snippet = useSnippetStore.getState().snippets.find((s) => s.id === id);
    expect(snippet?.deletedAt).toBeDefined();
    expect(typeof snippet?.deletedAt).toBe("number");
    expect(useSnippetStore.getState().activeId).toBeNull();
  });

  it("restores a snippet from trash", () => {
    const id = useSnippetStore.getState().addSnippet({ title: "Restorable", code: "" });
    useSnippetStore.getState().moveToTrash(id);
    expect(useSnippetStore.getState().snippets.find((s) => s.id === id)?.deletedAt).toBeDefined();

    useSnippetStore.getState().restoreSnippet(id);
    expect(useSnippetStore.getState().snippets.find((s) => s.id === id)?.deletedAt).toBeUndefined();
  });

  it("empties trash by removing trashed snippets permanently", () => {
    const id1 = useSnippetStore.getState().addSnippet({ title: "Keep", code: "" });
    const id2 = useSnippetStore.getState().addSnippet({ title: "Trash me", code: "" });
    useSnippetStore.getState().moveToTrash(id2);

    expect(useSnippetStore.getState().snippets).toHaveLength(2);
    useSnippetStore.getState().emptyTrash();

    const remaining = useSnippetStore.getState().snippets;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(id1);
  });

  it("manages folders and collection assignments", () => {
    const id = useSnippetStore.getState().addSnippet({ title: "In React", code: "" });
    useSnippetStore.getState().createFolder("React");
    expect(useSnippetStore.getState().folders).toContain("React");

    useSnippetStore.getState().setSnippetFolder(id, "React");
    expect(useSnippetStore.getState().snippets.find((s) => s.id === id)?.folder).toBe("React");

    useSnippetStore.getState().renameFolder("React", "Frontend");
    expect(useSnippetStore.getState().folders).toContain("Frontend");
    expect(useSnippetStore.getState().folders).not.toContain("React");
    expect(useSnippetStore.getState().snippets.find((s) => s.id === id)?.folder).toBe("Frontend");

    useSnippetStore.getState().deleteFolder("Frontend");
    expect(useSnippetStore.getState().folders).not.toContain("Frontend");
    expect(useSnippetStore.getState().snippets.find((s) => s.id === id)?.folder).toBeUndefined();
  });

  it("manages multi-file tabs within a snippet bundle", () => {
    const id = useSnippetStore.getState().addSnippet({
      title: "Component",
      code: "export const Button = () => null;",
      language: "typescript",
    });

    const file2Id = useSnippetStore.getState().addSnippetFile(
      id,
      "styles.css",
      ".btn { color: red; }",
      "css",
    );

    const snippet = useSnippetStore.getState().snippets.find((s) => s.id === id);
    expect(snippet?.files).toHaveLength(2);
    expect(snippet?.activeFileId).toBe(file2Id);
    expect(snippet?.code).toBe(".btn { color: red; }");
    expect(snippet?.language).toBe("css");

    // Update file 2
    useSnippetStore.getState().updateSnippetFile(id, file2Id, { code: ".btn { color: blue; }" });
    expect(useSnippetStore.getState().snippets.find((s) => s.id === id)?.code).toBe(".btn { color: blue; }");

    // Switch back to file 1
    const firstFileId = snippet?.files?.[0].id ?? "";
    useSnippetStore.getState().setActiveSnippetFile(id, firstFileId);
    expect(useSnippetStore.getState().snippets.find((s) => s.id === id)?.code).toBe("export const Button = () => null;");

    // Delete file 2
    useSnippetStore.getState().deleteSnippetFile(id, file2Id);
    expect(useSnippetStore.getState().snippets.find((s) => s.id === id)?.files).toHaveLength(1);
  });

  it("creates and restores revision history snapshots", () => {
    const id = useSnippetStore.getState().addSnippet({
      title: "Doc",
      code: "version 1",
      language: "plaintext",
    });

    useSnippetStore.getState().addHistorySnapshot(id, "Initial revision");
    useSnippetStore.getState().updateSnippet(id, { code: "version 2" });
    useSnippetStore.getState().addHistorySnapshot(id, "Second revision");

    const snippet = useSnippetStore.getState().snippets.find((s) => s.id === id);
    expect(snippet?.history).toHaveLength(2);

    const v1Entry = snippet?.history?.find((h) => h.summary === "Initial revision");
    expect(v1Entry).toBeDefined();

    if (v1Entry) {
      useSnippetStore.getState().restoreSnippetVersion(id, v1Entry.id);
      expect(useSnippetStore.getState().snippets.find((s) => s.id === id)?.code).toBe("version 1");
    }
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
