"use client";

import { useState } from "react";
import { ShieldCheck, Truck, Sparkles, Send, CheckCircle2, Building2, User, Mail, Phone, Layers, Award } from "lucide-react";

const CATEGORIES = [
  "Bedsheets & Sheet Sets",
  "Pillow & Cushion Covers",
  "Duvet & Quilt Covers",
  "Towels & Bath Linen",
  "Table Linen & Runners",
  "Custom Handblock Printing",
  "Hotel & Resort Supplies",
  "Corporate & Wedding Gifting",
  "Other Wholesale Textiles"
];

const QUANTITY_PRESETS = ["25 - 50 Pcs", "50 - 100 Pcs", "100 - 500 Pcs", "500+ Pcs"];

export default function BulkOrderPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [quantity, setQuantity] = useState("50 - 100 Pcs");
  const [businessName, setBusinessName] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !phone.trim()) {
      setErrorMsg("Please provide your name and phone number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/bulk-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          category,
          quantity,
          businessName,
          notes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setErrorMsg(data.error || "Failed to submit bulk order inquiry.");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ background: "#faf8f5", minHeight: "100vh", paddingBottom: 80 }}>
      {/* Hero Header Banner */}
      <section
        style={{
          background: "linear-gradient(135deg, #12192c 0%, #1c2744 100%)",
          color: "#ffffff",
          padding: "60px 20px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div className="container" style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <span
            style={{
              background: "rgba(197, 160, 40, 0.2)",
              border: "1px solid rgba(197, 160, 40, 0.5)",
              color: "#c5a028",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "1.5px",
              padding: "5px 14px",
              borderRadius: 20,
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 16
            }}
          >
            <Sparkles size={14} /> Factory Direct Wholesale &amp; Custom Orders
          </span>

          <h1
            className="serif"
            style={{
              fontSize: "clamp(28px, 5vw, 44px)",
              fontWeight: 600,
              margin: "0 0 16px",
              color: "#ffffff",
              letterSpacing: "-0.5px",
              lineHeight: 1.2
            }}
          >
            Bulk Orders &amp; Custom Handblock Manufacturing
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255, 255, 255, 0.8)", margin: "0 auto 32px", maxWidth: 680, lineHeight: 1.6 }}>
            Partner directly with Zafiro Indio for luxury 100% percale cotton bedsheets, authentic Jaipur handblock prints, and tailored linen supplies for Hotels, Resellers, and Corporate Gifting.
          </p>

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(4px)",
              borderRadius: 12,
              padding: "20px 24px",
              maxWidth: 760,
              margin: "0 auto"
            }}
          >
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#c5a028" }}>Factory Direct</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>No Middlemen Margins</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#c5a028" }}>25+ Pcs</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Low Minimum Order (MOQ)</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#c5a028" }}>2-Hour Quote</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Fast WhatsApp Turnaround</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content: Form + Features */}
      <div className="container" style={{ maxWidth: 1100, margin: "-30px auto 0", padding: "0 20px", position: "relative", zIndex: 3 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 36, alignItems: "start" }}>
          
          {/* Left: Interactive Form Box */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e7e1d6",
              borderRadius: 12,
              padding: "36px 40px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)"
            }}
          >
            <div style={{ marginBottom: 24, borderBottom: "1px solid #e7e1d6", paddingBottom: 16 }}>
              <h2 className="serif" style={{ fontSize: 22, fontWeight: 600, color: "#12192c", margin: "0 0 6px" }}>
                Request Wholesale Quote
              </h2>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                Fill in your order requirements below and our Bulk Sales Manager will get in touch with you immediately.
              </p>
            </div>

            {submitted ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "#f0fdf4",
                    border: "2px solid #bbf7d0",
                    color: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px"
                  }}
                >
                  <CheckCircle2 size={40} />
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 700, color: "#12192c", margin: "0 0 8px" }}>
                  Inquiry Submitted!
                </h3>
                <p style={{ fontSize: 14, color: "#64748b", maxWidth: 440, margin: "0 auto 24px", lineHeight: 1.6 }}>
                  Thank you, <strong>{name}</strong>. We have received your wholesale inquiry for <strong>{category} ({quantity})</strong>. Our team will contact you via WhatsApp / Call at <strong>{phone}</strong> within 2–4 hours with custom pricing.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  style={{
                    background: "#12192c",
                    color: "#ffffff",
                    border: 0,
                    padding: "12px 28px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Submit Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {errorMsg && (
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#dc2626",
                      padding: "12px 16px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 500
                    }}
                  >
                    ⚠️ {errorMsg}
                  </div>
                )}

                {/* Name & Business */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#334155", marginBottom: 6 }}>
                      Your Name *
                    </label>
                    <div style={{ position: "relative" }}>
                      <User size={16} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ananya Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "11px 12px 11px 36px",
                          fontSize: 13,
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#334155", marginBottom: 6 }}>
                      Company / Hotel Name (Optional)
                    </label>
                    <div style={{ position: "relative" }}>
                      <Building2 size={16} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                      <input
                        type="text"
                        placeholder="e.g. Heritage Boutique Hotel"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "11px 12px 11px 36px",
                          fontSize: 13,
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Phone & Email */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#334155", marginBottom: 6 }}>
                      Phone / WhatsApp Number *
                    </label>
                    <div style={{ position: "relative" }}>
                      <Phone size={16} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "11px 12px 11px 36px",
                          fontSize: 13,
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#334155", marginBottom: 6 }}>
                      Email Address
                    </label>
                    <div style={{ position: "relative" }}>
                      <Mail size={16} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                      <input
                        type="email"
                        placeholder="ananya@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "11px 12px 11px 36px",
                          fontSize: 13,
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Category Dropdown */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#334155", marginBottom: 6 }}>
                    Product Category Required *
                  </label>
                  <div style={{ position: "relative" }}>
                    <Layers size={16} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "11px 12px 11px 36px",
                        fontSize: 13,
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        outline: "none",
                        background: "#ffffff",
                        cursor: "pointer",
                        boxSizing: "border-box"
                      }}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quantity Preset Selector */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#334155", marginBottom: 6 }}>
                    Quantity Required (Pieces) *
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 10 }}>
                    {QUANTITY_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQuantity(preset)}
                        style={{
                          padding: "10px",
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 6,
                          border: quantity === preset ? "2px solid #a67c37" : "1px solid #cbd5e1",
                          background: quantity === preset ? "#faf6f0" : "#ffffff",
                          color: quantity === preset ? "#a67c37" : "#475569",
                          cursor: "pointer",
                          textAlign: "center"
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Or enter custom quantity (e.g. 250 Pillow Covers + 120 Bedsheets)"
                    value={QUANTITY_PRESETS.includes(quantity) ? "" : quantity}
                    onChange={(e) => setQuantity(e.target.value || QUANTITY_PRESETS[0])}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      fontSize: 12,
                      border: "1px dashed #cbd5e1",
                      borderRadius: 6,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#334155", marginBottom: 6 }}>
                    Additional Notes / Specifications (Optional)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Mention custom size, color preference, packaging details, or target delivery date..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      fontSize: 13,
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      outline: "none",
                      resize: "vertical",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: "linear-gradient(135deg, #12192c 0%, #1c2744 100%)",
                    color: "#ffffff",
                    border: 0,
                    padding: "16px 24px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 6,
                    boxShadow: "0 4px 14px rgba(18, 25, 44, 0.25)",
                    opacity: loading ? 0.75 : 1
                  }}
                >
                  {loading ? "Submitting Inquiry..." : <><Send size={16} /> Submit Bulk Order Inquiry</>}
                </button>
              </form>
            )}
          </div>

          {/* Right: Why Choose Zafiro Wholesale */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e7e1d6",
                borderRadius: 12,
                padding: "28px 28px"
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#12192c", margin: "0 0 20px" }}>
                WHY ZAFIRO WHOLESALE?
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#faf6f0", color: "#a67c37", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Award size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: "#12192c", margin: "0 0 4px" }}>Authentic Artisanal Craft</h4>
                    <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                      100% pure percale cotton crafted with original Jaipur wooden block prints and AZO-free skin-safe dyes.
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#faf6f0", color: "#a67c37", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: "#12192c", margin: "0 0 4px" }}>Custom Branding &amp; Packaging</h4>
                    <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                      Add your hotel brand logo, custom fabric tags, luxury gift boxes, and customized colorways.
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#faf6f0", color: "#a67c37", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Truck size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: "#12192c", margin: "0 0 4px" }}>Pan-India &amp; Global Shipping</h4>
                    <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                      Express doorstep delivery across India and worldwide export options for hospitality clients.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Need Immediate Help Banner */}
            <div
              style={{
                background: "linear-gradient(135deg, #a67c37 0%, #8e682c 100%)",
                color: "#ffffff",
                borderRadius: 12,
                padding: "24px 28px",
                textAlign: "center"
              }}
            >
              <h4 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Need Immediate Assistance?</h4>
              <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.9)", margin: "0 0 16px", lineHeight: 1.5 }}>
                Speak directly with our Wholesale Director on WhatsApp for urgent queries and instant physical fabric samples.
              </p>
              <a
                href="https://wa.me/919876543210?text=Hi%20Zafiro%20Team,%20I%20am%20interested%20in%20Bulk%20Wholesale%20Orders."
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  background: "#ffffff",
                  color: "#12192c",
                  padding: "10px 20px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 800,
                  textDecoration: "none",
                  letterSpacing: "0.5px"
                }}
              >
                💬 Chat on WhatsApp
              </a>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
