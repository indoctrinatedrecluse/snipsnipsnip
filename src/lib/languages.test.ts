import { describe, expect, it } from "vitest";

import { highlightCode } from "@/lib/highlight";
import {
  LANGUAGE_OPTIONS,
  detectLanguageFromCode,
  detectLanguageFromFilename,
  getFileExtension,
  getLanguageLabel,
  isSupportedLanguage,
  normalizeLanguageId,
} from "@/lib/languages";

describe("languages", () => {
  it("provides over 50 rich language options across categories", () => {
    expect(LANGUAGE_OPTIONS.length).toBeGreaterThanOrEqual(50);
    for (const opt of LANGUAGE_OPTIONS) {
      expect(opt.id).toBeTruthy();
      expect(opt.label).toBeTruthy();
      expect(opt.extension).toBeTruthy();
    }
  });

  describe("normalizeLanguageId", () => {
    it("normalizes primary identifiers and common aliases", () => {
      expect(normalizeLanguageId("js")).toBe("javascript");
      expect(normalizeLanguageId("ts")).toBe("typescript");
      expect(normalizeLanguageId("py")).toBe("python");
      expect(normalizeLanguageId("py3")).toBe("python");
      expect(normalizeLanguageId("golang")).toBe("go");
      expect(normalizeLanguageId("rs")).toBe("rust");
      expect(normalizeLanguageId("c#")).toBe("csharp");
      expect(normalizeLanguageId("sh")).toBe("bash");
      expect(normalizeLanguageId("zsh")).toBe("bash");
      expect(normalizeLanguageId("ps1")).toBe("powershell");
      expect(normalizeLanguageId("yml")).toBe("yaml");
      expect(normalizeLanguageId("flutter")).toBe("dart");
      expect(normalizeLanguageId("tf")).toBe("terraform");
    });

    it("leaves unknown identifiers unchanged in lower-case", () => {
      expect(normalizeLanguageId("unknown-lang")).toBe("unknown-lang");
    });
  });

  describe("getFileExtension", () => {
    it("returns correct file extension for various languages", () => {
      expect(getFileExtension("typescript")).toBe("ts");
      expect(getFileExtension("python")).toBe("py");
      expect(getFileExtension("rust")).toBe("rs");
      expect(getFileExtension("dart")).toBe("dart");
      expect(getFileExtension("zig")).toBe("zig");
      expect(getFileExtension("solidity")).toBe("sol");
      expect(getFileExtension("terraform")).toBe("tf");
      expect(getFileExtension("unknown")).toBe("txt");
    });
  });

  describe("isSupportedLanguage & getLanguageLabel", () => {
    it("recognizes supported languages and returns human labels", () => {
      expect(isSupportedLanguage("python")).toBe(true);
      expect(isSupportedLanguage("py")).toBe(true);
      expect(isSupportedLanguage("zig")).toBe(true);
      expect(isSupportedLanguage("fake-lang-123")).toBe(false);

      expect(getLanguageLabel("py")).toBe("Python");
      expect(getLanguageLabel("rs")).toBe("Rust");
      expect(getLanguageLabel("dart")).toBe("Dart / Flutter");
    });
  });

  describe("detectLanguageFromFilename", () => {
    it("detects exact filenames", () => {
      expect(detectLanguageFromFilename("Dockerfile")).toBe("dockerfile");
      expect(detectLanguageFromFilename("Makefile")).toBe("makefile");
      expect(detectLanguageFromFilename("CMakeLists.txt")).toBe("cmake");
      expect(detectLanguageFromFilename("docker-compose.yml")).toBe("yaml");
      expect(detectLanguageFromFilename(".gitignore")).toBe("ini");
      expect(detectLanguageFromFilename(".env")).toBe("ini");
      expect(detectLanguageFromFilename(".env.example")).toBe("ini");
      expect(detectLanguageFromFilename("nginx.conf")).toBe("nginx");
    });

    it("detects extensions from relative and absolute paths", () => {
      expect(detectLanguageFromFilename("src/components/App.tsx")).toBe("tsx");
      expect(detectLanguageFromFilename("lib/main.dart")).toBe("dart");
      expect(detectLanguageFromFilename("migrations/001_init.sql")).toBe("sql");
      expect(detectLanguageFromFilename("styles/theme.scss")).toBe("scss");
      expect(detectLanguageFromFilename("server.go")).toBe("go");
      expect(detectLanguageFromFilename("main.zig")).toBe("zig");
      expect(detectLanguageFromFilename("schema.prisma")).toBe("prisma");
      expect(detectLanguageFromFilename("contracts/Token.sol")).toBe("solidity");
    });

    it("returns null for unrecognized filenames or extensions", () => {
      expect(detectLanguageFromFilename("")).toBeNull();
      expect(detectLanguageFromFilename("notes.xyz123")).toBeNull();
    });
  });

  describe("detectLanguageFromCode", () => {
    it("detects language from shebangs", () => {
      expect(detectLanguageFromCode("#!/usr/bin/env python3\nprint('hello')")).toBe("python");
      expect(detectLanguageFromCode("#!/bin/bash\necho 'hello'")).toBe("bash");
      expect(detectLanguageFromCode("#!/usr/bin/env node\nconsole.log(1);")).toBe("javascript");
    });

    it("detects HTML, XML, and JSON", () => {
      expect(detectLanguageFromCode("<!DOCTYPE html><html><body></body></html>")).toBe("html");
      expect(detectLanguageFromCode("<?xml version=\"1.0\"?><root/>")).toBe("xml");
      expect(detectLanguageFromCode('{\n  "version": "1.0.0",\n  "status": "ok"\n}')).toBe("json");
    });

    it("detects SQL queries", () => {
      expect(detectLanguageFromCode("SELECT u.id, u.name FROM users u WHERE u.active = 1;")).toBe("sql");
      expect(detectLanguageFromCode("INSERT INTO logs (message) VALUES ('test');")).toBe("sql");
    });

    it("detects Rust and Go starter code", () => {
      expect(detectLanguageFromCode("fn main() {\n    println!(\"Hello world\");\n}")).toBe("rust");
      expect(detectLanguageFromCode("package main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(1)\n}")).toBe("go");
    });

    it("detects C and C++ starter code", () => {
      expect(detectLanguageFromCode("#include <iostream>\n\nint main() {\n  std::cout << 1;\n}")).toBe("cpp");
      expect(detectLanguageFromCode("#include <stdio.h>\n\nint main() {\n  printf(\"hi\");\n}")).toBe("c");
    });

    it("returns null for generic prose", () => {
      expect(detectLanguageFromCode("Just a regular note or paragraph of text without code keywords.")).toBeNull();
    });
  });

  describe("highlightCode (Shiki integration)", () => {
    it("highlights languages asynchronously producing styled HTML markup", async () => {
      const code = `const greeting = "Hello, world!";`;
      const html = await highlightCode(code, "javascript", "dark");
      expect(html).toContain("<span");
      expect(html).toContain("greeting");
    });

    it("highlights Python snippet with tokens", async () => {
      const pyCode = `def hello():\n    return "world"`;
      const html = await highlightCode(pyCode, "python", "dark");
      expect(html).toContain("<span");
      expect(html).toContain("hello");
    });

    it("safely escapes plain text when language is plaintext", async () => {
      const plain = `<div>Safe & Unformatted</div>`;
      const html = await highlightCode(plain, "plaintext", "dark");
      expect(html).toContain('class="shiki');
      expect(html).not.toContain("<div>");
    });
  });
});
