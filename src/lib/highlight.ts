import {
  createHighlighter,
  type Highlighter,
  type LanguageRegistration,
} from "shiki";

import type { AppTheme } from "@/types/app";
import { isSupportedLanguage, normalizeLanguageId } from "@/lib/languages";

// Themes (fine-grained bundles keep the initial bundle small).
import githubDark from "shiki/themes/github-dark.mjs";
import githubLight from "shiki/themes/github-light.mjs";

const THEMES = {
  light: "github-light",
  dark: "github-dark",
} as const;

/**
 * Language grammars are dynamically imported on first use, so each grammar
 * becomes its own lazy chunk and the initial bundle stays small.
 */
const languageLoaders: Record<
  string,
  () => Promise<LanguageRegistration | LanguageRegistration[]>
> = {
  bash: () => import("shiki/langs/bash.mjs").then((m) => m.default),
  c: () => import("shiki/langs/c.mjs").then((m) => m.default),
  cpp: () => import("shiki/langs/cpp.mjs").then((m) => m.default),
  csharp: () => import("shiki/langs/csharp.mjs").then((m) => m.default),
  css: () => import("shiki/langs/css.mjs").then((m) => m.default),
  dockerfile: () =>
    import("shiki/langs/dockerfile.mjs").then((m) => m.default),
  go: () => import("shiki/langs/go.mjs").then((m) => m.default),
  graphql: () => import("shiki/langs/graphql.mjs").then((m) => m.default),
  html: () => import("shiki/langs/html.mjs").then((m) => m.default),
  java: () => import("shiki/langs/java.mjs").then((m) => m.default),
  javascript: () =>
    import("shiki/langs/javascript.mjs").then((m) => m.default),
  json: () => import("shiki/langs/json.mjs").then((m) => m.default),
  jsx: () => import("shiki/langs/jsx.mjs").then((m) => m.default),
  kotlin: () => import("shiki/langs/kotlin.mjs").then((m) => m.default),
  markdown: () => import("shiki/langs/markdown.mjs").then((m) => m.default),
  mdx: () => import("shiki/langs/mdx.mjs").then((m) => m.default),
  php: () => import("shiki/langs/php.mjs").then((m) => m.default),
  powershell: () =>
    import("shiki/langs/powershell.mjs").then((m) => m.default),
  python: () => import("shiki/langs/python.mjs").then((m) => m.default),
  ruby: () => import("shiki/langs/ruby.mjs").then((m) => m.default),
  rust: () => import("shiki/langs/rust.mjs").then((m) => m.default),
  sql: () => import("shiki/langs/sql.mjs").then((m) => m.default),
  svelte: () => import("shiki/langs/svelte.mjs").then((m) => m.default),
  swift: () => import("shiki/langs/swift.mjs").then((m) => m.default),
  toml: () => import("shiki/langs/toml.mjs").then((m) => m.default),
  tsx: () => import("shiki/langs/tsx.mjs").then((m) => m.default),
  typescript: () =>
    import("shiki/langs/typescript.mjs").then((m) => m.default),
  vue: () => import("shiki/langs/vue.mjs").then((m) => m.default),
  xml: () => import("shiki/langs/xml.mjs").then((m) => m.default),
  yaml: () => import("shiki/langs/yaml.mjs").then((m) => m.default),

  // Extended wide-variety languages
  dart: () => import("shiki/langs/dart.mjs").then((m) => m.default),
  lua: () => import("shiki/langs/lua.mjs").then((m) => m.default),
  zig: () => import("shiki/langs/zig.mjs").then((m) => m.default),
  elixir: () => import("shiki/langs/elixir.mjs").then((m) => m.default),
  erlang: () => import("shiki/langs/erlang.mjs").then((m) => m.default),
  haskell: () => import("shiki/langs/haskell.mjs").then((m) => m.default),
  clojure: () => import("shiki/langs/clojure.mjs").then((m) => m.default),
  scala: () => import("shiki/langs/scala.mjs").then((m) => m.default),
  ocaml: () => import("shiki/langs/ocaml.mjs").then((m) => m.default),
  fsharp: () => import("shiki/langs/fsharp.mjs").then((m) => m.default),
  julia: () => import("shiki/langs/julia.mjs").then((m) => m.default),
  r: () => import("shiki/langs/r.mjs").then((m) => m.default),
  perl: () => import("shiki/langs/perl.mjs").then((m) => m.default),
  scss: () => import("shiki/langs/scss.mjs").then((m) => m.default),
  less: () => import("shiki/langs/less.mjs").then((m) => m.default),
  ini: () => import("shiki/langs/ini.mjs").then((m) => m.default),
  proto: () => import("shiki/langs/proto.mjs").then((m) => m.default),
  prisma: () => import("shiki/langs/prisma.mjs").then((m) => m.default),
  solidity: () => import("shiki/langs/solidity.mjs").then((m) => m.default),
  astro: () => import("shiki/langs/astro.mjs").then((m) => m.default),
  nginx: () => import("shiki/langs/nginx.mjs").then((m) => m.default),
  terraform: () =>
    import("shiki/langs/terraform.mjs").then((m) => m.default),
  cmake: () => import("shiki/langs/cmake.mjs").then((m) => m.default),
  makefile: () => import("shiki/langs/makefile.mjs").then((m) => m.default),
};

const loadedLanguages = new Set<string>();
const languagePromises = new Map<string, Promise<void>>();

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [githubLight, githubDark],
      langs: [],
    });
  }
  return highlighterPromise;
}

function ensureLanguage(
  highlighter: Highlighter,
  rawLang: string,
): Promise<void> {
  const language = normalizeLanguageId(rawLang);
  if (language === "plaintext" || loadedLanguages.has(language)) {
    return Promise.resolve();
  }
  const loader = languageLoaders[language];
  if (!loader) return Promise.resolve();

  let pending = languagePromises.get(language);
  if (!pending) {
    pending = loader()
      .then(async (registration) => {
        await highlighter.loadLanguage(registration);
        loadedLanguages.add(language);
      })
      .finally(() => {
        languagePromises.delete(language);
      });
    languagePromises.set(language, pending);
  }
  return pending;
}

/**
 * Highlights a snippet of code with Shiki.
 *
 * If the language grammar has not been downloaded yet, this triggers the
 * download and falls back to plain escaped text so rendering is never
 * blocked; once downloaded, future renders highlight synchronously.
 */
export async function highlightCode(
  code: string,
  language: string,
  theme: AppTheme,
): Promise<string> {
  const highlighter = await getHighlighter();
  const normalized = normalizeLanguageId(language);
  const lang =
    isSupportedLanguage(normalized) && languageLoaders[normalized]
      ? normalized
      : "plaintext";

  await ensureLanguage(highlighter, lang);

  return highlighter.codeToHtml(code, {
    lang,
    theme: THEMES[theme],
  });
}


/**
 * Pre-warms the highlighter by initializing Shiki and preloading common
 * languages, so the first visible highlight is instant.
 */
export function prewarmHighlighter(): void {
  void getHighlighter().then((highlighter) => {
    void ensureLanguage(highlighter, "typescript");
    void ensureLanguage(highlighter, "javascript");
    void ensureLanguage(highlighter, "python");
    void ensureLanguage(highlighter, "rust");
  });
}
