/**
 * Dynamic snippet placeholder & templating engine.
 *
 * Supports:
 * - Built-in tokens: {{date}}, {{time}}, {{datetime}}, {{uuid}}, {{clipboard}}
 * - Custom variables: {{variableName}} and {{variableName:defaultValue}}
 * - VS Code tabstop syntax: ${1:defaultValue} and ${variableName:defaultValue}
 */

export interface TemplateVariable {
  raw: string;
  name: string;
  defaultValue?: string;
  isAuto: boolean;
}

const AUTO_VARIABLES = new Set(["date", "time", "datetime", "uuid", "clipboard"]);

/** Regex matching {{var}} or {{var:default}} */
const MUSTACHE_REGEX = /\{\{([a-zA-Z0-9_-]+)(?::([^}]+))?\}\}/g;

/** Regex matching ${1:default} or ${var:default} */
const TABSTOP_REGEX = /\$\{(?:(\d+)|([a-zA-Z0-9_-]+))(?::([^}]+))?\}/g;

export function hasPlaceholders(code: string): boolean {
  MUSTACHE_REGEX.lastIndex = 0;
  TABSTOP_REGEX.lastIndex = 0;
  return MUSTACHE_REGEX.test(code) || TABSTOP_REGEX.test(code);
}

export function extractPlaceholders(code: string): TemplateVariable[] {
  const seen = new Map<string, TemplateVariable>();

  MUSTACHE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MUSTACHE_REGEX.exec(code)) !== null) {
    const raw = match[0];
    const name = match[1];
    const defaultValue = match[2];
    const isAuto = AUTO_VARIABLES.has(name.toLowerCase());

    if (!seen.has(name)) {
      seen.set(name, {
        raw,
        name,
        defaultValue,
        isAuto,
      });
    }
  }

  TABSTOP_REGEX.lastIndex = 0;
  while ((match = TABSTOP_REGEX.exec(code)) !== null) {
    const raw = match[0];
    const name = match[1] ?? match[2];
    const defaultValue = match[3];
    const isAuto = AUTO_VARIABLES.has(name.toLowerCase());

    if (!seen.has(name)) {
      seen.set(name, {
        raw,
        name,
        defaultValue,
        isAuto,
      });
    }
  }

  return Array.from(seen.values());
}

export function getAutoValue(name: string, clipboardText = ""): string {
  const lower = name.toLowerCase();
  const now = new Date();
  switch (lower) {
    case "date":
      return now.toISOString().slice(0, 10);
    case "time":
      return now.toTimeString().slice(0, 5);
    case "datetime":
      return now.toISOString();
    case "uuid":
      return typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    case "clipboard":
      return clipboardText;
    default:
      return "";
  }
}

export function resolveTemplate(
  code: string,
  values: Record<string, string>,
): string {
  let resolved = code.replace(MUSTACHE_REGEX, (raw, name, defaultValue) => {
    if (name in values && values[name] !== undefined) {
      return values[name];
    }
    if (AUTO_VARIABLES.has(name.toLowerCase())) {
      return getAutoValue(name);
    }
    return defaultValue ?? raw;
  });

  resolved = resolved.replace(
    TABSTOP_REGEX,
    (raw, numName, textName, defaultValue) => {
      const name = numName ?? textName;
      if (name in values && values[name] !== undefined) {
        return values[name];
      }
      if (AUTO_VARIABLES.has(name.toLowerCase())) {
        return getAutoValue(name);
      }
      return defaultValue ?? raw;
    },
  );

  return resolved;
}
