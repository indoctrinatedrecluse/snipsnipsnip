import { describe, expect, it } from "vitest";
import {
  buildWebPreviewDocument,
  runJavaScriptSnippet,
} from "./sandbox-runner";

describe("sandbox-runner", () => {
  it("builds web preview document combining html, css, and js files", () => {
    const files = [
      { name: "index.html", code: "<h1>Hello World</h1>", language: "html" },
      { name: "style.css", code: "h1 { color: red; }", language: "css" },
      { name: "app.js", code: "console.log('App running');", language: "javascript" },
    ];
    const doc = buildWebPreviewDocument(files, "", "plaintext");
    expect(doc).toContain("<h1>Hello World</h1>");
    expect(doc).toContain("h1 { color: red; }");
    expect(doc).toContain("console.log('App running');");
    expect(doc).toContain("SNIPPET_SANDBOX_LOG");
  });

  it("builds fallback preview for single css snippet", () => {
    const doc = buildWebPreviewDocument([], ".btn { padding: 8px; }", "css");
    expect(doc).toContain(".btn { padding: 8px; }");
    expect(doc).toContain("CSS Preview");
  });

  it("builds fallback preview for single svg snippet", () => {
    const doc = buildWebPreviewDocument([], "<svg><circle r='10'/></svg>", "svg");
    expect(doc).toContain("<svg><circle r='10'/></svg>");
  });

  it("executes javascript code and intercepts console outputs", async () => {
    const code = `
      console.log('Hello', 123);
      console.warn('Watch out');
      return 40 + 2;
    `;
    const result = await runJavaScriptSnippet(code);
    expect(result.error).toBeUndefined();
    expect(result.returnValue).toBe("42");
    expect(result.logs).toHaveLength(2);
    expect(result.logs[0].level).toBe("log");
    expect(result.logs[0].text).toBe("Hello 123");
    expect(result.logs[1].level).toBe("warn");
    expect(result.logs[1].text).toBe("Watch out");
  });

  it("captures javascript runtime errors properly", async () => {
    const code = `
      const x = null;
      x.someProperty();
    `;
    const result = await runJavaScriptSnippet(code);
    expect(result.error).toBeDefined();
    expect(result.logs).toHaveLength(0);
  });

  it("supports async operations in javascript snippets", async () => {
    const code = `
      const delay = (ms) => new Promise(res => setTimeout(res, ms));
      await delay(10);
      console.log('Done async');
      return { status: 'ok' };
    `;
    const result = await runJavaScriptSnippet(code);
    expect(result.error).toBeUndefined();
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].text).toBe("Done async");
    expect(result.returnValue).toContain('"status": "ok"');
  });
});
