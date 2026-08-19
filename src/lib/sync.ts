/**
 * Google Drive sync engine.
 *
 * Snippets are stored as individual JSON files in the Drive appDataFolder
 * (your hidden "Only you" folder — the app only needs the narrow
 * drive.appdata scope). A small manifest tracks the Drive modifiedTime of
 * every file at last sync, which anchors conflict detection.
 *
 * Conflict resolution: last-write-wins, comparing the local snippet's
 * `updatedAt` against the Drive file's `modifiedTime`.
 */

import {
  deleteSnippetRecord,
  getAllSnippets,
  getMeta,
  putSnippet,
  setMeta,
} from "@/lib/db";
import { ensureAccessToken } from "@/lib/gdrive-auth";
import { useSnippetStore } from "@/stores/snippet-store";
import type { Snippet } from "@/types/snippet";

export const MANIFEST_KEY = "sync.manifest";
export const LAST_SYNCED_KEY = "sync.lastSyncedAt";

const API_BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const APP_DATA_FOLDER = "appDataFolder";

interface ManifestEntry {
  driveFileId: string;
  modifiedTime: number;
}

interface SyncManifest {
  version: 1;
  snippets: Record<string, ManifestEntry>;
}

interface DriveFileMeta {
  id: string;
  name: string;
  modifiedTime: string;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  deleted: number;
}

export class SyncError extends Error {}

