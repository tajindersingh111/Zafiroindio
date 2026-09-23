"use client";

/**
 * ProductViewTracker
 * ------------------
 * Invisible component. Drop it on any product page.
 * Tracks active viewing time using Page Visibility API —
 * only counts time when the tab is actually focused.
 * Saves session to localStorage on unmount/tab-hide/navigation.
 */

import { useEffect, useRef } from "react";
import { recordViewSession } from "@/lib/recommendations";

interface Props {
  slug: string;
}

export default function ProductViewTracker({ slug }: Props) {
  const startRef = useRef<number>(Date.now());
  const activeRef = useRef<number>(0); // accumulated active seconds
  const isActiveRef = useRef<boolean>(true);

  useEffect(() => {
    startRef.current = Date.now();
    isActiveRef.current = !document.hidden;

    /* Page Visibility API — pause counting when tab is hidden */
    const handleVisibility = () => {
      if (document.hidden) {
        // Tab hidden → accumulate time spent so far
        if (isActiveRef.current) {
          activeRef.current += (Date.now() - startRef.current) / 1000;
        }
        isActiveRef.current = false;
      } else {
        // Tab visible again → restart timer
        startRef.current = Date.now();
        isActiveRef.current = true;
      }
    };

    /* Save before navigating away */
    const handleBeforeUnload = () => {
      const extra = isActiveRef.current
        ? (Date.now() - startRef.current) / 1000
        : 0;
      recordViewSession(slug, activeRef.current + extra);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    /* Cleanup = React navigation (SPA route change) */
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);

      const extra = isActiveRef.current
        ? (Date.now() - startRef.current) / 1000
        : 0;
      recordViewSession(slug, activeRef.current + extra);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Invisible — renders nothing
  return null;
}
