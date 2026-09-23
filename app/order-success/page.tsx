"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, ShoppingBag, ArrowRight, Package, FileText, User } from "lucide-react";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const rawOrderNumber = searchParams.get("orderNumber");
  const orderId = searchParams.get("orderId");
  const orderNumber = rawOrderNumber ? (rawOrderNumber.startsWith("#") ? rawOrderNumber : `#${rawOrderNumber}`) : "#ZI-10025";

  const invoiceUrl = orderId
    ? `/api/invoices/${orderId}/download`
    : `/admin/orders/1/invoice`;

  return (
    <main style={{ padding: "64px 20px", background: "var(--cream)", minHeight: "75vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 580, width: "100%", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: "40px 32px", textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.04)" }}>
        <div style={{ width: 64, height: 64, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", color: "#16a34a" }}>
          <Check size={32} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ color: "var(--gold-dark)", marginBottom: 6 }}>Order Confirmed</p>
          <h1 className="serif" style={{ fontSize: 32, margin: "0 0 8px", color: "var(--ink)" }}>Thank You For Your Order!</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
            Your order has been placed successfully and recorded in our system.
          </p>
          <div style={{ display: "inline-block", background: "var(--cream)", border: "1px solid var(--line)", padding: "6px 16px", borderRadius: 20, marginTop: 16, fontSize: 13, fontWeight: 700, color: "var(--gold-dark)", letterSpacing: 0.5 }}>
            Order ID: {orderNumber}
          </div>
        </div>

        <div style={{ background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 12, padding: 20, textAlign: "left", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
            <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
              <Check size={14} />
            </span>
            <div>
              <strong style={{ display: "block", fontSize: 13, color: "var(--ink)", marginBottom: 2 }}>Payment & GST Invoice Generated</strong>
              <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, display: "block" }}>We have generated your official tax invoice with UPI QR code and order details.</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--paper)", color: "var(--gold-dark)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
              <Package size={14} />
            </span>
            <div>
              <strong style={{ display: "block", fontSize: 13, color: "var(--ink)", marginBottom: 2 }}>Handcrafted Packaging & Delivery</strong>
              <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, display: "block" }}>Your items are being carefully inspected, packed in eco-friendly linen bags, and dispatched (3-5 business days).</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <Link
              href={invoiceUrl}
              target="_blank"
              style={{
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "#faf6f0",
                border: "1px solid var(--line)",
                color: "var(--ink)",
                padding: "12px 18px",
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 6,
                textDecoration: "none"
              }}
            >
              <FileText size={15} style={{ color: "var(--gold-dark)" }} /> Download Invoice
            </Link>

            <Link
              href="/account"
              style={{
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "#1c1917",
                color: "#ffffff",
                padding: "12px 18px",
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 6,
                textDecoration: "none"
              }}
            >
              <User size={15} /> Track Order
            </Link>
          </div>

          <Link href="/shop" className="btn gold" style={{ width: "100%", justifyContent: "center" }}>
            <ShoppingBag size={16} /> Continue Shopping <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <main style={{ padding: "64px 20px", textAlign: "center", color: "var(--muted)" }}>
        Loading order details...
      </main>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}
