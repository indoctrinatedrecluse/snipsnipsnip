import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";

import {
  bulkPutSnippets,
  deleteSnippetRecord,
  getAllSnippets,
  getMeta,
  getSnippet,
  putSnippet,
  resetDatabaseForTests,
  setMeta,
} from "@/lib/db";
import type { Snippet } from "@/types/snippet";

function makeSnippet(overrides: Partial<Snippet> = {}): Snippet {
  return {
    id: "snippet-1",
    title: "Test",
    description: "",
    code: "const x = 1;",
    language: "javascript",
    tags: [],
    createdAt: 1000,
    updatedAt: 1000,
    isFavorite: false,
    ...overrides,
  };
}

describe("IndexedDB storage layer", () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  it("round-trips snippets", async () => {
    const snippet = makeSnippet();
    await putSnippet(snippet);

    expect(await getSnippet(snippet.id)).toEqual(snippet);
    expect(await getAllSnippets()).toEqual([snippet]);
  });

  it("sorts getAllSnippets by updatedAt descending", async () => {
    await bulkPutSnippets([
      makeSnippet({ id: "old", updatedAt: 100 }),
      makeSnippet({ id: "new", updatedAt: 300 }),
      makeSnippet({ id: "mid", updatedAt: 200 }),
    ]);

    const all = await getAllSnippets();
    expect(all.map((s) => s.id)).toEqual(["new", "mid", "old"]);
  });

  it("deletes snippets", async () => {
    await putSnippet(makeSnippet());
    await deleteSnippetRecord("snippet-1");
    expect(await getSnippet("snippet-1")).toBeUndefined();
    expect(await getAllSnippets()).toHaveLength(0);
  });

  it("stores and retrieves meta values", async () => {
    expect(await getMeta("key")).toBeUndefined();
    await setMeta("key", { hello: "world" });
    expect(await getMeta<{ hello: string }>("key")).toEqual({ hello: "world" });
  });
});
