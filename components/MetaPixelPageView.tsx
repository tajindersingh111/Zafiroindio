"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Sends a Meta Pixel PageView on client-side route changes. The first page view is sent by the
 * pixel base code in app/layout.tsx, so the initial render is skipped here to avoid counting it twice.
 */
export default function MetaPixelPageView() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
    if (fbq) fbq("track", "PageView");
  }, [pathname]);
  return null;
}
