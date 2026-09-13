"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Login failed. Please try again.");
          return;
        }
        router.push(from);
        router.refresh();
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return (
    <div className="min-h-screen bg-indigo-deep flex items-center justify-center px-4" style={{background: "linear-gradient(135deg, #161f39 0%, #212f52 100%)"}}>
      {/* Paper texture overlay */}
      <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f4ecd8' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"}} />

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-paper/10 border border-paper/20 mb-4">
            <svg className="w-8 h-8 text-turmeric" viewBox="0 0 32 32" fill="none">
              <path d="M16 3 L29 10 L29 22 L16 29 L3 22 L3 10 Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M16 8 L24 12 L24 20 L16 24 L8 20 L8 12 Z" stroke="currentColor" strokeWidth="1" fill="currentColor" fillOpacity="0.15"/>
              <circle cx="16" cy="16" r="3" fill="currentColor"/>
            </svg>
          </div>
          <h1 className="font-display text-3xl text-paper tracking-tight">
            Zafiro <span className="italic text-turmeric">Admin</span>
          </h1>
          <p className="text-paper/50 text-sm mt-1">Store management dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-cream-card border border-stone/30 rounded-sm shadow-2xl shadow-black/40 p-8">
          <h2 className="font-display text-xl text-indigo mb-6">Sign in to continue</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-ink-soft uppercase tracking-wide mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@zafiroindio.com"
                className="w-full px-4 py-3 border border-stone/50 rounded-sm bg-paper text-ink placeholder-stone focus:outline-none focus:ring-2 focus:ring-madder/50 focus:border-madder text-sm transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-ink-soft uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-stone/50 rounded-sm bg-paper text-ink placeholder-stone focus:outline-none focus:ring-2 focus:ring-madder/50 focus:border-madder text-sm transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-madder/10 border border-madder/30 rounded-sm px-4 py-3 text-sm text-madder">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-madder hover:bg-madder-deep disabled:opacity-60 text-cream-card font-medium py-3 px-4 rounded-sm text-sm tracking-wide uppercase transition-colors flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-stone mt-6 font-mono">
            Default: admin@zafiroindio.com / Zafiro#Admin2026!
          </p>
        </div>

        <p className="text-center text-xs text-paper/30 mt-6">
          © 2026 Zafiro Indio. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-indigo-deep flex items-center justify-center text-paper" style={{background: "#161f39"}}>
        <p className="text-sm font-semibold uppercase tracking-widest text-paper/40">Loading Zafiro Admin…</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
