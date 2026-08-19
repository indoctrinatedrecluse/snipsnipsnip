export const MAX_TAG_LENGTH = 24;

/** Normalizes a single tag: trim, lowercase, spaces to dashes. */
export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Normalizes and de-duplicates a list of tags, dropping empty/oversized ones. */
export function normalizeTags(raw: string[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const entry of raw) {
    const tag = normalizeTag(entry);
    if (!tag || tag.length > MAX_TAG_LENGTH || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }
  return tags;
}
