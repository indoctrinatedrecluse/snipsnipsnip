import { useCallback, useEffect, useMemo, useState } from "react";

import {
  findMatches,
  replaceAllMatches,
  replaceCurrentMatch,
  type FindMatch,
} from "@/lib/find-replace";

/**
 * State and actions for the editor's find & replace feature. Matches are
 * derived from the current code value + query options, so they stay in sync
 * as the user edits.
 */
export function useFindReplace(value: string) {
  const [open, setOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchIndex, setMatchIndex] = useState(-1);

  const { matches, error: regexError } = useMemo(
    () => findMatches(value, findQuery, useRegex, caseSensitive),
    [value, findQuery, useRegex, caseSensitive],
  );

  // Keep the active index inside the matches array.
  useEffect(() => {
    setMatchIndex((index) => {
      if (matches.length === 0) return -1;
      if (index === -1 || index >= matches.length) return 0;
      return index;
    });
  }, [matches.length]);

  const currentMatch: FindMatch | null =
    matchIndex >= 0 ? (matches[matchIndex] ?? null) : null;

  const openFind = useCallback(() => setOpen(true), []);

  const next = useCallback(() => {
    setMatchIndex((index) => {
      if (matches.length === 0) return -1;
      if (index === -1 || index >= matches.length - 1) return 0;
      return index + 1;
    });
  }, [matches.length]);

  const prev = useCallback(() => {
    setMatchIndex((index) => {
      if (matches.length === 0) return -1;
      if (index <= 0) return matches.length - 1;
      return index - 1;
    });
  }, [matches.length]);

  const replace = useCallback(
    (apply: (nextValue: string) => void) => {
      if (!currentMatch) return;
      const nextValue = replaceCurrentMatch(
        value,
        currentMatch,
        findQuery,
        replaceQuery,
        useRegex,
        caseSensitive,
      );
      apply(nextValue);
      // Leave the index as-is: after the value updates, the next match
      // takes over this slot (or the range clamp resets it).
    },
    [value, currentMatch, findQuery, replaceQuery, useRegex, caseSensitive],
  );

  const replaceAll = useCallback(
    (apply: (nextValue: string) => void) => {
      const nextValue = replaceAllMatches(
        value,
        matches,
        findQuery,
        replaceQuery,
        useRegex,
        caseSensitive,
      );
      if (nextValue !== value) apply(nextValue);
    },
    [value, matches, findQuery, replaceQuery, useRegex, caseSensitive],
  );

  return {
    open,
    setOpen,
    openFind,
    findQuery,
    setFindQuery,
    replaceQuery,
    setReplaceQuery,
    useRegex,
    setUseRegex,
    caseSensitive,
    setCaseSensitive,
    matches,
    matchIndex,
    currentMatch,
    regexError,
    next,
    prev,
    replace,
    replaceAll,
  };
}
