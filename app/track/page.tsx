"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Truck, Search, CheckCircle2, MapPin, PhoneCall, AlertCircle, RefreshCw } from "lucide-react";

function TrackContent() {
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") || searchParams.get("awb") || searchParams.get("orderNumber") || "";

  const [inputVal, setInputVal] = useState(initialQuery);
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<any>(null);

  const fetchTracking = async (queryStr: string, contactStr: string = contact) => {
    if (!queryStr.trim() || !contactStr.trim()) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/shipments/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: queryStr.trim(), contact: contactStr.trim() }) });
      const data = await res.json();

      if (res.ok && data.found) {
        setTrackingData(data);
      } else {
        setTrackingData(null);
        setErrorMsg(data.error || "No shipment records found for this input.");
      }
    } catch {
      setErrorMsg("Network error while searching tracking details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim() && contact.trim()) {
      fetchTracking(inputVal.trim(), contact.trim());
    }
  };

  const steps = [
    { label: "Order Confirmed", desc: "Order details received & verified" },
    { label: "Handcrafted & Packed", desc: "Inspected & packed in eco linen bag" },
    { label: "Courier Picked Up", desc: "Handed over to courier partner" },
    { label: "Out for Delivery", desc: "Package out for doorstep delivery" },
    { label: "Delivered", desc: "Package handed to recipient" }
  ];

  return (
    <main style={{ background: "#faf8f5", minHeight: "85vh", padding: "40px 0 80px" }}>
      <div className="container" style={{ maxWidth: 880, margin: "0 auto", padding: "0 20px" }}>
        
        {/* Breadcrumb */}
        <nav style={{ fontSize: 12, color: "#888", marginBottom: 20, display: "flex", gap: 6 }}>
          <Link href="/" style={{ color: "#888", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "#333", fontWeight: 500 }}>Track Shipment</span>
        </nav>

        {/* Page Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#1c1917", color: "#a67c37", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Truck size={24} />
          </div>
          <h1 className="serif" style={{ fontSize: 36, fontWeight: 500, color: "#1c1917", margin: "0 0 8px" }}>
            Track Your Package
          </h1>
          <p style={{ fontSize: 14, color: "#66625d", margin: 0, maxWidth: 500, marginInline: "auto" }}>
            Enter your Order ID (e.g. ZI-10025) and the phone number or email you ordered with.
          </p>
        </div>

        {/* Search Bar Box */}
        <div style={{ background: "#ffffff", border: "1px solid #e7e1d6", borderRadius: 12, padding: "24px", marginBottom: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Search size={18} style={{ position: "absolute", left: 14, top: 13, color: "#999" }} />
              <input
                type="text"
                required
                placeholder="Order ID (e.g. ZI-10025)"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  borderRadius: 6,
                  border: "1px solid #d4cdbf",
                  fontSize: 13.5,
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                type="text"
                required
                aria-label="Phone number or email used for the order"
                placeholder="Phone or email used for the order"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 6, border: "1px solid #d4cdbf", fontSize: 13.5, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: "#a67c37",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Truck size={15} />}
              {loading ? "SEARCHING…" : "TRACK NOW"}
            </button>
          </form>
        </div>

        {/* Error State */}
        {errorMsg && (
          <div style={{ background: "#fdf2f0", border: "1px solid #e8c5be", borderRadius: 10, padding: "18px 22px", marginBottom: 28, display: "flex", alignItems: "flex-start", gap: 12, color: "#c83232" }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ display: "block", fontSize: 14, marginBottom: 2 }}>Tracking Information Not Found</strong>
              <span style={{ fontSize: 13, lineHeight: 1.5 }}>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Live Tracking Result Display */}
        {trackingData && (
          <div style={{ background: "#ffffff", border: "1px solid #e7e1d6", borderRadius: 12, padding: "32px", boxShadow: "0 6px 24px rgba(0,0,0,0.04)" }}>
            
            {/* Top Shipment Meta Card */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f0eae1", paddingBottom: 20, marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#a67c37" }}>
                  COURIER PARTNER
                </span>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", marginTop: 2 }}>
                  {trackingData.shipment?.courierName || "Being assigned"}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#888" }}>
                  AWB TRACKING NUMBER
                </span>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1c1917", fontFamily: "monospace", marginTop: 2 }}>
                  {trackingData.shipment?.trackingNumber || "Will be shared once shipped"}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#888" }}>
                  DESTINATION
                </span>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin size={14} color="#a67c37" /> {trackingData.order?.customerCity || "Jaipur, India"}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#888" }}>
                  ESTIMATED DELIVERY
                </span>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#2e7d32", marginTop: 2 }}>
                  {trackingData.estimatedDelivery || "3-5 Business Days"}
                </div>
              </div>
            </div>

            {/* Live Progress Stepper */}
            <div style={{ background: "#faf8f5", border: "1px solid #e7e1d6", borderRadius: 10, padding: "24px 20px", marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#1c1917", marginBottom: 20, textAlign: "center" }}>
                LIVE PACKAGE TIMELINE
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
                {steps.map((step, idx) => {
                  const stepNum = idx + 1;
                  const isDone = stepNum <= trackingData.currentStep;
                  const isCurrent = stepNum === trackingData.currentStep;

                  return (
                    <div key={step.label} style={{ flex: 1, textAlign: "center", padding: "0 6px" }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: isDone ? "#a67c37" : "#ffffff",
                          border: isDone ? "2px solid #a67c37" : "2px solid #ccc",
                          color: isDone ? "#ffffff" : "#999",
                          fontSize: 12,
                          fontWeight: 800,
                          margin: "0 auto 8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: isCurrent ? "0 0 0 4px rgba(166, 124, 55, 0.2)" : "none"
                        }}
                      >
                        {isDone ? <CheckCircle2 size={16} /> : stepNum}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: isCurrent ? 800 : isDone ? 700 : 500, color: isCurrent ? "#a67c37" : isDone ? "#1c1917" : "#888" }}>
                        {step.label}
                      </div>
                      <div style={{ fontSize: 10.5, color: "#777", marginTop: 2 }}>
                        {step.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Courier scan history (from ShipMozo) */}
            {trackingData.shipment?.events?.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917", marginBottom: 12 }}>
                  Courier updates
                </h3>
                <ol style={{ listStyle: "none", margin: 0, padding: 0, borderLeft: "2px solid #e7e1d6" }}>
                  {trackingData.shipment.events.map((ev: { date?: string; status: string; location?: string }, i: number) => (
                    <li key={i} style={{ position: "relative", padding: "0 0 14px 16px" }}>
                      <span style={{ position: "absolute", left: -6, top: 4, width: 10, height: 10, borderRadius: "50%", background: i === 0 ? "#a67c37" : "#d6cfc3" }} />
                      <div style={{ fontSize: 13, fontWeight: i === 0 ? 800 : 600, color: "#1c1917" }}>{ev.status}</div>
                      <div style={{ fontSize: 11.5, color: "#777", marginTop: 2 }}>{[ev.location, ev.date].filter(Boolean).join(" · ")}</div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Order Items Info */}
            {trackingData.order && (
              <div style={{ borderTop: "1px solid #f0eae1", paddingTop: 20, marginTop: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917", marginBottom: 14 }}>
                  Items in this shipment ({trackingData.order.itemsCount})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {trackingData.order.items?.map((item: any, i: number) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#faf8f5", borderRadius: 6, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: "#1c1917" }}>{item.name} (Qty: {item.qty})</span>
                      <span style={{ fontWeight: 700, color: "#1c1917" }}>₹{(item.price * item.qty).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Support Footer Row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, paddingTop: 20, borderTop: "1px solid #f0eae1", flexWrap: "wrap", gap: 12 }}>
              <div style={{ fontSize: 12, color: "#666" }}>
                Need help with your shipment? Contact support 10 AM - 7 PM IST.
              </div>
              <a
                href="https://wa.me/919876543210?text=Hi%20Zafiro%20Support%2C%20I%20need%20help%20tracking%20my%20shipment"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#25D366",
                  color: "#ffffff",
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 6,
                  textDecoration: "none"
                }}
              >
                <PhoneCall size={14} /> WhatsApp Support
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: 60 }}>Loading tracking details...</div>}>
      <TrackContent />
    </Suspense>
  );
}
