import { describe, expect, it } from "vitest";
import { expandSnippetTemplate, matchExpansionPrefix } from "./expander";
import type { Snippet } from "@/types/snippet";

describe("expander", () => {
  it("expands dynamic datetime tokens and custom variables", () => {
    const fixedDate = new Date(2026, 9, 17, 14, 30, 45); // Oct 17, 2026 14:30:45
    const template = "Created on {{date}} at {{time}} ({{year}}). ID: {{uuid}}. Author: {{author:Anonymous}}.";

    const expanded = expandSnippetTemplate(template, {
      now: fixedDate,
      variables: { author: "Developer" },
    });

    expect(expanded).toContain("Created on 2026-10-17 at 14:30:45 (2026).");
    expect(expanded).toContain("Author: Developer.");
  });

  it("replaces clipboard token with provided clipboard text", () => {
    const template = "const copied = '{{clipboard}}';";
    const expanded = expandSnippetTemplate(template, {
      clipboardText: "user-token-xyz",
    });
    expect(expanded).toBe("const copied = 'user-token-xyz';");
  });

  it("matches typed buffer ending with active snippet shortcut prefix", () => {
    const mockSnippets: Snippet[] = [
      {
        id: "1",
        title: "Console Log",
        description: "",
        code: "console.log('{{date}}');",
        language: "javascript",
        tags: [],
        createdAt: 0,
        updatedAt: 0,
        isFavorite: false,
        shortcutPrefix: ";clg",
        shortcutEnabled: true,
      },
      {
        id: "2",
        title: "React Component",
        description: "",
        code: "export function Comp() { return <div/>; }",
        language: "typescript",
        tags: [],
        createdAt: 0,
        updatedAt: 0,
        isFavorite: false,
        shortcutPrefix: ";comp",
        shortcutEnabled: true,
      },
      {
        id: "3",
        title: "Disabled shortcut",
        description: "",
        code: "foo",
        language: "plaintext",
        tags: [],
        createdAt: 0,
        updatedAt: 0,
        isFavorite: false,
        shortcutPrefix: ";disabled",
        shortcutEnabled: false,
      },
    ];

    const match = matchExpansionPrefix(mockSnippets, "hello world ;clg");
    expect(match).not.toBeNull();
    expect(match?.snippet.id).toBe("1");
    expect(match?.prefix).toBe(";clg");
    expect(match?.expanded).toContain("console.log(");

    // Disabled prefix should not match
    const disabledMatch = matchExpansionPrefix(mockSnippets, "some text ;disabled");
    expect(disabledMatch).toBeNull();
  });
});
