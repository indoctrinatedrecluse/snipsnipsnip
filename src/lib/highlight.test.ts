import { describe, expect, it } from "vitest";

import { highlightCode, prewarmHighlighter } from "@/lib/highlight";

describe("highlightCode", () => {
  it("produces Shiki HTML for a supported language", async () => {
    const html = await highlightCode(
      "const answer = 42;",
      "javascript",
      "dark",
    );
    expect(html).toContain('class="shiki');
    expect(html).toContain("<code>");
    expect(html).toContain("answer");
  });

  it("falls back to plain text for unsupported languages", async () => {
    const html = await highlightCode(
      "let <raw> = true;",
      "not-a-real-language",
      "dark",
    );
    expect(html).toContain('class="shiki');
    expect(html).toContain("&#x3C;raw>");
    expect(html).not.toContain("<raw>");
  });

  it("honors the light/dark theme selection", async () => {
    const light = await highlightCode("x", "python", "light");
    const dark = await highlightCode("x", "python", "dark");
    expect(light).toContain("github-light");
    expect(dark).toContain("github-dark");
  });

  it("can be prewarmed without throwing", async () => {
    expect(() => prewarmHighlighter()).not.toThrow();
    // give it a moment to settle, then make sure a real call still works
    await new Promise((resolve) => setTimeout(resolve, 50));
    const html = await highlightCode("print('ok')", "python", "dark");
    expect(html).toContain('class="shiki');
  });
});
