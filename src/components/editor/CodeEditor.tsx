import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { basicSetup, EditorView } from "codemirror";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { defaultKeymap, historyKeymap, indentWithTab } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";

import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { rust } from "@codemirror/lang-rust";
import { cpp } from "@codemirror/lang-cpp";
import { sql } from "@codemirror/lang-sql";
import { yaml } from "@codemirror/lang-yaml";

import { languages } from "@codemirror/language-data";
import { LanguageDescription } from "@codemirror/language";

import { GoToLineDialog } from "@/components/editor/GoToLineDialog";
import type { FindMatch } from "@/lib/find-replace";
import { useSettingsStore } from "@/stores/settings-store";
import type { AppTheme } from "@/types/app";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  theme: AppTheme;
  placeholder?: string;
  matches?: FindMatch[];
  currentMatchIndex?: number;
}

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;

const MONO_FONT_STACK =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

function getFastLanguageExtension(language: string): Extension | null {
  switch (language.toLowerCase()) {
    case "javascript":
    case "jsx":
      return javascript({ jsx: true });
    case "typescript":
    case "tsx":
      return javascript({ typescript: true, jsx: true });
    case "python":
      return python();
    case "html":
    case "xml":
      return html();
    case "css":
      return css();
    case "json":
      return json();
    case "markdown":
      return markdown();
    case "rust":
      return rust();
    case "c":
    case "cpp":
      return cpp();
    case "sql":
      return sql();
    case "yaml":
      return yaml();
    case "plaintext":
    case "text":
    case "txt":
      return [];
    default:
      return null;
  }
}

const CM_ALIASES: Record<string, string> = {
  proto: "protobuf",
  protobuf: "protobuf",
  bash: "shell",
  sh: "shell",
  zsh: "shell",
  powershell: "powershell",
  solidity: "cpp",
  prisma: "graphql",
  astro: "html",
  svelte: "html",
};

function getCodeMirrorDescription(language: string): LanguageDescription | null {
  const normalized = CM_ALIASES[language.toLowerCase()] ?? language;
  return LanguageDescription.matchLanguageName(languages, normalized, true);
}

function getInitialLanguageExtension(language: string): Extension {
  const fast = getFastLanguageExtension(language);
  if (fast !== null) return fast;
  const desc = getCodeMirrorDescription(language);
  return desc?.support ?? [];
}

const baseTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "transparent",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: MONO_FONT_STACK,
  },
  ".cm-content": {
    fontFamily: MONO_FONT_STACK,
    caretColor: "currentColor",
    padding: "16px 0",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "1px solid var(--border, #e5e7eb)",
    color: "var(--muted-foreground, #9ca3af)",
    fontFamily: MONO_FONT_STACK,
    paddingRight: "8px",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(128, 128, 128, 0.15)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(128, 128, 128, 0.07)",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "currentColor",
  },
  "&.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "rgba(59, 130, 246, 0.25)",
  },
});

function getFontSizeExtension(fontSize: number) {
  return EditorView.theme({
    "&": {
      fontSize: `${fontSize}px`,
    },
    ".cm-line": {
      lineHeight: "1.5",
    },
  });
}

