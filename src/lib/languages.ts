export interface LanguageOption {
  id: string;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: "plaintext", label: "Plain Text" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "jsx", label: "JSX" },
  { id: "tsx", label: "TSX" },
  { id: "python", label: "Python" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "json", label: "JSON" },
  { id: "markdown", label: "Markdown" },
  { id: "bash", label: "Bash / Shell" },
  { id: "powershell", label: "PowerShell" },
  { id: "sql", label: "SQL" },
  { id: "yaml", label: "YAML" },
  { id: "java", label: "Java" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
  { id: "csharp", label: "C#" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "php", label: "PHP" },
  { id: "ruby", label: "Ruby" },
  { id: "swift", label: "Swift" },
  { id: "kotlin", label: "Kotlin" },
  { id: "dockerfile", label: "Dockerfile" },
  { id: "vue", label: "Vue" },
  { id: "svelte", label: "Svelte" },
  { id: "xml", label: "XML" },
  { id: "toml", label: "TOML" },
  { id: "graphql", label: "GraphQL" },
];

export function getLanguageLabel(id: string): string {
  return LANGUAGE_OPTIONS.find((l) => l.id === id)?.label ?? id;
}

export function isSupportedLanguage(id: string): boolean {
  return LANGUAGE_OPTIONS.some((l) => l.id === id);
}
