"use client";

import { X } from "@phosphor-icons/react";

/**
 * Closes the announcement bar for the rest of the session.
 *
 * The bar is driven by an attribute on the html element rather than React
 * state, so this only has to clear it: no context, no prop drilling into the
 * header, and nothing to disagree about at hydration.
 *
 * What gets stored is the session id, so the next course to be announced is not
 * suppressed by someone having closed the last one.
 */
export function DismissAnnouncement({ sessionId }: { sessionId: string }) {
  function dismiss() {
    document.documentElement.removeAttribute("data-announcement");
    try {
      localStorage.setItem("pulse8-announcement", sessionId);
    } catch {
      // Storage blocked. It closes for this page view, which is enough.
    }
  }

  return (
    <button
      type="button"
      onClick={dismiss}
      aria-label="Dismiss announcement"
      aria-controls="announcement"
      className="absolute inset-y-0 right-2 grid w-9 place-items-center text-white/60 transition-colors duration-200 hover:text-white md:right-4"
    >
      <X size={14} weight="bold" />
    </button>
  );
}
