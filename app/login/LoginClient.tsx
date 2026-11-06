"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

/** Only allow internal destinations, so ?next= can never bounce a shopper off-site. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/account";
  return raw;
}

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { customer, loading, refresh } = useAuth();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);

  // Already signed in: nothing to do here.
  useEffect(() => {
    if (!loading && customer) router.replace(next);
  }, [loading, customer, next, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeInput.current?.focus();
  }, [step]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy || cooldown > 0) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "We could not send the code. Please try again.");
      setStep("code");
      setCooldown(Number(data.cooldownSeconds) || 60);
      setNotice(data.devNotice || `We sent a 6-digit code to WhatsApp on +91 ${phone}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "That code was not accepted.");
      await refresh();
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setCode("");
      codeInput.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  const phoneValid = /^[6-9]\d{9}$/.test(phone);

  return (
    <main className="blockprint-bg">
      <div className="container section" style={{ maxWidth: 460 }}>
        <div className="breadcrumb" style={{ marginBottom: 16 }}>
          <Link href="/">Home</Link> / <span>Sign in</span>
        </div>

        <div className="lux-card" style={{ padding: "32px 28px" }}>
          <h1 className="serif" style={{ fontSize: 30, marginBottom: 6 }}>
            {step === "phone" ? "Sign in" : "Enter your code"}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 24, lineHeight: 1.6 }}>
            {step === "phone"
              ? "We'll send a one-time code to your WhatsApp. No password to remember."
              : `Sent to WhatsApp on +91 ${phone}.`}
          </p>

          {step === "phone" ? (
            <form onSubmit={sendCode} noValidate>
              <label htmlFor="phone" style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 8 }}>
                Mobile number
              </label>
              <div style={{ display: "flex", alignItems: "stretch", gap: 8, marginBottom: 18 }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 14px",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    background: "var(--cream)",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  +91
                </span>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  autoFocus
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  style={{ flex: 1, padding: "13px 14px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 15, letterSpacing: ".05em" }}
                />
              </div>

              <button type="submit" className="btn gold full" disabled={busy || !phoneValid} style={{ padding: "15px 22px", fontSize: 12.5 }}>
                {busy ? (
                  <>
                    <Loader2 size={14} className="spin" /> Sending…
                  </>
                ) : (
                  "Send code on WhatsApp"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} noValidate>
              <label htmlFor="code" style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 8 }}>
                6-digit code
              </label>
              <input
                id="code"
                ref={codeInput}
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  fontSize: 22,
                  letterSpacing: ".4em",
                  textAlign: "center",
                  marginBottom: 18,
                }}
              />

              <button type="submit" className="btn gold full" disabled={busy || code.length !== 6} style={{ padding: "15px 22px", fontSize: 12.5 }}>
                {busy ? (
                  <>
                    <Loader2 size={14} className="spin" /> Verifying…
                  </>
                ) : (
                  "Verify and continue"
                )}
              </button>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setCode("");
                    setError("");
                    setNotice("");
                  }}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--muted)", fontSize: 12.5, display: "flex", alignItems: "center", gap: 5 }}
                >
                  <ArrowLeft size={13} /> Change number
                </button>
                <button
                  type="button"
                  onClick={() => sendCode()}
                  disabled={cooldown > 0 || busy}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: cooldown > 0 ? "default" : "pointer",
                    color: cooldown > 0 ? "var(--muted)" : "var(--gold-dark)",
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {error && (
            <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 16, lineHeight: 1.5 }}>
              {error}
            </p>
          )}
          {notice && !error && (
            <p style={{ color: "var(--success)", fontSize: 12.5, marginTop: 16, lineHeight: 1.5 }}>{notice}</p>
          )}

          <p style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "var(--muted)", fontSize: 11.5, marginTop: 24, lineHeight: 1.6 }}>
            <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Your number is used only to sign you in and to send order updates. Never share your code with anyone — we will
              never ask for it.
            </span>
          </p>
        </div>

        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 12.5, marginTop: 20 }}>
          Just want to track an order?{" "}
          <Link href="/track" style={{ color: "var(--gold-dark)", fontWeight: 600 }}>
            Track without signing in
          </Link>
        </p>
      </div>
    </main>
  );
}
