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
  /** Timestamp of the last successful sync to Google Drive. */
  syncedAt?: number;
  /** Google Drive file id backing this snippet (when uploaded). */
  driveFileId?: string;
}

export type SnippetDraft = Pick<Snippet, "title" | "code"> &
  Partial<Omit<Snippet, "id" | "title" | "code" | "createdAt" | "updatedAt">>;

export function createSnippet(draft: SnippetDraft): Snippet {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: draft.title,
    code: draft.code,
    description: draft.description ?? "",
    language: draft.language ?? "plaintext",
    tags: draft.tags ?? [],
    isFavorite: draft.isFavorite ?? false,
    createdAt: now,
    updatedAt: now,
  };
}
