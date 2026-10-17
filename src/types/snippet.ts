export interface SnippetFile {
  id: string;
  name: string;
  code: string;
  language: string;
}

export interface SnippetHistoryEntry {
  id: string;
  timestamp: number;
  code: string;
  language: string;
  files?: SnippetFile[];
  summary?: string;
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
}

export interface Snippet {
  id: string;
  title: string;
  description: string;
  code: string;
  language: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  folder?: string;
  /** Timestamp when moved to trash; undefined if active. */
  deletedAt?: number;
  /** Timestamp of the last successful sync to Google Drive. */
  syncedAt?: number;
  /** Google Drive file id backing this snippet (when uploaded). */
  driveFileId?: string;

  /** Multi-file bundle support. */
  files?: SnippetFile[];
  /** ID of the currently selected file tab. */
  activeFileId?: string;

  /** Local revision history snapshots. */
  history?: SnippetHistoryEntry[];

  /** Client-side zero-knowledge encryption */
  isEncrypted?: boolean;
  encryptedPayload?: EncryptedData;

  /** Global system-wide expansion trigger prefix (e.g. ';reactcomp') */
  shortcutPrefix?: string;
  shortcutEnabled?: boolean;
}

export type SnippetDraft = Pick<Snippet, "title" | "code"> &
  Partial<Omit<Snippet, "id" | "title" | "code" | "createdAt" | "updatedAt">>;

export function getSnippetFiles(snippet: Snippet): SnippetFile[] {
  if (snippet.files && snippet.files.length > 0) {
    return snippet.files;
  }
  const ext = snippet.language === "plaintext" ? "txt" : snippet.language;
  const name = snippet.title.includes(".") ? snippet.title : `main.${ext}`;
  return [
    {
      id: "file-default",
      name,
      code: snippet.code,
      language: snippet.language,
    },
  ];
}

export function getActiveFile(snippet: Snippet): SnippetFile {
  const files = getSnippetFiles(snippet);
  if (snippet.activeFileId) {
    const found = files.find((f) => f.id === snippet.activeFileId);
    if (found) return found;
  }
  return files[0];
}

export function createSnippet(draft: SnippetDraft): Snippet {
  const now = Date.now();
  const initialLanguage = draft.language ?? "plaintext";
  const initialCode = draft.code;
  const initialFiles: SnippetFile[] = draft.files && draft.files.length > 0
    ? draft.files
    : [
        {
          id: crypto.randomUUID(),
          name: draft.title.includes(".") ? draft.title : `main.${initialLanguage === "plaintext" ? "txt" : initialLanguage}`,
          code: initialCode,
          language: initialLanguage,
        },
      ];

  return {
    id: crypto.randomUUID(),
    title: draft.title,
    code: initialCode,
    description: draft.description ?? "",
    language: initialLanguage,
    tags: draft.tags ?? [],
    isFavorite: draft.isFavorite ?? false,
    folder: draft.folder,
    deletedAt: draft.deletedAt,
    files: initialFiles,
    activeFileId: initialFiles[0]?.id,
    history: draft.history ?? [],
    isEncrypted: draft.isEncrypted ?? false,
    encryptedPayload: draft.encryptedPayload,
    shortcutPrefix: draft.shortcutPrefix,
    shortcutEnabled: draft.shortcutEnabled ?? false,
    createdAt: now,
    updatedAt: now,
  };
}
