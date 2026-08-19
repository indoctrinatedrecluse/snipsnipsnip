import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
} from "react";

import { useHighlight } from "@/hooks/useHighlight";
import type { FindMatch } from "@/lib/find-replace";
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
const LINE_HEIGHT = 24; // leading-6

const MONO_FONT =
  "14px ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

function measureCharWidth(): number {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return 8.4;
    context.font = MONO_FONT;
    return context.measureText("0").width;
  } catch {
    return 8.4;
  }
}

/**
 * A lightweight syntax-highlighted editor: a transparent <textarea> is layered
 * over a <pre> containing Shiki-highlighted HTML, with a line-number gutter
 * and optional find-match highlights. Typing stays native and fast;
 * highlighting stays visually in sync via debounced re-highlighting.
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const matchLayerRef = useRef<HTMLDivElement>(null);

  const charWidth = useMemo(measureCharWidth, []);

  // Shiki renders exactly one <span class="line"> per textarea line when the
  // code is highlighted as-is, so the gutter count always matches.
  const lineCount = value.split("\n").length;

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

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Tab") {
        event.preventDefault();
        const textarea = event.currentTarget;
        const { selectionStart, selectionEnd } = textarea;
        const next =
          value.slice(0, selectionStart) + "  " + value.slice(selectionEnd);
        onChange(next);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd =
            selectionStart + 2;
        });
      }
    },
    [value, onChange],
  );

  // Scroll the current match into view and select it.
  useEffect(() => {
    if (currentMatchIndex === undefined || currentMatchIndex < 0) return;
    const match = matches?.[currentMatchIndex];
    const textarea = textareaRef.current;
    if (!match || !textarea) return;

    const targetTop =
      PAD_Y +
      match.line * LINE_HEIGHT +
      LINE_HEIGHT / 2 -
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
  }, [currentMatchIndex, matches, charWidth]);


  return (
    <div className="relative size-full overflow-hidden font-mono text-sm leading-6">
      <div
        ref={gutterRef}
        aria-hidden="true"
        className="absolute inset-y-0 left-0 z-[6] w-14 overflow-hidden border-r border-border/60 bg-muted/30 pt-4"
      >
        {Array.from({ length: lineCount }, (_, index) => (
          <div
            key={index}
            className="pr-2.5 text-right text-xs leading-6 text-muted-foreground/50"
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
                top: PAD_Y + match.line * LINE_HEIGHT,
                width: Math.max(match.len, 1) * charWidth,
                height: LINE_HEIGHT,
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
  );
}
