export type DiffType = "equal" | "insert" | "delete";

export interface DiffLine {
  type: DiffType;
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffStats {
  additions: number;
  deletions: number;
}

/**
 * Computes a standard Myers-style / LCS line-by-line diff between two strings.
 */
export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText ? oldText.split("\n") : [];
  const newLines = newText ? newText.split("\n") : [];

  const m = oldLines.length;
  const n = newLines.length;

  // Standard LCS (Longest Common Subsequence) DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (oldLines[i] === newLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to build the diff lines
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({
        type: "equal",
        text: oldLines[i - 1],
        oldLineNumber: i,
        newLineNumber: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({
        type: "insert",
        text: newLines[j - 1],
        newLineNumber: j,
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({
        type: "delete",
        text: oldLines[i - 1],
        oldLineNumber: i,
      });
      i--;
    }
  }

  return result;
}

export function computeDiffStats(diffLines: DiffLine[]): DiffStats {
  let additions = 0;
  let deletions = 0;
  for (const line of diffLines) {
    if (line.type === "insert") additions++;
    else if (line.type === "delete") deletions++;
  }
  return { additions, deletions };
}
