export interface LanguageOption {
  id: string;
  label: string;
  extension: string;
  aliases?: string[];
  category?: "web" | "systems" | "backend" | "data" | "config" | "mobile" | "scripting";
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: "plaintext", label: "Plain Text", extension: "txt" },
  { id: "javascript", label: "JavaScript", extension: "js", aliases: ["js", "mjs", "cjs", "node"], category: "web" },
  { id: "typescript", label: "TypeScript", extension: "ts", aliases: ["ts", "mts", "cts"], category: "web" },
  { id: "jsx", label: "JSX", extension: "jsx", category: "web" },
  { id: "tsx", label: "TSX", extension: "tsx", category: "web" },
  { id: "python", label: "Python", extension: "py", aliases: ["py", "py3", "python3"], category: "scripting" },
  { id: "html", label: "HTML", extension: "html", aliases: ["htm"], category: "web" },
  { id: "css", label: "CSS", extension: "css", category: "web" },
  { id: "scss", label: "SCSS", extension: "scss", aliases: ["sass"], category: "web" },
  { id: "less", label: "Less", extension: "less", category: "web" },
  { id: "json", label: "JSON", extension: "json", category: "data" },
  { id: "markdown", label: "Markdown", extension: "md", aliases: ["md", "mkd"], category: "web" },
  { id: "mdx", label: "MDX", extension: "mdx", category: "web" },
  { id: "bash", label: "Bash / Shell", extension: "sh", aliases: ["sh", "shell", "zsh"], category: "scripting" },
  { id: "powershell", label: "PowerShell", extension: "ps1", aliases: ["ps1", "posh", "pwsh"], category: "scripting" },
  { id: "sql", label: "SQL", extension: "sql", aliases: ["mysql", "pgsql", "postgres", "sqlite"], category: "data" },
  { id: "yaml", label: "YAML", extension: "yaml", aliases: ["yml"], category: "config" },
  { id: "toml", label: "TOML", extension: "toml", category: "config" },
  { id: "xml", label: "XML", extension: "xml", aliases: ["svg", "plist"], category: "data" },
  { id: "ini", label: "INI / Config", extension: "ini", aliases: ["cfg", "properties", "dotenv", "env"], category: "config" },
  { id: "c", label: "C", extension: "c", aliases: ["h"], category: "systems" },
  { id: "cpp", label: "C++", extension: "cpp", aliases: ["cc", "cxx", "hpp", "hh"], category: "systems" },
  { id: "csharp", label: "C#", extension: "cs", aliases: ["cs", "c#", "dotnet"], category: "backend" },
  { id: "java", label: "Java", extension: "java", category: "backend" },
  { id: "kotlin", label: "Kotlin", extension: "kt", aliases: ["kt", "kts"], category: "mobile" },
  { id: "swift", label: "Swift", extension: "swift", category: "mobile" },
  { id: "dart", label: "Dart / Flutter", extension: "dart", aliases: ["flutter"], category: "mobile" },
  { id: "go", label: "Go", extension: "go", aliases: ["golang"], category: "backend" },
  { id: "rust", label: "Rust", extension: "rs", aliases: ["rs"], category: "systems" },
  { id: "php", label: "PHP", extension: "php", category: "backend" },
  { id: "ruby", label: "Ruby", extension: "rb", aliases: ["rb", "rails"], category: "backend" },
  { id: "perl", label: "Perl", extension: "pl", aliases: ["pm"], category: "scripting" },
  { id: "lua", label: "Lua", extension: "lua", category: "scripting" },
  { id: "zig", label: "Zig", extension: "zig", category: "systems" },
  { id: "elixir", label: "Elixir", extension: "ex", aliases: ["exs"], category: "backend" },
  { id: "erlang", label: "Erlang", extension: "erl", aliases: ["hrl"], category: "backend" },
  { id: "haskell", label: "Haskell", extension: "hs", category: "backend" },
  { id: "clojure", label: "Clojure", extension: "clj", aliases: ["cljs", "cljc"], category: "backend" },
  { id: "scala", label: "Scala", extension: "scala", category: "backend" },
  { id: "ocaml", label: "OCaml", extension: "ml", aliases: ["mli"], category: "systems" },
  { id: "fsharp", label: "F#", extension: "fs", aliases: ["fsi", "fsx"], category: "backend" },
  { id: "julia", label: "Julia", extension: "jl", category: "data" },
  { id: "r", label: "R", extension: "r", aliases: ["rscript"], category: "data" },
  { id: "graphql", label: "GraphQL", extension: "graphql", aliases: ["gql"], category: "web" },
  { id: "dockerfile", label: "Dockerfile", extension: "dockerfile", aliases: ["docker"], category: "config" },
  { id: "nginx", label: "Nginx Config", extension: "conf", aliases: ["nginx.conf"], category: "config" },
  { id: "terraform", label: "Terraform / HCL", extension: "tf", aliases: ["hcl", "tfvars"], category: "config" },
  { id: "proto", label: "Protocol Buffers", extension: "proto", aliases: ["protobuf"], category: "data" },
  { id: "prisma", label: "Prisma", extension: "prisma", category: "data" },
  { id: "solidity", label: "Solidity", extension: "sol", aliases: ["sol"], category: "backend" },
  { id: "astro", label: "Astro", extension: "astro", category: "web" },
  { id: "svelte", label: "Svelte", extension: "svelte", category: "web" },
  { id: "vue", label: "Vue", extension: "vue", category: "web" },
  { id: "cmake", label: "CMake", extension: "cmake", aliases: ["cmakelists.txt"], category: "config" },
  { id: "makefile", label: "Makefile", extension: "mk", aliases: ["make", "makefile"], category: "config" },
];

