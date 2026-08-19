import { useEffect, useState } from "react";

import { highlightCode } from "@/lib/highlight";
import type { AppTheme } from "@/types/app";

/**
 * Asynchronously highlights `code` and returns the resulting HTML.
 * Re-highlighting is debounced by `delay` ms so keystrokes never block.
 */
export function useHighlight(
  code: string,
  language: string,
  theme: AppTheme,
  delay = 120,
): string {
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void highlightCode(code, language, theme)
        .then((result) => {
          if (!cancelled) setHtml(result);
        })
        .catch(() => {
          if (!cancelled) setHtml("");
        });
    }, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [code, language, theme, delay]);

  return html;
}
