import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAiPrompt,
  executeAiAction,
  extractCodeAndExplanation,
} from "./ai-service";

describe("ai-service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds appropriate prompts for different actions", () => {
    const explain = buildAiPrompt("explain", "const a = 1;", "typescript");
    expect(explain.user).toContain("Explain this typescript code");

    const tests = buildAiPrompt("tests", "function sum(a,b){return a+b;}", "javascript");
    expect(tests.user).toContain("unit test suite");

    const convert = buildAiPrompt("convert", "print('hello')", "python", undefined, "Rust");
    expect(convert.user).toContain("idiomatic Rust");
  });

  it("extracts fenced code blocks and explanations cleanly", () => {
    const markdown = `
Here is the refactored code:

\`\`\`typescript
export function add(a: number, b: number): number {
  return a + b;
}
\`\`\`

This implementation improves type safety.
    `.trim();

    const result = extractCodeAndExplanation(markdown);
    expect(result.code).toBe("export function add(a: number, b: number): number {\n  return a + b;\n}");
    expect(result.explanation).toContain("Here is the refactored code:");
    expect(result.explanation).toContain("This implementation improves type safety.");
  });

  it("calls Gemini endpoint with correct payload and headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "```typescript\nconst x = 10;\n```\nExplanation here" }],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await executeAiAction({
      action: "refactor",
      code: "var x = 10;",
      language: "javascript",
      config: {
        provider: "gemini",
        apiKey: "fake-gemini-key",
        model: "gemini-2.5-flash",
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("generativelanguage.googleapis.com"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-goog-api-key": "fake-gemini-key",
        }),
      }),
    );
    expect(result.extractedCode).toBe("const x = 10;");
    expect(result.explanation).toContain("Explanation here");
  });

  it("calls Claude endpoint with dangerous direct browser access and apiKey", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ text: "```typescript\nconst y = 20;\n```" }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await executeAiAction({
      action: "docs",
      code: "const y = 20;",
      language: "typescript",
      config: {
        provider: "claude",
        apiKey: "fake-claude-key",
        model: "claude-3-5-sonnet-20241022",
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-api-key": "fake-claude-key",
          "anthropic-dangerous-direct-browser-access": "true",
        }),
      }),
    );
    expect(result.extractedCode).toBe("const y = 20;");
  });

  it("calls DeepSeek OpenAI-compatible endpoint", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "DeepSeek explanation" } }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await executeAiAction({
      action: "explain",
      code: "SELECT * FROM users;",
      language: "sql",
      config: {
        provider: "deepseek",
        apiKey: "fake-deepseek-key",
        model: "deepseek-chat",
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer fake-deepseek-key",
        }),
      }),
    );
    expect(result.fullText).toBe("DeepSeek explanation");
  });
});
