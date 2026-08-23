import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { GoToLineDialog } from "@/components/editor/GoToLineDialog";
import { useHighlight } from "@/hooks/useHighlight";
import {
  computeLineStarts,
  duplicateLines,
  goToLine,
  handleAutoPair,
  handleBackspace,
  handleEnter,
  indentSelection,
  insertText,
  isAutoPairChar,
  lineIndexAt,
  moveLines,
  toggleComment,
  type EditPosition,
} from "@/lib/editor-commands";
import type { FindMatch } from "@/lib/find-replace";
import { useSettingsStore } from "@/stores/settings-store";
import type { AppTheme } from "@/types/app";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  theme: AppTheme;
  placeholder?: string;
  /** Find & replace matches to highlight in the editor. */
  matches?: FindMatch[];
  /** Index into `matches` for the current match (stronger highlight). */
  currentMatchIndex?: number;
}

// Keep these in sync with the layout classes used below.
const PAD_X = 56; // pl-14
const PAD_Y = 16; // py-4
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;
const DEFAULT_FONT_SIZE = 14;

const MONO_FONT_STACK =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

function measureCharWidth(fontSize: number): number {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return fontSize * 0.6;
    context.font = `${fontSize}px ${MONO_FONT_STACK}`;
    return context.measureText("0").width;
  } catch {
    return fontSize * 0.6;
  }
}

/**
 * A lightweight syntax-highlighted editor: a transparent <textarea> is layered
 * over a <pre> containing Shiki-highlighted HTML, with a line-number gutter,
 * find-match highlights, auto-pairing, auto-indent, and common editing
 * shortcuts. Typing stays native and fast; highlighting stays visually in
 * sync via debounced re-highlighting.
 */
