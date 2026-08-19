import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";

// The sync engine needs a token to run; we don't want to touch real GIS.
vi.mock("@/lib/gdrive-auth", () => ({
  ensureAccessToken: () => Promise.resolve("fake-access-token"),
}));

import {
  deleteSnippetRecord,
  getAllSnippets,
  getMeta,
  putSnippet,
  resetDatabaseForTests,
} from "@/lib/db";
import { MANIFEST_KEY, syncWithDrive } from "@/lib/sync";
import { useSnippetStore } from "@/stores/snippet-store";
import type { Snippet } from "@/types/snippet";

interface FakeDriveFile {
  id: string;
  name: string;
  content: Snippet;
  modifiedTime: string;
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () =>
      typeof body === "string" ? body : JSON.stringify(body),
  };
}

/** Installs a fake Google Drive REST API backed by an in-memory Map. */
function setupDrive(initial: FakeDriveFile[] = []) {
  const drive = new Map<string, FakeDriveFile>();
  for (const file of initial) drive.set(file.id, file);
  let nextId = initial.length + 1;

  const nowIso = () => new Date(Date.now()).toISOString();

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (method === "DELETE" && url.includes("/drive/v3/files/")) {
        const id = url.split("/files/")[1].split("?")[0];
        drive.delete(id);
        return jsonResponse(null, 204);
      }

      if (
        method === "GET" &&
        url.includes("/drive/v3/files") &&
        !url.includes("alt=media")
      ) {
        const files = [...drive.values()].map(({ id, name, modifiedTime }) => ({
          id,
          name,
          modifiedTime,
        }));
        return jsonResponse({ files });
      }

      if (method === "GET" && url.includes("alt=media")) {
        const id = url.split("/files/")[1].split("?")[0];
        const file = drive.get(id);
        if (!file) return jsonResponse({ error: "not found" }, 404);
        return jsonResponse(file.content);
      }

      if (url.includes("upload/drive/v3/files")) {
        const form = init?.body as FormData;
        const metadata = JSON.parse(
          await (form.get("metadata") as Blob).text(),
        ) as { name?: string };
        const content = JSON.parse(
          await (form.get("file") as Blob).text(),
        ) as Snippet;
        const modifiedTime = nowIso();

        if (method === "POST") {
          const id = `file-${nextId++}`;
          drive.set(id, {
            id,
            name: metadata.name ?? `${content.id}.json`,
            content,
            modifiedTime,
          });
          return jsonResponse({ id, modifiedTime });
        }
        const id = url.split("/files/")[1].split("?")[0];
        const existing = drive.get(id);
        drive.set(id, {
          id,
          name: metadata.name ?? existing?.name ?? `${content.id}.json`,
          content,
          modifiedTime,
        });
        return jsonResponse({ id, modifiedTime });
      }

      return jsonResponse({ error: "unhandled request" }, 500);
    }),
  );

  return {
    drive,
    has: (id: string) => drive.has(id),
    get: (id: string) => drive.get(id),
    list: () => [...drive.values()],
    size: () => drive.size,
  };
}

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

async function clearStores() {
  useSnippetStore.setState({
    snippets: [],
    activeId: null,
    searchQuery: "",
    languageFilter: null,
  });
  await resetDatabaseForTests();
}

