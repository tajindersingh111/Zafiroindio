"use client";

import React, { useState, useEffect } from "react";
import { X, CheckCircle2, Gift, Sparkles } from "lucide-react";
import { useStore } from "@/components/StoreProvider";

export default function WelcomeDiscountModal() {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const { applyCoupon } = useStore();

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("zafiro_lead_dismissed");
      const captured = localStorage.getItem("zafiro_lead_captured");

      if (!dismissed && !captured) {
        // Trigger modal after 2.5 seconds delay for natural user experience
        const timer = setTimeout(() => {
          setOpen(true);
        }, 2500);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const handleClose = () => {
    setOpen(false);
    try {
      localStorage.setItem("zafiro_lead_dismissed", "true");
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanEmail = email.trim();
    const cleanPhone = phone.trim().replace(/\D/g, "");

    if (!fullName.trim()) {
      setErrorMsg("Please enter your Full Name.");
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMsg("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);

    try {
      // Auto-apply WELCOME10 coupon in store state
      applyCoupon("WELCOME10");

      // Post lead info to customer admin collection asynchronously
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0] || "Guest";
      const lastName = nameParts.slice(1).join(" ") || "";

      fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: cleanEmail,
          phone: cleanPhone,
          type: "retail",
          status: "active"
        })
      }).catch(() => {});

      localStorage.setItem("zafiro_lead_captured", "true");
      setSubmitted(true);
    } catch {
      setErrorMsg("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText("WELCOME10");
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(28, 25, 23, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          maxWidth: 460,
          width: "100%",
          padding: "36px 32px",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.22)",
          position: "relative",
          textAlign: "center",
          border: "1px solid #e7e1d6",
          fontFamily: "var(--font-sans, system-ui, sans-serif)"
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close modal"
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            background: "none",
            border: 0,
            color: "#666",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "color 0.2s ease"
          }}
        >
          <X size={22} />
        </button>

        {/* Brand Logo & Sub-tagline matching reference */}
        <div style={{ marginBottom: 18 }}>
          <img
            src="/zafiro-logo-dark.png"
            alt="Zafiro Indio"
            style={{ height: 46, width: "auto", margin: "0 auto 4px", objectFit: "contain", display: "block" }}
          />
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "2px",
              color: "#666",
              textTransform: "uppercase",
              marginTop: 4
            }}
          >
            MY HOME | LUXURY BEDDING
          </div>
        </div>

        {!submitted ? (
          <>
            {/* Title & Subtitle */}
            <h2
              className="serif"
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: "#1c1917",
                margin: "0 0 10px 0",
                lineHeight: 1.25
              }}
            >
              Save 10% On Your First Order
            </h2>
            <p
              style={{
                fontSize: 13.5,
                color: "#666",
                margin: "0 0 24px 0",
                lineHeight: 1.55,
                padding: "0 8px"
              }}
            >
              Sign up now to unlock code <strong style={{ color: "#1c1917" }}>WELCOME10</strong> for your first luxury upgrade.
            </p>

            {errorMsg && (
              <div
                style={{
                  background: "#fdf2f0",
                  border: "1px solid #e8c5be",
                  borderRadius: 6,
                  padding: "10px 14px",
                  marginBottom: 18,
                  fontSize: 12.5,
                  color: "#c83232",
                  fontWeight: 500
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Form Inputs */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Full Name Input */}
              <input
                type="text"
                required
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid #d4cdbf",
                  fontSize: 14,
                  outline: "none",
                  color: "#1c1917",
                  boxSizing: "border-box",
                  backgroundColor: "#faf8f5"
                }}
              />

              {/* Email Address Input */}
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid #d4cdbf",
                  fontSize: 14,
                  outline: "none",
                  color: "#1c1917",
                  boxSizing: "border-box",
                  backgroundColor: "#faf8f5"
                }}
              />

              {/* Phone Input with Indian Flag Badge Prefix */}
              <div
                style={{
                  display: "flex",
                  borderRadius: 8,
                  border: "1px solid #d4cdbf",
                  overflow: "hidden",
                  backgroundColor: "#faf8f5"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0 14px",
                    background: "#f0eae1",
                    borderRight: "1px solid #d4cdbf",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#1c1917",
                    userSelect: "none"
                  }}
                >
                  <span style={{ fontSize: 16 }}>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="Mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    border: 0,
                    fontSize: 14,
                    outline: "none",
                    color: "#1c1917",
                    backgroundColor: "transparent"
                  }}
                />
              </div>

              {/* Primary Claim Discount Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 6,
                  width: "100%",
                  background: "#006b54", // Luxury teal/green matching reference
                  color: "#ffffff",
                  border: 0,
                  padding: "14px",
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#005241")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#006b54")}
              >
                {loading ? "CLAIMING DISCOUNT…" : "Claim discount"}
              </button>
            </form>

            {/* Secondary Dismiss Link */}
            <button
              type="button"
              onClick={handleClose}
              style={{
                background: "none",
                border: 0,
                color: "#666",
                fontSize: 13,
                fontWeight: 600,
                marginTop: 16,
                cursor: "pointer",
                textDecoration: "underline"
              }}
            >
              No, thanks
            </button>

            {/* Disclaimer Footer */}
            <p
              style={{
                fontSize: 11,
                color: "#888",
                marginTop: 18,
                marginBottom: 0,
                lineHeight: 1.45
              }}
            >
              You are signing up to receive communication via email and can unsubscribe at any time.
            </p>
          </>
        ) : (
          /* Success State Display */
          <div style={{ padding: "10px 0 6px" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "#eef7ee",
                border: "1px solid #c3e6c3",
                color: "#2e7d32",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <h3 className="serif" style={{ fontSize: 24, margin: "0 0 8px", color: "#1c1917" }}>
              🎉 Discount Code Unlocked!
            </h3>
            <p style={{ fontSize: 13.5, color: "#555", marginBottom: 20 }}>
              Use coupon code <strong style={{ color: "#a67c37" }}>WELCOME10</strong> at checkout to enjoy 10% off your purchase.
            </p>

            {/* Coupon Code Display Box */}
            <div
              style={{
                background: "#faf6f0",
                border: "1.5px dashed #a67c37",
                borderRadius: 8,
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, color: "#1c1917" }}>
                WELCOME10
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                style={{
                  background: "#a67c37",
                  color: "#ffffff",
                  border: 0,
                  padding: "8px 14px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  borderRadius: 4,
                  cursor: "pointer"
                }}
              >
                {copied ? "COPIED!" : "COPY CODE"}
              </button>
            </div>

            <button
              type="button"
              onClick={handleClose}
              style={{
                width: "100%",
                background: "#1c1917",
                color: "#ffffff",
                border: 0,
                padding: "12px",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "1px",
                textTransform: "uppercase",
                borderRadius: 8,
                cursor: "pointer"
              }}
            >
              CONTINUE SHOPPING
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