export function CodeEditor({
  value,
  onChange,
  language,
  theme,
  matches,
  currentMatchIndex,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const fontSize = useSettingsStore((store) => store.editorFontSize);
  const setEditorFontSize = useSettingsStore(
    (store) => store.setEditorFontSize,
  );

  const [goToOpen, setGoToOpen] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  const lineCount = value.split("\n").length;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  const langCompartment = useRef(new Compartment()).current;
  const themeCompartment = useRef(new Compartment()).current;
  const fontCompartment = useRef(new Compartment()).current;

  // Initialize CodeMirror 6 view once
  useEffect(() => {
    if (!containerRef.current) return;

    const startState = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        baseTheme,
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          "aria-label": "Code editor",
          role: "textbox",
          spellcheck: "false",
        }),
        langCompartment.of(getInitialLanguageExtension(language)),
        themeCompartment.of(theme === "dark" ? oneDark : []),
        fontCompartment.of(getFontSizeExtension(fontSize)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const next = update.state.doc.toString();
            onChangeRef.current(next);
          }
          if (update.selectionSet || update.docChanged) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            setCursor({ line: line.number, col: pos - line.from + 1 });
          }
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      const currentSelection = view.state.selection;
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
        selection: {
          anchor: Math.min(currentSelection.main.anchor, value.length),
          head: Math.min(currentSelection.main.head, value.length),
        },
      });
    }
  }, [value]);

  // Sync language changes (fast synchronous core grammars + lazy dynamic loading from language-data)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const fast = getFastLanguageExtension(language);
    if (fast !== null) {
      view.dispatch({
        effects: langCompartment.reconfigure(fast),
      });
      return;
    }

    const desc = getCodeMirrorDescription(language);
    if (!desc) {
      view.dispatch({
        effects: langCompartment.reconfigure([]),
      });
      return;
    }

    if (desc.support) {
      view.dispatch({
        effects: langCompartment.reconfigure(desc.support),
      });
      return;
    }

    let cancelled = false;
    desc
      .load()
      .then((support) => {
        if (!cancelled && viewRef.current === view) {
          view.dispatch({
            effects: langCompartment.reconfigure(support),
          });
        }
      })
      .catch((err) => {
        console.warn(`Failed to dynamically load grammar for ${language}:`, err);
      });

    return () => {
      cancelled = true;
    };
  }, [language, langCompartment]);

  // Sync theme changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.reconfigure(theme === "dark" ? oneDark : []),
    });
  }, [theme, themeCompartment]);

  // Sync font size changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: fontCompartment.reconfigure(getFontSizeExtension(fontSize)),
    });
  }, [fontSize, fontCompartment]);

  // Jump to active find & replace match
  useEffect(() => {
    const view = viewRef.current;
    if (!view || matches === undefined || currentMatchIndex === undefined) return;
    const match = matches[currentMatchIndex];
    if (match) {
      view.dispatch({
        selection: { anchor: match.start, head: match.end },
        scrollIntoView: true,
      });
    }
  }, [matches, currentMatchIndex]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase();
        if (key === "g") {
          event.preventDefault();
          setGoToOpen(true);
        } else if (key === "=" || key === "+") {
          event.preventDefault();
          setEditorFontSize(Math.min(MAX_FONT_SIZE, fontSize + 1));
        } else if (key === "-") {
          event.preventDefault();
          setEditorFontSize(Math.max(MIN_FONT_SIZE, fontSize - 1));
        }
      }
    },
    [fontSize, setEditorFontSize],
  );

  const handleGoToLine = useCallback((targetLine: number) => {
    const view = viewRef.current;
    if (!view) return;
    const doc = view.state.doc;
    const clampedLine = Math.min(Math.max(1, targetLine), doc.lines);
    const lineInfo = doc.line(clampedLine);
    view.dispatch({
      selection: { anchor: lineInfo.from },
      scrollIntoView: true,
    });
    view.focus();
  }, []);

  return (
    <div
      className="relative flex size-full flex-col overflow-hidden bg-background"
      onKeyDown={handleKeyDown}
    >
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden"
      />

      <div className="flex shrink-0 items-center justify-between gap-2 border-t bg-muted/30 px-3 py-1 font-sans text-xs text-muted-foreground">
        <span>
          Ln {cursor.line}, Col {cursor.col}
        </span>
        <span className="tabular-nums">
          {lineCount} lines · {wordCount} words · {charCount} chars
        </span>
      </div>

      <GoToLineDialog
        open={goToOpen}
        onOpenChange={setGoToOpen}
        lineCount={lineCount}
        onGo={handleGoToLine}
      />
    </div>
  );
}