describe("syncWithDrive", () => {
  beforeEach(async () => {
    await clearStores();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pushes local snippets to Drive on the first sync", async () => {
    const drive = setupDrive();
    const snippet = makeSnippet();
    await putSnippet(snippet);

    const result = await syncWithDrive();

    expect(result).toEqual({ pushed: 1, pulled: 0, deleted: 0 });
    expect(drive.size()).toBe(1);

    const remoteFile = drive.list()[0];
    expect(remoteFile.name).toBe("snippet-1.json");
    expect(remoteFile.content.code).toBe("const x = 1;");

    const [stored] = await getAllSnippets();
    expect(stored.driveFileId).toBe(remoteFile.id);
    expect(stored.syncedAt).toBeGreaterThan(0);

    const manifest = await getMeta<{
      snippets: Record<string, unknown>;
    }>(MANIFEST_KEY);
    expect(manifest?.snippets["snippet-1"]).toBeDefined();
  });

  it("is a no-op when local and remote are in sync", async () => {
    const drive = setupDrive();
    await putSnippet(makeSnippet());

    await syncWithDrive();
    const second = await syncWithDrive();

    expect(second).toEqual({ pushed: 0, pulled: 0, deleted: 0 });
    expect(drive.size()).toBe(1);
  });

  it("pulls remote snippets that are missing locally", async () => {
    const remoteSnippet = makeSnippet({
      id: "remote-1",
      title: "From drive",
      code: "print('hi')",
      language: "python",
      updatedAt: 5000,
    });
    setupDrive([
      {
        id: "drive-file-1",
        name: "remote-1.json",
        content: remoteSnippet,
        modifiedTime: "2026-01-02T00:00:00.000Z",
      },
    ]);

    const result = await syncWithDrive();

    expect(result).toEqual({ pushed: 0, pulled: 1, deleted: 0 });
    const [stored] = await getAllSnippets();
    expect(stored.id).toBe("remote-1");
    expect(stored.title).toBe("From drive");
    expect(stored.driveFileId).toBe("drive-file-1");
    expect(useSnippetStore.getState().snippets.map((s) => s.id)).toContain(
      "remote-1",
    );
  });

  it("keeps the local copy when it is newer (LWW)", async () => {
    // Local edited in June 2026; remote last touched January 2026.
    const localJune = new Date("2026-06-01T00:00:00.000Z").getTime();
    const remoteJan = new Date("2026-01-01T00:00:00.000Z").getTime();

    const localSnippet = makeSnippet({
      updatedAt: localJune,
      code: "local wins",
    });
    const drive = setupDrive([
      {
        id: "drive-file-1",
        name: "snippet-1.json",
        content: makeSnippet({ updatedAt: remoteJan, code: "remote old" }),
        modifiedTime: "2026-01-01T00:00:00.000Z",
      },
    ]);
    await putSnippet(localSnippet);

    const result = await syncWithDrive();

    expect(result).toEqual({ pushed: 1, pulled: 0, deleted: 0 });
    const [stored] = await getAllSnippets();
    expect(stored.code).toBe("local wins");
    expect(drive.get("drive-file-1")!.content.code).toBe("local wins");
  });

  it("pulls the remote copy when it is newer (LWW)", async () => {
    // Local last touched January 2026; remote edited June 2026.
    const localJan = new Date("2026-01-01T00:00:00.000Z").getTime();
    const remoteJune = new Date("2026-06-01T00:00:00.000Z").getTime();

    const localSnippet = makeSnippet({
      updatedAt: localJan,
      code: "local old",
    });
    setupDrive([
      {
        id: "drive-file-1",
        name: "snippet-1.json",
        content: makeSnippet({ updatedAt: remoteJune, code: "remote wins" }),
        modifiedTime: "2026-06-01T00:00:00.000Z",
      },
    ]);
    await putSnippet(localSnippet);

    const result = await syncWithDrive();

    expect(result).toEqual({ pushed: 0, pulled: 1, deleted: 0 });
    const [stored] = await getAllSnippets();
    expect(stored.code).toBe("remote wins");
  });

  it("propagates local deletions to Drive", async () => {
    const drive = setupDrive();
    await putSnippet(makeSnippet());
    await syncWithDrive();
    expect(drive.size()).toBe(1);

    // Delete locally, then sync again.
    await deleteSnippetRecord("snippet-1");

    const result = await syncWithDrive();

    expect(result).toEqual({ pushed: 0, pulled: 0, deleted: 1 });
    expect(drive.size()).toBe(0);
  });

  it("propagates remote deletions locally", async () => {
    const drive = setupDrive();
    await putSnippet(makeSnippet());
    await syncWithDrive();
    expect(drive.size()).toBe(1);

    // Delete on Drive, then sync again.
    drive.drive.delete(drive.list()[0].id);
    expect(drive.size()).toBe(0);

    const result = await syncWithDrive();

    expect(result).toEqual({ pushed: 0, pulled: 0, deleted: 1 });
    expect(await getAllSnippets()).toHaveLength(0);
  });
});
