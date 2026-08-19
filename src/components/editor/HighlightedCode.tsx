import { useHighlight } from "@/hooks/useHighlight";
import { cn } from "@/lib/utils";
import type { AppTheme } from "@/types/app";

interface HighlightedCodeProps {
  code: string;
  language: string;
  theme: AppTheme;
  className?: string;
}

/**
 * Read-only Shiki-highlighted code block. Uses the same highlighting engine
 * as the editor, so edit and preview always look identical.
 */
export function HighlightedCode({
  code,
  language,
  theme,
  className,
}: HighlightedCodeProps) {
  const html = useHighlight(code, language, theme);
  return (
    <pre
      className={cn(
        "overflow-auto whitespace-pre font-mono text-sm leading-6 [tab-size:2]",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
