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
 * over a <pre> containing Shiki-highlighted HTML. Typing stays native and fast;
 * highlighting stays visually in sync via debounced re-highlighting.
 */
export function CodeEditor({
  value,
  onChange,
  language,
  theme,
  placeholder,
}: CodeEditorProps) {
  // Shiki needs a trailing newline to render the final line; the textarea
  // always has one implicit cursor line, so keep the two layers in lockstep.
  const codeForHighlight = value.endsWith("\n") ? value : value + "\n";
  const html = useHighlight(codeForHighlight, language, theme);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const syncScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const pre = preRef.current;
    if (!textarea || !pre) return;
    pre.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
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
      <pre
        ref={preRef}
        aria-hidden="true"
        className="absolute inset-0 m-0 overflow-visible whitespace-pre [tab-size:2]"
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
        className="absolute inset-0 size-full resize-none overflow-auto whitespace-pre bg-transparent p-0 text-transparent caret-foreground outline-none [tab-size:2]"
        style={{ WebkitTextFillColor: "transparent" }}
      />
    </div>
  );
}
