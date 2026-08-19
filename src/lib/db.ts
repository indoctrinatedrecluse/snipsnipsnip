import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { Snippet } from "@/types/snippet";

interface SnippetVaultDB extends DBSchema {
  snippets: {
    key: string;
    value: Snippet;
    indexes: {
      "by-updatedAt": number;
    };
  };
  meta: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = "snippetvault";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SnippetVaultDB>> | null = null;

function getDB(): Promise<IDBPDatabase<SnippetVaultDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SnippetVaultDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const snippetStore = db.createObjectStore("snippets", {
          keyPath: "id",
        });
        snippetStore.createIndex("by-updatedAt", "updatedAt");
        db.createObjectStore("meta");
      },
    });
  }
  return dbPromise;
}

export async function getAllSnippets(): Promise<Snippet[]> {
  const db = await getDB();
  const snippets = await db.getAll("snippets");
  return snippets.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getSnippet(id: string): Promise<Snippet | undefined> {
  const db = await getDB();
  return db.get("snippets", id);
}

export async function putSnippet(snippet: Snippet): Promise<void> {
  const db = await getDB();
  await db.put("snippets", snippet);
}

export async function bulkPutSnippets(snippets: Snippet[]): Promise<void> {
  if (snippets.length === 0) return;
  const db = await getDB();
  const tx = db.transaction("snippets", "readwrite");
  await Promise.all(snippets.map((snippet) => tx.store.put(snippet)));
  await tx.done;
}

export async function deleteSnippetRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("snippets", id);
}

export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return (await db.get("meta", key)) as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put("meta", value, key);
}

/**
 * Test helper: closes the cached connection and drops the database so the
 * next access recreates it (with object stores) from scratch.
 */
export async function resetDatabaseForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}