const ALIAS_MAP: Record<string, string> = {};
const EXT_MAP: Record<string, string> = {};

for (const lang of LANGUAGE_OPTIONS) {
  ALIAS_MAP[lang.id.toLowerCase()] = lang.id;
  ALIAS_MAP[lang.extension.toLowerCase()] = lang.id;
  EXT_MAP[lang.extension.toLowerCase()] = lang.id;
  if (lang.aliases) {
    for (const alias of lang.aliases) {
      ALIAS_MAP[alias.toLowerCase()] = lang.id;
      EXT_MAP[alias.toLowerCase()] = lang.id;
    }
  }
}

// Special exact filename mappings
const EXACT_FILENAME_MAP: Record<string, string> = {
  dockerfile: "dockerfile",
  makefile: "makefile",
  cmakelists: "cmake",
  "cmakelists.txt": "cmake",
  "docker-compose.yml": "yaml",
  "docker-compose.yaml": "yaml",
  ".gitignore": "ini",
  ".env": "ini",
  ".env.example": "ini",
  "nginx.conf": "nginx",
};

export function normalizeLanguageId(idOrAlias: string): string {
  const lower = idOrAlias.trim().toLowerCase();
  return ALIAS_MAP[lower] ?? lower;
}

export function getLanguageLabel(id: string): string {
  const normalized = normalizeLanguageId(id);
  return LANGUAGE_OPTIONS.find((l) => l.id === normalized)?.label ?? id;
}

export function isSupportedLanguage(id: string): boolean {
  const normalized = normalizeLanguageId(id);
  return LANGUAGE_OPTIONS.some((l) => l.id === normalized);
}

export function getFileExtension(languageId: string): string {
  const normalized = normalizeLanguageId(languageId);
  const opt = LANGUAGE_OPTIONS.find((l) => l.id === normalized);
  return opt ? opt.extension : "txt";
}

/**
 * Detects the language from a filename (e.g. `App.tsx` -> `tsx`, `Dockerfile` -> `dockerfile`).
 */
export function detectLanguageFromFilename(filename: string): string | null {
  const trimmed = filename.trim();
  if (!trimmed) return null;

  const base = trimmed.split(/[\\/]/).pop()?.toLowerCase() ?? "";
  if (EXACT_FILENAME_MAP[base]) {
    return EXACT_FILENAME_MAP[base];
  }

  const dotIndex = base.lastIndexOf(".");
  if (dotIndex > 0) {
    const ext = base.slice(dotIndex + 1);
    if (EXT_MAP[ext]) return EXT_MAP[ext];
  }

  return null;
}

/**
 * Heuristically inspects code contents (shebang, starter keywords) to guess language.
 */
export function detectLanguageFromCode(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return null;

  // Shebang check
  if (trimmed.startsWith("#!")) {
    const firstLine = trimmed.split("\n")[0].toLowerCase();
    if (firstLine.includes("python")) return "python";
    if (firstLine.includes("bash") || firstLine.includes("sh") || firstLine.includes("zsh")) return "bash";
    if (firstLine.includes("node")) return "javascript";
    if (firstLine.includes("perl")) return "perl";
    if (firstLine.includes("ruby")) return "ruby";
  }

  // XML / HTML
  if (trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html")) return "html";
  if (trimmed.startsWith("<?xml")) return "xml";

  // JSON
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      // Not JSON
    }
  }

  // PHP
  if (trimmed.startsWith("<?php")) return "php";

  // SQL
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\b/i.test(trimmed)) {
    return "sql";
  }

  // Rust
  if (/\b(fn main|impl|pub struct|pub enum|use std::)\b/.test(trimmed)) {
    return "rust";
  }

  // Go
  if (/^package [a-z0-9_]+/m.test(trimmed) && /\bfunc [A-Za-z0-9_]+\(/.test(trimmed)) {
    return "go";
  }

  // C / C++
  if (/#include <[a-z0-9_.]+>/i.test(trimmed)) {
    if (trimmed.includes("std::") || trimmed.includes("cout") || trimmed.includes("class ")) return "cpp";
    return "c";
  }

  return null;
}
