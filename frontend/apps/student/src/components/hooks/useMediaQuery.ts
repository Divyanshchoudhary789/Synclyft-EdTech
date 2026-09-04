"use client";

import { useEffect, useState } from "react";

/**
 * SSR-safe media-query hook. Returns `false` on the server and first paint, then
 * settles to the real value after mount (avoids a hydration mismatch).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