async function driveJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await ensureAccessToken();
  if (!token) throw new SyncError("Not signed in to Google Drive.");
  const response = await fetch(`${API_BASE}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new SyncError(
      `Drive API error ${response.status}: ${(await response.text()).slice(0, 200)}`,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function uploadMultipart(
  content: string,
  metadata: Record<string, unknown>,
  method: "POST" | "PATCH",
  fileId?: string,
): Promise<{ id?: string; modifiedTime?: string }> {
  const token = await ensureAccessToken();
  if (!token) throw new SyncError("Not signed in to Google Drive.");
  const path = fileId
    ? `${UPLOAD_BASE}/files/${fileId}?uploadType=multipart&fields=id,modifiedTime`
    : `${UPLOAD_BASE}/files?uploadType=multipart&fields=id,modifiedTime`;

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], {
      type: "application/json; charset=UTF-8",
    }),
  );
  form.append(
    "file",
    new Blob([content], { type: "application/json; charset=UTF-8" }),
  );

  const response = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!response.ok) {
    throw new SyncError(
      `Drive upload error ${response.status}: ${(await response.text()).slice(0, 200)}`,
    );
  }
  return response.json() as Promise<{ id?: string; modifiedTime?: string }>;
}

async function listDriveFiles(): Promise<DriveFileMeta[]> {
  const data = await driveJson<{ files?: DriveFileMeta[] }>(
    "files?spaces=appDataFolder&fields=files(id,name,modifiedTime)&pageSize=1000",
  );
  return data.files ?? [];
}

async function downloadFile(fileId: string): Promise<Snippet> {
  return driveJson<Snippet>(`files/${fileId}?alt=media`);
}

async function deleteDriveFile(fileId: string): Promise<void> {
  await driveJson<void>(`files/${fileId}`, { method: "DELETE" });
}

type Decision =
  | { kind: "push"; snippet: Snippet; driveFileId?: string }
  | { kind: "pull"; snippetId: string; driveFileId: string }
  | { kind: "delete-local"; snippetId: string }
  | { kind: "delete-remote"; snippetId: string; driveFileId: string };

export async function syncWithDrive(): Promise<SyncResult> {
  if (!(await ensureAccessToken())) {
    throw new SyncError("Not signed in to Google Drive.");
  }

  const local = await getAllSnippets();
  const manifest: SyncManifest =
    (await getMeta<SyncManifest>(MANIFEST_KEY)) ?? {
      version: 1,
      snippets: {},
    };

  const remoteFiles = await listDriveFiles();
  const remoteById = new Map<
    string,
    { driveFileId: string; modifiedTime: number }
  >();
  for (const file of remoteFiles) {
    const snippetId = file.name.endsWith(".json")
      ? file.name.slice(0, -5)
      : file.name;
    remoteById.set(snippetId, {
      driveFileId: file.id,
      modifiedTime: new Date(file.modifiedTime).getTime(),
    });
  }

  const localById = new Map(local.map((snippet) => [snippet.id, snippet]));
  const decisions: Decision[] = [];

  // --- Remote files ------------------------------------------------------
  for (const [snippetId, remote] of remoteById) {
    const localSnippet = localById.get(snippetId);
    const manifestEntry = manifest.snippets[snippetId];
    const base = manifestEntry?.modifiedTime ?? 0;
    const localChanged = localSnippet ? localSnippet.updatedAt > base : false;
    const remoteChanged = remote.modifiedTime > base;

    if (!localSnippet) {
      if (!manifestEntry) {
        // New remote snippet we have never seen → download it.
        decisions.push({
          kind: "pull",
          snippetId,
          driveFileId: remote.driveFileId,
        });
      } else if (remoteChanged) {
        // Deleted locally, but edited on Drive after our last sync →
        // remote wins (last-write-wins): resurrect.
        decisions.push({
          kind: "pull",
          snippetId,
          driveFileId: remote.driveFileId,
        });
      } else {
        // Deleted locally and untouched remotely → propagate the deletion.
        decisions.push({
          kind: "delete-remote",
          snippetId,
          driveFileId: remote.driveFileId,
        });
      }
      continue;
    }

    if (localChanged && remoteChanged) {
      // Both changed since last sync → last-write-wins by timestamps.
      if (localSnippet.updatedAt >= remote.modifiedTime) {
        decisions.push({
          kind: "push",
          snippet: localSnippet,
          driveFileId: remote.driveFileId,
        });
      } else {
        decisions.push({
          kind: "pull",
          snippetId,
          driveFileId: remote.driveFileId,
        });
      }
    } else if (localChanged) {
      decisions.push({
        kind: "push",
        snippet: localSnippet,
        driveFileId: remote.driveFileId,
      });
    } else if (remoteChanged) {
      decisions.push({
        kind: "pull",
        snippetId,
        driveFileId: remote.driveFileId,
      });
    }
    // else: both in sync → nothing to do.
  }

  // --- Local-only snippets -----------------------------------------------
  // Snippets with a manifest entry are owned by the "disappeared remote
  // files" logic below (they may need to be re-uploaded or deleted); only
  // brand-new snippets get a plain push here.
  for (const snippet of local) {
    if (remoteById.has(snippet.id)) continue;
    if (manifest.snippets[snippet.id]) continue;
    decisions.push({
      kind: "push",
      snippet,
      driveFileId: snippet.driveFileId,
    });
  }

  // --- Manifest entries whose remote file has disappeared ----------------
  for (const [snippetId, entry] of Object.entries(manifest.snippets)) {
    if (remoteById.has(snippetId)) continue;
    const localSnippet = localById.get(snippetId);
    if (localSnippet && localSnippet.updatedAt > entry.modifiedTime) {
      // Local edit beats the (deleted) remote → re-upload a fresh file.
      decisions.push({ kind: "push", snippet: localSnippet });
    } else {
      // Remote deletion wins → drop our local copy.
      decisions.push({ kind: "delete-local", snippetId });
    }
  }

  // --- Execute decisions -------------------------------------------------
  const now = Date.now();
  let pushed = 0;
  let pulled = 0;
  let deleted = 0;

  for (const decision of decisions) {
    if (decision.kind === "push") {
      const content = JSON.stringify(decision.snippet);
      let driveFileId = decision.driveFileId;
      let modifiedTime: number;

      if (driveFileId) {
        const result = await uploadMultipart(
          content,
          { mimeType: "application/json" },
          "PATCH",
          driveFileId,
        );
        modifiedTime = result.modifiedTime
          ? new Date(result.modifiedTime).getTime()
          : now;
      } else {
        const result = await uploadMultipart(
          content,
          {
            name: `${decision.snippet.id}.json`,
            parents: [APP_DATA_FOLDER],
            mimeType: "application/json",
          },
          "POST",
        );
        if (!result.id) {
          throw new SyncError("Drive upload returned no file id.");
        }
        driveFileId = result.id;
        modifiedTime = result.modifiedTime
          ? new Date(result.modifiedTime).getTime()
          : now;
      }

      const syncedSnippet: Snippet = {
        ...decision.snippet,
        driveFileId,
        syncedAt: now,
      };
      manifest.snippets[decision.snippet.id] = { driveFileId, modifiedTime };
      await putSnippet(syncedSnippet);
      pushed++;
    } else if (decision.kind === "pull") {
      const remoteSnippet = await downloadFile(decision.driveFileId);
      const syncedSnippet: Snippet = {
        ...remoteSnippet,
        driveFileId: decision.driveFileId,
        syncedAt: now,
      };
      manifest.snippets[decision.snippetId] = {
        driveFileId: decision.driveFileId,
        modifiedTime: remoteById.get(decision.snippetId)?.modifiedTime ?? now,
      };
      await putSnippet(syncedSnippet);
      pulled++;
    } else if (decision.kind === "delete-local") {
      await deleteSnippetRecord(decision.snippetId);
      delete manifest.snippets[decision.snippetId];
      deleted++;
    } else {
      await deleteDriveFile(decision.driveFileId);
      delete manifest.snippets[decision.snippetId];
      deleted++;
    }
  }

  await setMeta(MANIFEST_KEY, manifest);
  await setMeta(LAST_SYNCED_KEY, now);

  // Reflect pulls/deletions in the UI store.
  const fresh = await getAllSnippets();
  useSnippetStore.setState((state) => ({
    snippets: fresh,
    activeId:
      state.activeId &&
      fresh.some((snippet) => snippet.id === state.activeId)
        ? state.activeId
        : null,
  }));

  return { pushed, pulled, deleted };
}
