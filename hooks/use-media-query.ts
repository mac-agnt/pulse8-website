"use client";

import { useEffect, useState } from "react";

/**
 * Matches a CSS media query from JavaScript.
 *
 * Returns false on the server and on the first client render, so anything that
 * depends on it must degrade gracefully rather than shift layout. Use CSS for
 * layout that differs by breakpoint; use this for behaviour that does.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);

    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);

  return matches;
}
