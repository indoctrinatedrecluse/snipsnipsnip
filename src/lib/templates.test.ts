import { describe, expect, it } from "vitest";
import {
  extractPlaceholders,
  hasPlaceholders,
  resolveTemplate,
} from "./templates";

describe("templates engine", () => {
  it("detects when a snippet contains placeholders", () => {
    expect(hasPlaceholders("const a = 1;")).toBe(false);
    expect(hasPlaceholders("const {{name}} = 1;")).toBe(true);
    expect(hasPlaceholders("const ${1:foo} = 1;")).toBe(true);
  });

  it("extracts unique custom and auto variables", () => {
    const code = `
      // Created on {{date}} by {{author:Anonymous}}
      function {{funcName}}(input: {{type:string}}) {
        return input;
      }
      // Repeat {{funcName}}
    `;
    const vars = extractPlaceholders(code);
    expect(vars.map((v) => v.name)).toEqual(["date", "author", "funcName", "type"]);

    const dateVar = vars.find((v) => v.name === "date");
    expect(dateVar?.isAuto).toBe(true);

    const authorVar = vars.find((v) => v.name === "author");
    expect(authorVar?.defaultValue).toBe("Anonymous");
    expect(authorVar?.isAuto).toBe(false);
  });

  it("resolves template with user provided values", () => {
    const code = "Hello {{name:World}}! Today is {{date}}.";
    const result = resolveTemplate(code, { name: "Alice" });
    expect(result).toContain("Hello Alice!");
    expect(result).not.toContain("{{name}}");
    expect(result).not.toContain("{{date}}");
  });

  it("falls back to default value if variable not provided", () => {
    const code = "SELECT * FROM {{table:users}} WHERE id = ${1:1};";
    const result = resolveTemplate(code, {});
    expect(result).toBe("SELECT * FROM users WHERE id = 1;");
  });
});
