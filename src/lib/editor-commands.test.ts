import { describe, expect, it } from "vitest";

import {
  duplicateLines,
  goToLine,
  handleAutoPair,
  handleBackspace,
  handleEnter,
  indentSelection,
  moveLines,
  toggleComment,
} from "@/lib/editor-commands";

function pos(value: string, selectionStart = 0, selectionEnd = selectionStart) {
  return { value, selectionStart, selectionEnd };
}

describe("handleAutoPair", () => {
  it("opens and closes brackets", () => {
    expect(handleAutoPair(pos("ab", 1), "(")).toEqual(
      pos("a()b", 2),
    );
  });

  it("skips over an existing closer", () => {
    expect(handleAutoPair(pos("()", 1), ")")).toEqual(pos("()", 2));
  });

  it("wraps a selection", () => {
    expect(handleAutoPair(pos("abc", 1, 3), "[")).toEqual(
      pos("a[bc]", 2, 4),
    );
  });

  it("pairs quotes", () => {
    expect(handleAutoPair(pos("ab", 0), '"')).toEqual(pos('""ab', 1));
  });

  it("does not pair quotes typed inside a word", () => {
    expect(handleAutoPair(pos("cant", 3), "'")).toEqual(pos("can't", 4));
  });
});

describe("handleBackspace", () => {
  it("deletes an empty pair", () => {
    expect(handleBackspace(pos("()", 1))).toEqual(pos("", 0));
  });

  it("leaves non-pair deletion to the browser", () => {
    expect(handleBackspace(pos("ab", 1))).toEqual(pos("ab", 1));
  });
});

describe("handleEnter", () => {
  it("carries indentation", () => {
    expect(handleEnter(pos("  foo", 5))).toEqual(pos("  foo\n  ", 8));
  });

  it("adds an indent unit after an opening brace", () => {
    expect(handleEnter(pos("if (x) {", 8))).toEqual(
      pos("if (x) {\n  ", 11),
    );
  });
});

describe("indentSelection", () => {
  it("indents a single line with an empty selection", () => {
    expect(indentSelection(pos("foo", 1), 1)).toEqual(pos("  foo", 3));
  });

  it("outdents a line", () => {
    expect(indentSelection(pos("  foo", 2), -1)).toEqual(pos("foo", 0));
  });

  it("indents multiple selected lines", () => {
    const edit = pos("a\nb\nc", 0, 3);
    const result = indentSelection(edit, 1);
    expect(result.value).toBe("  a\n  b\nc");
    expect(result.selectionEnd).toBe(7);
  });
});

describe("duplicateLines", () => {
  it("duplicates the current line and moves the cursor to the copy", () => {
    const result = duplicateLines(pos("a\nb", 2));
    expect(result.value).toBe("a\nb\nb");
    expect(result.selectionStart).toBe(4);
  });
});

describe("moveLines", () => {
  it("moves the current line down", () => {
    expect(moveLines(pos("a\nb\nc", 0), 1).value).toBe("b\na\nc");
  });

  it("moves the current line up", () => {
    expect(moveLines(pos("a\nb\nc", 2), -1).value).toBe("b\na\nc");
  });

  it("does nothing at the document edges", () => {
    expect(moveLines(pos("a", 0), -1)).toEqual(pos("a", 0));
    expect(moveLines(pos("a", 1), 1)).toEqual(pos("a", 1));
  });
});

describe("toggleComment", () => {
  it("comments and uncomments a line with //", () => {
    const edit = pos("const x = 1;", 0);
    const commented = toggleComment(edit, "typescript");
    expect(commented.value).toBe("// const x = 1;");
    expect(toggleComment(commented, "typescript").value).toBe("const x = 1;");
  });

  it("uses # for python", () => {
    expect(toggleComment(pos("print(1)", 0), "python").value).toBe(
      "# print(1)",
    );
  });

  it("uses block comments for css", () => {
    const edit = pos("color: red;", 0, 11);
    const commented = toggleComment(edit, "css");
    expect(commented.value).toBe("/*color: red;*/");
  });
});

describe("goToLine", () => {
  it("moves the cursor to the requested line", () => {
    expect(goToLine(pos("a\nb\nc", 0), 3)).toEqual(pos("a\nb\nc", 4));
  });

  it("clamps out-of-range line numbers", () => {
    expect(goToLine(pos("a\nb", 0), 99)).toEqual(pos("a\nb", 2));
    expect(goToLine(pos("a\nb", 0), 0)).toEqual(pos("a\nb", 0));
  });
});
