/**
 * Pure editing operations for the code editor. Everything is a pure
 * transformation of `{ value, selectionStart, selectionEnd }`, which keeps
 * the logic fully unit-testable and decoupled from the textarea.
 */

export interface EditPosition {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export type EditResult = EditPosition;

export const INDENT_UNIT = "  ";

const OPENERS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const CLOSERS = ")]}";
const QUOTES = ['"', "'", "`"];
const PAIRS = ["()", "[]", "{}", '""', "''", "``"];

export function insertText(edit: EditPosition, text: string): EditResult {
  const value =
    edit.value.slice(0, edit.selectionStart) +
    text +
    edit.value.slice(edit.selectionEnd);
  const cursor = edit.selectionStart + text.length;
  return { value, selectionStart: cursor, selectionEnd: cursor };
}

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[\w]/.test(char);
}

/**
 * Auto-closing pairs: wraps selections, opens/closes brackets and quotes,
 * skips over an existing closer, and avoids pairing quotes typed mid-word.
 */
export function handleAutoPair(
  edit: EditPosition,
  char: string,
): EditResult {
  const { value, selectionStart, selectionEnd } = edit;

  // Closing bracket: skip over the existing closer if present.
  if (CLOSERS.includes(char)) {
    if (value[selectionEnd] === char && selectionStart === selectionEnd) {
      return {
        value,
        selectionStart: selectionEnd + 1,
        selectionEnd: selectionEnd + 1,
      };
    }
    return insertText(edit, char);
  }

  if (QUOTES.includes(char)) {
    // Don't pair when typing inside a word (e.g. "don't", `can't`).
    if (
      isWordChar(value[selectionStart - 1]) &&
      isWordChar(value[selectionStart])
    ) {
      return insertText(edit, char);
    }
    // The typed quote closes an existing pair — just skip over it.
    if (value[selectionEnd] === char && selectionStart === selectionEnd) {
      return {
        value,
        selectionStart: selectionEnd + 1,
        selectionEnd: selectionEnd + 1,
      };
    }
    if (selectionStart !== selectionEnd) {
      return wrapSelection(edit, char, char);
    }
    const value2 =
      value.slice(0, selectionStart) + char + char + value.slice(selectionEnd);
    const cursor = selectionStart + 1;
    return { value: value2, selectionStart: cursor, selectionEnd: cursor };
  }

  const closer = OPENERS[char];
  if (closer) {
    if (selectionStart !== selectionEnd) {
      return wrapSelection(edit, char, closer);
    }
    const value2 =
      value.slice(0, selectionStart) + char + closer + value.slice(selectionEnd);
    const cursor = selectionStart + 1;
    return { value: value2, selectionStart: cursor, selectionEnd: cursor };
  }

  return insertText(edit, char);
}

function wrapSelection(
  edit: EditPosition,
  open: string,
  close: string,
): EditResult {
  const value =
    edit.value.slice(0, edit.selectionStart) +
    open +
    edit.value.slice(edit.selectionStart, edit.selectionEnd) +
    close +
    edit.value.slice(edit.selectionEnd);
  return {
    value,
    selectionStart: edit.selectionStart + open.length,
    selectionEnd: edit.selectionEnd + open.length,
  };
}

/** True when the character participates in auto-pairing. */
export function isAutoPairChar(char: string): boolean {
  return (
    OPENERS[char] !== undefined || CLOSERS.includes(char) || QUOTES.includes(char)
  );
}

/** Backspace inside an empty pair removes both characters. */
export function handleBackspace(edit: EditPosition): EditResult {
  const { value, selectionStart, selectionEnd } = edit;
  if (selectionStart !== selectionEnd || selectionStart === 0) return edit;
  const pair = value.slice(selectionStart - 1, selectionStart + 1);
  if (PAIRS.includes(pair)) {
    const next =
      value.slice(0, selectionStart - 1) + value.slice(selectionStart + 1);
    return {
      value: next,
      selectionStart: selectionStart - 1,
      selectionEnd: selectionStart - 1,
    };
  }
  return edit;
}

/**
 * Enter with auto-indent: carries the current line's leading whitespace and
 * adds one indent unit when the line ends with a block-opening character.
 */
export function handleEnter(
  edit: EditPosition,
  indentUnit = INDENT_UNIT,
): EditResult {
  const { value, selectionStart, selectionEnd } = edit;
  const before = value.slice(0, selectionStart);
  const lineStart = before.lastIndexOf("\n") + 1;
  const currentLine = before.slice(lineStart);
  const indent = currentLine.match(/^[ \t]*/)?.[0] ?? "";
  const lastChar = currentLine.trimEnd().at(-1);
  const extra = ["{", "(", "[", ":"].includes(lastChar ?? "")
    ? indentUnit
    : "";
  const insert = "\n" + indent + extra;
  const value2 =
    value.slice(0, selectionStart) + insert + value.slice(selectionEnd);
  const cursor = selectionStart + insert.length;
  return { value: value2, selectionStart: cursor, selectionEnd: cursor };
}

