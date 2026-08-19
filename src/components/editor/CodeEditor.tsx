import { useCallback, useRef, type KeyboardEvent } from "react";

import { useHighlight } from "@/hooks/useHighlight";
import type { AppTheme } from "@/types/app";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  theme: AppTheme;
  placeholder?: string;
}

/**
 * A lightweight syntax-highlighted editor: a transparent <textarea> is layered
 * over a <pre> containing Shiki-highlighted HTML, with a line-number gutter.
 * Typing stays native and fast; highlighting stays visually in sync via
 * debounced re-highlighting.
 */
export function CodeEditor({
  value,
  onChange,
  language,
  theme,
  placeholder,
}: CodeEditorProps) {
  const html = useHighlight(value, language, theme);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  // Shiki renders exactly one <span class="line"> per textarea line when the
  // code is highlighted as-is, so the gutter count always matches.
  const lineCount = value.split("\n").length;

  const syncScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const pre = preRef.current;
    const gutter = gutterRef.current;
    if (!textarea || !pre) return;
    pre.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
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

  return (
    <div className="relative size-full overflow-hidden font-mono text-sm leading-6">
      <div
        ref={gutterRef}
        aria-hidden="true"
        className="absolute inset-y-0 left-0 z-10 w-14 overflow-hidden border-r border-border/60 bg-muted/30 pt-4"
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
        className="absolute inset-0 size-full resize-none overflow-auto whitespace-pre bg-transparent py-4 pr-4 pl-14 text-transparent caret-foreground outline-none [tab-size:2]"
        style={{ WebkitTextFillColor: "transparent" }}
      />
    </div>
  );
}
