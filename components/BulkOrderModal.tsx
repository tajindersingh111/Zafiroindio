"use client";

import { useState } from "react";
import { X, PackageCheck, Send, CheckCircle2, Building2, User, Mail, Phone, Layers, HelpCircle, Sparkles } from "lucide-react";

interface BulkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
}

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

export default function BulkOrderModal({ isOpen, onClose, defaultCategory }: BulkOrderModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState(defaultCategory || CATEGORIES[0]);
  const [quantity, setQuantity] = useState("50 - 100 Pcs");
  const [businessName, setBusinessName] = useState("");
  const [notes, setNotes] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !phone.trim()) {
      setErrorMsg("Please provide your name and contact phone number.");
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
      setErrorMsg("Network error. Please try submitting again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setCategory(CATEGORIES[0]);
    setQuantity("50 - 100 Pcs");
    setBusinessName("");
    setNotes("");
    setSubmitted(false);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(18, 25, 44, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.4)",
          position: "relative",
          border: "1px solid #e7e1d6",
          animation: "fadeInZoom 0.25s ease-out"
        }}
      >
        {/* Modal Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.2)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
            transition: "all 0.2s ease"
          }}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Modal Header Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #12192c 0%, #1c2744 100%)",
            color: "#ffffff",
            padding: "28px 32px",
            borderRadius: "12px 12px 0 0",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div style={{ position: "absolute", right: "-20px", bottom: "-30px", opacity: 0.08, pointerEvents: "none" }}>
            <PackageCheck size={180} color="#ffffff" />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span
              style={{
                background: "rgba(197, 160, 40, 0.2)",
                border: "1px solid rgba(197, 160, 40, 0.5)",
                color: "#c5a028",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "1px",
                padding: "3px 10px",
                borderRadius: 20,
                textTransform: "uppercase",
                display: "inline-flex",
                alignItems: "center",
                gap: 5
              }}
            >
              <Sparkles size={12} /> Direct Factory Wholesale
            </span>
          </div>

          <h2
            className="serif"
            style={{
              fontSize: 26,
              fontWeight: 600,
              margin: "0 0 6px",
              color: "#ffffff",
              letterSpacing: "-0.5px"
            }}
          >
            Bulk Order &amp; Wholesale Inquiry
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.75)", margin: 0, lineHeight: 1.5, maxWidth: "480px" }}>
            Get factory pricing, custom handblock prints &amp; tailored quantities for hotels, retailers, or corporate gifting.
          </p>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "28px 32px" }}>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <div
                style={{
                  width: 68,
                  height: 68,
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
                <CheckCircle2 size={38} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: "#12192c", margin: "0 0 8px" }}>
                Inquiry Submitted Successfully!
              </h3>
              <p style={{ fontSize: 14, color: "#64748b", maxWidth: 420, margin: "0 auto 24px", lineHeight: 1.6 }}>
                Thank you, <strong>{name}</strong>. Our Bulk Sales Manager will review your inquiry for <strong>{category} ({quantity})</strong> and contact you via Phone/WhatsApp at <strong>{phone}</strong> within 2–4 hours with custom wholesale pricing.
              </p>
              <button
                type="button"
                onClick={resetForm}
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
                Done / Close Window
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {errorMsg && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    padding: "10px 14px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 500
                  }}
                >
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Name & Business */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
                        padding: "10px 12px 10px 36px",
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
                      placeholder="e.g. Taj Heritage Resort / Boutique"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px 10px 36px",
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
                        padding: "10px 12px 10px 36px",
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
                        padding: "10px 12px 10px 36px",
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
                      padding: "10px 12px 10px 36px",
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 8 }}>
                  {QUANTITY_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuantity(preset)}
                      style={{
                        padding: "9px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: quantity === preset ? "2px solid #a67c37" : "1px solid #cbd5e1",
                        background: quantity === preset ? "#faf6f0" : "#ffffff",
                        color: quantity === preset ? "#a67c37" : "#475569",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.15s ease"
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
                    padding: "8px 12px",
                    fontSize: 12,
                    border: "1px dashed #cbd5e1",
                    borderRadius: 6,
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Notes / Specifications */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#334155", marginBottom: 6 }}>
                  Additional Notes / Specific Requirements (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Mention custom size, color preference, packaging details, or target delivery date..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
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
                  padding: "14px 20px",
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
                  opacity: loading ? 0.75 : 1,
                  transition: "all 0.2s ease"
                }}
              >
                {loading ? (
                  "Submitting Inquiry..."
                ) : (
                  <>
                    <Send size={16} /> Submit Bulk Order Request
                  </>
                )}
              </button>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, fontSize: 11, color: "#64748b" }}>
                <span>⚡ Fast 2-Hour Response Time</span>
                <span>📦 Factory Direct Pricing</span>
                <span>🚚 Pan-India Shipping</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