export function computeLineStarts(value: string): number[] {
  const starts = [0];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "\n") starts.push(i + 1);
  }
  return starts;
}

export function lineIndexAt(lineStarts: number[], position: number): number {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (lineStarts[mid] <= position) low = mid;
    else high = mid - 1;
  }
  return low;
}

function selectedLineRange(edit: EditPosition, lineStarts: number[]) {
  const startLine = lineIndexAt(lineStarts, edit.selectionStart);
  const endLine = lineIndexAt(
    lineStarts,
    Math.max(edit.selectionEnd - 1, edit.selectionStart),
  );
  return { startLine, endLine };
}

/** Indents (direction = 1) or outdents (direction = -1) the selected lines. */
export function indentSelection(
  edit: EditPosition,
  direction: 1 | -1,
  indentUnit = INDENT_UNIT,
): EditResult {
  const { value, selectionStart, selectionEnd } = edit;
  const empty = selectionStart === selectionEnd;
  const lineStarts = computeLineStarts(value);
  const { startLine, endLine: selectionEndLine } = selectedLineRange(
    edit,
    lineStarts,
  );
  const endLine = empty ? startLine : selectionEndLine;

  const lines = value.split("\n");
  const deltas: number[] = lines.map(() => 0);
  for (let i = startLine; i <= endLine; i++) {
    if (direction > 0) {
      lines[i] = indentUnit + lines[i];
      deltas[i] = indentUnit.length;
    } else {
      const removed = lines[i].startsWith(indentUnit)
        ? indentUnit.length
        : /^[ \t]/.test(lines[i])
          ? 1
          : 0;
      lines[i] = lines[i].slice(removed);
      deltas[i] = -removed;
    }
  }
  const next = lines.join("\n");

  const shiftAt = (position: number): number => {
    let shift = 0;
    for (let i = startLine; i <= endLine; i++) {
      if (lineStarts[i] <= position) shift += deltas[i];
    }
    return shift;
  };

  if (empty) {
    const cursor = selectionStart + shiftAt(selectionStart);
    return { value: next, selectionStart: cursor, selectionEnd: cursor };
  }
  return {
    value: next,
    selectionStart: selectionStart + shiftAt(selectionStart),
    selectionEnd: selectionEnd + shiftAt(selectionEnd),
  };
}

/** Duplicates the current line (empty selection) or the selected lines. */
export function duplicateLines(edit: EditPosition): EditResult {
  const { value, selectionStart, selectionEnd } = edit;
  const empty = selectionStart === selectionEnd;
  const lineStarts = computeLineStarts(value);
  const { startLine, endLine } = selectedLineRange(edit, lineStarts);

  const blockStart = lineStarts[startLine];
  const blockEnd = lineStarts[endLine + 1] ?? value.length;
  const block = value.slice(blockStart, blockEnd);
  // When the block is the last line it has no trailing newline; the copy
  // must start on its own line.
  const separator = block.endsWith("\n") ? "" : "\n";
  const next =
    value.slice(0, blockStart) +
    block +
    separator +
    block +
    value.slice(blockEnd);

  if (!empty) {
    // Original block keeps its offsets; selection stays put.
    return { value: next, selectionStart, selectionEnd };
  }
  const col = selectionStart - blockStart;
  const cursor = blockStart + block.length + separator.length + col;
  return { value: next, selectionStart: cursor, selectionEnd: cursor };
}

/** Moves the current line (empty selection) or selected lines up/down. */
export function moveLines(
  edit: EditPosition,
  direction: 1 | -1,
): EditResult {
  const { value, selectionStart, selectionEnd } = edit;
  const empty = selectionStart === selectionEnd;
  const lineStarts = computeLineStarts(value);
  const { startLine, endLine } = selectedLineRange(edit, lineStarts);
  const lineCount = lineStarts.length;

  if (direction < 0 && startLine === 0) return edit;
  if (direction > 0 && endLine === lineCount - 1) return edit;

  const lines = value.split("\n");
  const count = endLine - startLine + 1;
  const moved = lines.splice(startLine, count);
  const insertAt = direction < 0 ? startLine - 1 : startLine + 1;
  lines.splice(insertAt, 0, ...moved);
  const next = lines.join("\n");

  // Delta applied to the selection: the length (incl. newline) of the line
  // that crossed over the block.
  let delta: number;
  if (direction < 0) {
    const aboveStart = lineStarts[startLine - 1];
    delta = -(lineStarts[startLine] - aboveStart);
  } else {
    const belowEnd = lineStarts[endLine + 2] ?? value.length;
    delta = belowEnd - lineStarts[endLine + 1];
  }

  if (empty) {
    const cursor = selectionStart + delta;
    return { value: next, selectionStart: cursor, selectionEnd: cursor };
  }
  return {
    value: next,
    selectionStart: selectionStart + delta,
    selectionEnd: selectionEnd + delta,
  };
}

