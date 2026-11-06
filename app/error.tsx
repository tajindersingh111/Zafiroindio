"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home } from "lucide-react";

/**
 * Shown when a page throws at runtime. Without this file a shopper sees Next.js's bare error
 * screen with no way back into the shop.
 *
 * `error.message` is only the real message for client errors; server errors arrive as a generic
 * string plus `digest`, which is the key to find it in the server logs — so the digest is shown.
 */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <main className="blockprint-bg">
      <div className="container section" style={{ maxWidth: 560, textAlign: "center" }}>
        <div className="lux-card" style={{ padding: "48px 28px" }}>
          <span className="eyebrow">Something went wrong</span>
          <h1 className="serif" style={{ fontSize: "clamp(28px, 4.5vw, 38px)", margin: "10px 0 0" }}>
            This page didn&apos;t load
          </h1>
          <div className="ornament">
            <i />
          </div>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, marginBottom: 26 }}>
            Sorry — a problem on our side stopped this page from loading. Nothing you were doing has been lost, and
            any order you have already placed is safe.
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn gold" onClick={() => retry()} style={{ fontSize: 11.5, padding: "13px 22px" }}>
              <RefreshCw size={14} /> Try again
            </button>
            <Link className="btn" href="/" style={{ fontSize: 11.5, padding: "13px 22px" }}>
              <Home size={14} /> Back to home
            </Link>
          </div>

          {error.digest && (
            <p style={{ color: "var(--muted)", fontSize: 11, marginTop: 26 }}>
              If you contact us, quote reference <code>{error.digest}</code>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
