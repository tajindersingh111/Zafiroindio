"use client"; // Error boundaries must be Client Components

/**
 * Last resort: the root layout itself failed, so app/error.tsx never mounted.
 *
 * This file replaces the whole document, which means global styles, fonts and the header are all
 * gone — every style here has to be inline. Keep it plain and dependency-free; anything clever is
 * one more thing that can fail at the exact moment nothing else works.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#f6f1e9",
          color: "#1c1917",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <title>Something went wrong | Zafiro Indio</title>
        <div style={{ maxWidth: 440, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 12px", letterSpacing: "-0.01em" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "#57534e", margin: "0 0 28px" }}>
            Sorry — the site hit an unexpected problem. Any order you have already placed is safe.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                padding: "13px 24px",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#1c1917",
                background: "#c5a028",
                border: 0,
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {/*
              A plain <a>, not next/link, on purpose: this renders when the root layout itself
              failed, so client-side routing cannot be relied on. A full page load is what is
              wanted here.
            */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: "13px 24px",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#1c1917",
                background: "transparent",
                border: "1px solid #e8e2d8",
                borderRadius: 4,
                textDecoration: "none",
              }}
            >
              Back to home
            </a>
          </div>
          {error.digest && (
            <p style={{ fontSize: 11, color: "#78716c", marginTop: 28 }}>
              If you contact us, quote reference <code>{error.digest}</code>
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
