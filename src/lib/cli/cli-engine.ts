import type { Snippet } from "@/types/snippet";

export interface CliCommandResult {
  stdout?: string;
  stderr?: string;
  exitCode: number;
}

export interface CliParsedArgs {
  command: "list" | "get" | "search" | "add" | "help" | "unknown";
  query?: string;
  title?: string;
  language?: string;
  tags?: string[];
  code?: string;
}

export function parseCliArgs(argv: string[]): CliParsedArgs {
  const args = argv.slice(2);
  if (args.length === 0) {
    return { command: "help" };
  }

  const first = args[0].toLowerCase();

  if (first === "ls" || first === "list") {
    return { command: "list" };
  }

  if (first === "help" || first === "--help" || first === "-h") {
    return { command: "help" };
  }

  if (first === "get") {
    return { command: "get", query: args.slice(1).join(" ") };
  }

  if (first === "search" || first === "find") {
    return { command: "search", query: args.slice(1).join(" ") };
  }

  if (first === "add" || first === "new") {
    let title = "CLI Snippet";
    let language = "plaintext";
    const tags: string[] = [];
    const restArgs: string[] = [];

    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--title" || args[i] === "-t") {
        title = args[i + 1] || title;
        i++;
      } else if (args[i] === "--lang" || args[i] === "-l") {
        language = args[i + 1] || language;
        i++;
      } else if (args[i] === "--tags") {
        const tagStr = args[i + 1] || "";
        tags.push(...tagStr.split(",").map((t) => t.trim()).filter(Boolean));
        i++;
      } else {
        restArgs.push(args[i]);
      }
    }

    return {
      command: "add",
      title,
      language,
      tags,
      code: restArgs.join(" "),
    };
  }

  return { command: "unknown", query: first };
}

export function runCliCommand(
  args: CliParsedArgs,
  snippets: Snippet[],
  onAddSnippet?: (snippet: Partial<Snippet>) => void,
): CliCommandResult {
  switch (args.command) {
    case "help":
      return {
        exitCode: 0,
        stdout: `
SnippetVault CLI (sv) — Developer snippet companion

USAGE:
  sv list                      List all snippets
  sv get <id | title>          Output raw snippet code (pipeable)
  sv search <query>            Search snippets by title, tag, or content
  sv add [options] <code>      Create a new snippet
  sv help                      Show this manual

EXAMPLES:
  sv list
  sv get "debounce" | pbcopy
  sv search "react hook"
  sv add --title "Fetch JSON" --lang "typescript" "const res = await fetch(url);"
        `.trim(),
      };

    case "list": {
      const active = snippets.filter((s) => !s.deletedAt);
      if (active.length === 0) {
        return { exitCode: 0, stdout: "No snippets found in SnippetVault." };
      }

      const rows = active.map(
        (s) =>
          `• [${s.language.padEnd(10)}]  ${s.title.padEnd(30)}  (Tags: ${s.tags.join(", ") || "none"})  ID: ${s.id}`,
      );
      return {
        exitCode: 0,
        stdout: `SnippetVault (${active.length} snippets):\n${rows.join("\n")}`,
      };
    }

    case "get": {
      if (!args.query) {
        return { exitCode: 1, stderr: "Error: Please specify snippet ID or title to get." };
      }
      const q = args.query.toLowerCase();
      const match = snippets.find(
        (s) =>
          !s.deletedAt &&
          (s.id === args.query ||
            s.title.toLowerCase() === q ||
            s.title.toLowerCase().includes(q)),
      );

      if (!match) {
        return { exitCode: 1, stderr: `Error: No snippet matched “${args.query}”.` };
      }
      return { exitCode: 0, stdout: match.code };
    }

    case "search": {
      if (!args.query) {
        return { exitCode: 1, stderr: "Error: Please specify search query." };
      }
      const q = args.query.toLowerCase();
      const matches = snippets.filter(
        (s) =>
          !s.deletedAt &&
          (s.title.toLowerCase().includes(q) ||
            s.code.toLowerCase().includes(q) ||
            s.tags.some((t) => t.toLowerCase().includes(q))),
      );

      if (matches.length === 0) {
        return { exitCode: 0, stdout: `No snippets found matching “${args.query}”.` };
      }

      const results = matches.map(
        (s) => `• [${s.language}] ${s.title} (ID: ${s.id})`,
      );
      return {
        exitCode: 0,
        stdout: `Found ${matches.length} matches:\n${results.join("\n")}`,
      };
    }

    case "add": {
      const newSnippet: Partial<Snippet> = {
        title: args.title || "CLI Snippet",
        language: args.language || "plaintext",
        tags: args.tags || [],
        code: args.code || "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onAddSnippet?.(newSnippet);
      return {
        exitCode: 0,
        stdout: `✓ Created snippet: “${newSnippet.title}” [${newSnippet.language}]`,
      };
    }

    default:
      return {
        exitCode: 1,
        stderr: `Unknown command “${args.query}”. Run 'sv help' for usage instructions.`,
      };
  }
}
