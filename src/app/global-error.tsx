"use client";

/** Replaces the root layout, so it brings its own document and inline styles (no global CSS here). */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#0f1420", color: "#f1f3f7", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <title>Something went wrong · Gamb Admin</title>
        <main style={{ padding: 16 }}>
          <h1 style={{ fontSize: 20 }}>Something went wrong</h1>
          <p style={{ color: "#9aa4b5", fontSize: 14 }}>Nothing was changed. Try again in a moment.</p>
          <button onClick={() => retry()} style={{ padding: "8px 14px", borderRadius: 8, border: 0, background: "#00c37a", color: "#07130d", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