export function CodeEditor({
  value,
  onChange,
  language,
  theme,
  placeholder,
  matches,
  currentMatchIndex,
}: CodeEditorProps) {
  const html = useHighlight(value, language, theme);
  const fontSize = useSettingsStore((store) => store.editorFontSize);
  const setEditorFontSize = useSettingsStore(
    (store) => store.setEditorFontSize,
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const matchLayerRef = useRef<HTMLDivElement>(null);

  const [goToOpen, setGoToOpen] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  const lineHeight = Math.round(fontSize * 1.5);
  const charWidth = useMemo(() => measureCharWidth(fontSize), [fontSize]);

  // Shiki renders exactly one <span class="line"> per textarea line when the
  // code is highlighted as-is, so the gutter count always matches.
  const lineCount = value.split("\n").length;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  const syncScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const pre = preRef.current;
    const gutter = gutterRef.current;
    const matchLayer = matchLayerRef.current;
    if (!textarea || !pre) return;
    const transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
    pre.style.transform = transform;
    if (matchLayer) matchLayer.style.transform = transform;
    if (gutter) {
      gutter.style.transform = `translateY(${-textarea.scrollTop}px)`;
    }
  }, []);

  const updateCursor = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const lineStarts = computeLineStarts(value);
    const position = textarea.selectionStart;
    const line = lineIndexAt(lineStarts, position) + 1;
    const col = position - lineStarts[line - 1] + 1;
    setCursor({ line, col });
  }, [value]);

  /** Applies a pure editing result and restores the caret. */
  const applyEdit = useCallback(
    (result: EditPosition) => {
      onChange(result.value);
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.selectionStart = result.selectionStart;
        textarea.selectionEnd = result.selectionEnd;
        updateCursor();
      });
    },
    [onChange, updateCursor],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = event.currentTarget;
      const edit: EditPosition = {
        value,
        selectionStart: textarea.selectionStart,
        selectionEnd: textarea.selectionEnd,
      };
      const isComposing = event.nativeEvent.isComposing;

      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase();
        if (key === "d" && event.shiftKey) {
          event.preventDefault();
          applyEdit(duplicateLines(edit));
          return;
        }
        if (key === "/") {
          event.preventDefault();
          applyEdit(toggleComment(edit, language));
          return;
        }
        if (key === "g") {
          event.preventDefault();
          setGoToOpen(true);
          return;
        }
        if (key === "=" || key === "+") {
          event.preventDefault();
          setEditorFontSize(Math.min(MAX_FONT_SIZE, fontSize + 1));
          return;
        }
        if (key === "-" || key === "_") {
          event.preventDefault();
          setEditorFontSize(Math.max(MIN_FONT_SIZE, fontSize - 1));
          return;
        }
        if (key === "0") {
          event.preventDefault();
          setEditorFontSize(DEFAULT_FONT_SIZE);
          return;
        }
        return;
      }

      if (event.altKey) {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          applyEdit(moveLines(edit, -1));
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          applyEdit(moveLines(edit, 1));
        }
        return;
      }

      if (event.shiftKey) {
        if (event.key === "Tab") {
          event.preventDefault();
          applyEdit(indentSelection(edit, -1));
        }
        return;
      }

      if (isComposing) return;

      switch (event.key) {
        case "Tab":
          event.preventDefault();
          applyEdit(
            edit.selectionStart === edit.selectionEnd
              ? insertText(edit, "  ")
              : indentSelection(edit, 1),
          );
          return;
        case "Enter":
          event.preventDefault();
          applyEdit(handleEnter(edit));
          return;
        case "Backspace": {
          const result = handleBackspace(edit);
          if (result !== edit) {
            event.preventDefault();
            applyEdit(result);
          }
          return;
        }
        default:
          if (event.key.length === 1 && isAutoPairChar(event.key)) {
            event.preventDefault();
            applyEdit(handleAutoPair(edit, event.key));
          }
      }
    },
    [value, applyEdit, language, fontSize, setEditorFontSize],
  );

  // Scroll the current find-match into view and select it.
  useEffect(() => {
    if (currentMatchIndex === undefined || currentMatchIndex < 0) return;
    const match = matches?.[currentMatchIndex];
    const textarea = textareaRef.current;
    if (!match || !textarea) return;

    const targetTop =
      PAD_Y +
      match.line * lineHeight +
      lineHeight / 2 -
      textarea.clientHeight / 2;
    const targetLeft =
      PAD_X + match.col * charWidth + (match.len * charWidth) / 2 -
      textarea.clientWidth / 2;

    if (textarea.scrollTop !== targetTop) {
      textarea.scrollTop = Math.max(0, targetTop);
    }
    if (textarea.scrollLeft !== targetLeft) {
      textarea.scrollLeft = Math.max(0, targetLeft);
    }
    textarea.setSelectionRange(match.start, match.end);
  }, [currentMatchIndex, matches, charWidth, lineHeight]);

  const handleGoToLine = useCallback(
    (lineNumber: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const result = goToLine(
        {
          value,
          selectionStart: textarea.selectionStart,
          selectionEnd: textarea.selectionEnd,
        },
        lineNumber,
      );
      applyEdit(result);
      requestAnimationFrame(() => {
        const targetTop =
          PAD_Y + (lineNumber - 1) * lineHeight - textarea.clientHeight / 2;
        textarea.scrollTop = Math.max(0, targetTop);
      });
    },
    [value, applyEdit, lineHeight],
  );

  return (
    <div
      className="flex size-full flex-col overflow-hidden font-mono"
      style={{ fontSize, lineHeight: `${lineHeight}px` }}
    >
      <div className="relative min-h-0 flex-1">
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="absolute inset-y-0 left-0 z-[6] w-14 overflow-hidden border-r border-border/60 bg-muted/30 pt-4"
        >
          {Array.from({ length: lineCount }, (_, index) => (
            <div
              key={index}
              className="pr-2.5 text-right text-xs text-muted-foreground/50"
            >
              {index + 1}
            </div>
          ))}
        </div>
        <pre
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 m-0 overflow-visible whitespace-pre py-4 pr-4 pl-14 [tab-size:2]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {matches && matches.length > 0 && (
          <div
            ref={matchLayerRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[5]"
          >
            {matches.map((match, index) => (
              <div
                key={index}
                className={
                  index === currentMatchIndex
                    ? "absolute rounded-[3px] bg-amber-400/40 outline-2 outline-amber-400/70"
                    : "absolute rounded-[3px] bg-amber-300/25"
                }
                style={{
                  left: PAD_X + match.col * charWidth,
                  top: PAD_Y + match.line * lineHeight,
                  width: Math.max(match.len, 1) * charWidth,
                  height: lineHeight,
                }}
              />
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          onSelect={updateCursor}
          onClick={updateCursor}
          onKeyUp={updateCursor}
          placeholder={placeholder}
          aria-label="Code editor"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          wrap="off"
          className="absolute inset-0 z-[6] size-full resize-none overflow-auto whitespace-pre bg-transparent py-4 pr-4 pl-14 text-transparent caret-foreground outline-none [tab-size:2]"
          style={{ WebkitTextFillColor: "transparent" }}
        />
      </div>

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
