#!/usr/bin/env node

/**
 * SnippetVault CLI Companion (sv)
 */

import fs from "fs";
import path from "path";
import os from "os";

const args = process.argv.slice(2);
const command = (args[0] || "help").toLowerCase();

function getStoragePath() {
  const home = os.homedir();
  return path.join(home, ".snippetvault", "snippets.json");
}

function loadSnippets() {
  const file = getStoragePath();
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      return Array.isArray(data) ? data : data.snippets || [];
    } catch (_) {}
  }
  return [];
}

function saveSnippets(snippets) {
  const file = getStoragePath();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(file, JSON.stringify(snippets, null, 2), "utf8");
}

switch (command) {
  case "ls":
  case "list": {
    const snippets = loadSnippets();
    if (snippets.length === 0) {
      console.log("No snippets found. Use 'sv add' to save snippets.");
      process.exit(0);
    }
    console.log(`SnippetVault (${snippets.length} snippets):`);
    for (const s of snippets) {
      console.log(`• [${(s.language || "text").padEnd(10)}]  ${(s.title || "Untitled").padEnd(30)}  ID: ${s.id}`);
    }
    break;
  }

  case "get": {
    const query = args.slice(1).join(" ").toLowerCase();
    if (!query) {
      console.error("Usage: sv get <title | id>");
      process.exit(1);
    }
    const snippets = loadSnippets();
    const match = snippets.find(
      (s) => s.id === query || (s.title && s.title.toLowerCase().includes(query)),
    );
    if (!match) {
      console.error(`Snippet "${query}" not found.`);
      process.exit(1);
    }
    process.stdout.write(match.code || "");
    break;
  }

  case "search":
  case "find": {
    const query = args.slice(1).join(" ").toLowerCase();
    if (!query) {
      console.error("Usage: sv search <keyword>");
      process.exit(1);
    }
    const snippets = loadSnippets();
    const matches = snippets.filter(
      (s) =>
        (s.title && s.title.toLowerCase().includes(query)) ||
        (s.code && s.code.toLowerCase().includes(query)) ||
        (s.tags && s.tags.some((t) => t.toLowerCase().includes(query))),
    );
    if (matches.length === 0) {
      console.log(`No snippets matching "${query}".`);
      process.exit(0);
    }
    console.log(`Found ${matches.length} snippets:`);
    for (const s of matches) {
      console.log(`• [${s.language || "text"}] ${s.title} (ID: ${s.id})`);
    }
    break;
  }

  case "add":
  case "new": {
    let title = "CLI Snippet";
    let language = "plaintext";
    let codeParts = [];

    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--title" || args[i] === "-t") {
        title = args[i + 1] || title;
        i++;
      } else if (args[i] === "--lang" || args[i] === "-l") {
        language = args[i + 1] || language;
        i++;
      } else {
        codeParts.push(args[i]);
      }
    }

    const code = codeParts.join(" ");
    const snippets = loadSnippets();
    const newSnippet = {
      id: "cli-" + Date.now(),
      title,
      language,
      code,
      tags: ["cli"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    snippets.push(newSnippet);
    saveSnippets(snippets);
    console.log(`✓ Added snippet: "${title}" [${language}]`);
    break;
  }

  case "help":
  case "--help":
  case "-h":
  default:
    console.log(`
SnippetVault CLI (sv) — Terminal Snippet Companion

USAGE:
  sv list                      List all snippets
  sv get <title | id>          Output raw snippet code (pipeable)
  sv search <keyword>          Search snippets by keyword
  sv add [options] <code>      Create a new snippet
  sv help                      Display this help guide

OPTIONS:
  -t, --title <title>          Snippet title
  -l, --lang <lang>            Snippet programming language

EXAMPLES:
  sv list
  sv get "debounce" | pbcopy
  sv add --title "Fetch API" --lang "javascript" "fetch('/api').then(r => r.json());"
`);
    break;
}
