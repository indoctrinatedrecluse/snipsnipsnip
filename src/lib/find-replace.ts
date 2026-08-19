/**
 * Find & replace logic for the code editor.
 *
 * Plain-text search uses indexOf scanning; regex search uses `new RegExp`.
 * Matches carry their visual line/column (tabs expand to the next tab stop)
 * so the editor can paint highlight rectangles over the monospace overlay.
 */

export interface FindMatch {
  /** 0-based char index of the first character. */
  start: number;
  /** 0-based char index just past the last character. */
  end: number;
  /** 0-based line number. */
  line: number;
  /** 0-based visual column within the line. */
  col: number;
  /** Visual width in columns. */
  len: number;
}

const TAB_SIZE = 2;

export interface FindResult {
  matches: FindMatch[];
  /** Non-null when the regex failed to compile. */
  error: string | null;
}

export function findMatches(
  value: string,
  query: string,
  useRegex: boolean,
  caseSensitive: boolean,
): FindResult {
  if (!query) return { matches: [], error: null };

  let raw: Array<{ start: number; end: number }>;
  let error: string | null = null;

  if (useRegex) {
    try {
      const re = new RegExp(query, "g" + (caseSensitive ? "" : "i"));
      raw = [];
      let match: RegExpExecArray | null;
      while ((match = re.exec(value)) !== null) {
        if (match[0].length === 0) {
          // Skip zero-width matches to avoid an infinite loop.
          re.lastIndex++;
          continue;
        }
        raw.push({ start: match.index, end: match.index + match[0].length });
      }
    } catch (err) {
      return {
        matches: [],
        error:
          err instanceof Error
            ? err.message
            : "Invalid regular expression",
      };
    }
  } else {
    const haystack = caseSensitive ? value : value.toLowerCase();
    const needle = caseSensitive ? query : query.toLowerCase();
    raw = [];
    let index = haystack.indexOf(needle);
    while (index !== -1) {
      raw.push({ start: index, end: index + needle.length });
      index = haystack.indexOf(needle, index + Math.max(needle.length, 1));
    }
  }

  return { matches: locateMatches(value, raw), error };
}

function locateMatches(
  value: string,
  raw: Array<{ start: number; end: number }>,
): FindMatch[] {
  const lineStarts = [0];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "\n") lineStarts.push(i + 1);
  }

  const widthOf = (from: number, to: number): number => {
    let col = 0;
    for (let i = from; i < to; i++) {
      col += value[i] === "\t" ? TAB_SIZE - (col % TAB_SIZE) : 1;
    }
    return col;
  };

  return raw.map(({ start, end }) => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (lineStarts[mid] <= start) low = mid;
      else high = mid - 1;
    }
    const line = low;
    return {
      start,
      end,
      line,
      col: widthOf(lineStarts[line], start),
      len: widthOf(start, end),
    };
  });
}

/** Replaces just the given match, preserving capture-group $-patterns. */
export function replaceCurrentMatch(
  value: string,
  match: FindMatch,
  query: string,
  replacement: string,
  useRegex: boolean,
  caseSensitive: boolean,
): string {
  const prefix = value.slice(0, match.start);
  const suffix = value.slice(match.end);
  const segment = value.slice(match.start, match.end);

  if (useRegex) {
    try {
      const re = new RegExp(`^(?:${query})$`, caseSensitive ? "" : "i");
      return prefix + segment.replace(re, replacement) + suffix;
    } catch {
      return prefix + replacement + suffix;
    }
  }
  return prefix + replacement + suffix;
}

/** Replaces every match. Regex mode supports $-patterns in the replacement. */
export function replaceAllMatches(
  value: string,
  matches: FindMatch[],
  query: string,
  replacement: string,
  useRegex: boolean,
  caseSensitive: boolean,
): string {
  if (matches.length === 0) return value;

  if (useRegex) {
    try {
      const re = new RegExp(query, "g" + (caseSensitive ? "" : "i"));
      return value.replace(re, replacement);
    } catch {
      return value;
    }
  }

  // Apply from the end so earlier indices stay valid.
  let result = value;
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    result =
      result.slice(0, match.start) + replacement + result.slice(match.end);
  }
  return result;
}