/** Per-language comment syntax. */
export function commentSyntax(language: string): {
  line?: string;
  block?: [string, string];
} {
  const lineMap: Record<string, string> = {
    javascript: "//",
    typescript: "//",
    jsx: "//",
    tsx: "//",
    java: "//",
    c: "//",
    cpp: "//",
    csharp: "//",
    go: "//",
    rust: "//",
    php: "//",
    swift: "//",
    kotlin: "//",
    dart: "//",
    svelte: "//",
    vue: "//",
    python: "#",
    ruby: "#",
    bash: "#",
    powershell: "#",
    dockerfile: "#",
    yaml: "#",
    toml: "#",
    graphql: "#",
    sql: "--",
  };
  const blockMap: Record<string, [string, string]> = {
    css: ["/*", "*/"],
    html: ["<!--", "-->"],
    xml: ["<!--", "-->"],
    markdown: ["<!--", "-->"],
    vue: ["<!--", "-->"],
    svelte: ["<!--", "-->"],
  };
  return { line: lineMap[language], block: blockMap[language] };
}

/** Toggles comments on the selected lines (line or block, per language). */
export function toggleComment(
  edit: EditPosition,
  language: string,
): EditResult {
  const syntax = commentSyntax(language);
  if (syntax.line) return toggleLineComment(edit, syntax.line);
  if (syntax.block) {
    return toggleBlockComment(edit, syntax.block[0], syntax.block[1]);
  }
  return edit;
}

function toggleLineComment(edit: EditPosition, token: string): EditResult {
  const { value, selectionStart, selectionEnd } = edit;
  const empty = selectionStart === selectionEnd;
  const lineStarts = computeLineStarts(value);
  const { startLine, endLine } = selectedLineRange(edit, lineStarts);

  const lines = value.split("\n");
  const selected = lines.slice(startLine, endLine + 1);
  const allCommented = selected.every((line) =>
    line.trimStart().startsWith(token),
  );

  for (let i = startLine; i <= endLine; i++) {
    if (allCommented) {
      const index = lines[i].indexOf(token);
      let end = index + token.length;
      if (lines[i][end] === " ") end += 1;
      lines[i] = lines[i].slice(0, index) + lines[i].slice(end);
    } else {
      const whitespace = lines[i].match(/^[ \t]*/)?.[0] ?? "";
      lines[i] =
        whitespace + token + " " + lines[i].slice(whitespace.length);
    }
  }
  const next = lines.join("\n");

  const blockStart = lineStarts[startLine];
  const blockText = lines.slice(startLine, endLine + 1).join("\n");
  if (empty) {
    const col = selectionStart - lineStarts[startLine];
    const cursor = blockStart + Math.min(col, blockText.length);
    return { value: next, selectionStart: cursor, selectionEnd: cursor };
  }
  return {
    value: next,
    selectionStart: blockStart,
    selectionEnd: blockStart + blockText.length,
  };
}

function toggleBlockComment(
  edit: EditPosition,
  open: string,
  close: string,
): EditResult {
  const { value, selectionStart, selectionEnd } = edit;
  const wrapped =
    value.startsWith(open, selectionStart) &&
    value.slice(selectionEnd - close.length, selectionEnd) === close;
  if (wrapped) {
    const innerStart = selectionStart + open.length;
    const innerEnd = selectionEnd - close.length;
    const next =
      value.slice(0, selectionStart) +
      value.slice(innerStart, innerEnd) +
      value.slice(selectionEnd);
    return { value: next, selectionStart: innerStart, selectionEnd: innerEnd };
  }
  const next =
    value.slice(0, selectionStart) +
    open +
    value.slice(selectionStart, selectionEnd) +
    close +
    value.slice(selectionEnd);
  return {
    value: next,
    selectionStart: selectionStart + open.length,
    selectionEnd: selectionEnd + open.length,
  };
}

/** Moves the cursor to the start of the given 1-based line number. */
export function goToLine(edit: EditPosition, lineNumber: number): EditResult {
  const lineStarts = computeLineStarts(edit.value);
  const clamped = Math.max(1, Math.min(lineNumber, lineStarts.length));
  const position = lineStarts[clamped - 1];
  return {
    value: edit.value,
    selectionStart: position,
    selectionEnd: position,
  };
}
