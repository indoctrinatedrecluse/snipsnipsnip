import { useEffect, useRef } from "react";

type HotkeyHandler = (event: KeyboardEvent) => void;

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

/**
 * Registers global keyboard shortcuts. Combos like "ctrl+s", "shift+tab".
 * Handlers are kept in a ref, so re-renders do not re-subscribe.
 */
export function useHotkeys(handlers: Record<string, HotkeyHandler>): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const combo = (
        (event.ctrlKey || event.metaKey ? "ctrl+" : "") +
        (event.altKey ? "alt+" : "") +
        (event.shiftKey ? "shift+" : "") +
        event.key.toLowerCase()
      );
      const handler = handlersRef.current[combo];
      if (!handler) return;

      // Don't hijack plain typing in inputs/textareas, but do allow
      // Ctrl/Cmd-modified shortcuts (e.g. Ctrl+S to save).
      if (isTypingTarget(event.target) && !(event.ctrlKey || event.metaKey)) {
        return;
      }

      handler(event);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
