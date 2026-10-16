import "@testing-library/jest-dom/vitest";

// Polyfill Range DOM rect methods for CodeMirror 6 in jsdom
if (typeof Range !== "undefined") {
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () =>
      [] as unknown as DOMRectList;
  }
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () =>
      new DOMRect(0, 0, 0, 0);
  }
}
