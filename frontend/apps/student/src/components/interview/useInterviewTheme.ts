"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type InterviewTheme = "dark" | "light";
const KEY = "synclyft:interview-theme";

interface Ctx {
  theme: InterviewTheme;
  setTheme: (t: InterviewTheme) => void;
  toggle: () => void;
  ready: boolean;
}

export const InterviewThemeContext = createContext<Ctx | null>(null);

/**
 * State for the interview-workspace theme (dark / light), scoped to the
 * interview only and persisted per browser. Use `<InterviewThemeContext.Provider>`
 * (wired up in `InterviewShell`) so the editor and every panel share one value.
 */
export function useInterviewThemeState(): Ctx {
  const [theme, setThemeRaw] = useState<InterviewTheme>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "light" || saved === "dark") setThemeRaw(saved);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const setTheme = useCallback((next: InterviewTheme) => {
    setThemeRaw(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => setThemeRaw((cur) => {
    const next = cur === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    return next;
  }), []);

  return { theme, setTheme, toggle, ready };
}

/** Read the current interview theme from context (falls back to dark). */
export function useInterviewTheme(): Ctx {
  return (
    useContext(InterviewThemeContext) ?? {
      theme: "dark",
      setTheme: () => {},
      toggle: () => {},
      ready: true,
    }
  );
}
