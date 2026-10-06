"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, ShoppingBag, ArrowRight, Package, FileText, Truck } from "lucide-react";
import { useStore } from "@/components/StoreProvider";

type PublicOrder = {
  orderNumber: string;
  customerFirstName: string;
  city: string;
  total: number;
  paymentMethod: string;
  estimatedDelivery?: string;
  items: { name: string; quantity: number; price: number; image?: string }[];
};

function OrderSuccessContent() {
  const ref = useSearchParams().get("ref") || "";
  const { clearCart } = useStore();
  const [state, setState] = useState<"loading" | "ready" | "missing">(ref ? "loading" : "missing");
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const tries = useRef(0);

  useEffect(() => {
    if (!ref) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;

    // Shiprocket confirms the order to our server a moment after payment, so poll briefly.
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/by-ref?ref=${encodeURIComponent(ref)}`, { cache: "no-store" });
        if (res.status === 404) return !stop && setState("missing");
        const data = await res.json();
        if (data.status === "ready") {
          if (stop) return;
          setOrder(data.order);
          setInvoiceUrl(data.invoiceUrl);
          setState("ready");
          clearCart();
          return;
        }
      } catch {}
      if (!stop && ++tries.current < 40) timer = setTimeout(poll, 2500);
    };
    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  return (
    <main className="blockprint-bg" style={{ padding: "64px 20px", minHeight: "75vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="lux-card" style={{ maxWidth: 620, width: "100%", padding: "44px 32px", textAlign: "center", boxShadow: "0 18px 50px rgba(23,26,69,.08)" }}>
        {state === "loading" && (
          <>
            <p className="eyebrow">Confirming payment</p>
            <h1 className="serif" style={{ fontSize: 32, margin: "10px 0" }}>Just a moment…</h1>
            <p style={{ color: "var(--muted)" }}>We're confirming your order with the payment partner. Please don't close this page.</p>
          </>
        )}

        {state === "missing" && (
          <>
            <h1 className="serif" style={{ fontSize: 32, margin: "0 0 10px" }}>We couldn't find that order</h1>
            <p style={{ color: "var(--muted)", marginBottom: 22 }}>
              If you just paid, your confirmation e-mail will arrive shortly. You can also track your order with your order number.
            </p>
            <Link href="/track" className="btn gold">Track an order</Link>
          </>
        )}

        {state === "ready" && order && (
          <>
            <div style={{ width: 64, height: 64, borderRadius: "50%", border: "1px solid var(--gold)", color: "var(--gold-dark)", display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
              <Check size={30} />
            </div>
            <p className="eyebrow">Order confirmed</p>
            <h1 className="serif" style={{ fontSize: "clamp(30px,5vw,40px)", margin: "10px 0 6px" }}>
              Thank you{order.customerFirstName ? `, ${order.customerFirstName}` : ""}
            </h1>
            <p style={{ color: "var(--muted)", margin: 0 }}>Your order is with our Jaipur artisans' team{order.city ? ` and will travel to ${order.city}` : ""}.</p>
            <div style={{ display: "inline-block", border: "1px solid var(--line-gold)", padding: "6px 18px", marginTop: 16, fontSize: 13, fontWeight: 700, color: "var(--gold-dark)", letterSpacing: 1 }}>
              {order.orderNumber}
            </div>

            <div style={{ textAlign: "left", margin: "28px 0", borderTop: "1px solid var(--line)" }}>
              {order.items.map((i, idx) => (
                <div key={idx} style={{ display: "flex", gap: 14, alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                  {i.image && <img src={i.image} alt="" width={52} height={52} style={{ objectFit: "cover", borderRadius: 2 }} />}
                  <div style={{ flex: 1, fontSize: 14 }}>
                    {i.name}
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>Qty {i.quantity}</div>
                  </div>
                  <strong>₹{(i.price * i.quantity).toLocaleString("en-IN")}</strong>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", fontWeight: 700, fontSize: 16 }}>
                <span>Total ({order.paymentMethod === "cod" ? "Cash on delivery" : "Paid"})</span>
                <span>₹{order.total.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12, textAlign: "left", marginBottom: 26, fontSize: 13, color: "var(--ink-soft)" }}>
              <div style={{ display: "flex", gap: 10 }}><Package size={16} style={{ color: "var(--gold-dark)", flexShrink: 0 }} /> Each piece is inspected and packed in a cotton linen bag.</div>
              <div style={{ display: "flex", gap: 10 }}><Truck size={16} style={{ color: "var(--gold-dark)", flexShrink: 0 }} /> Estimated delivery: {order.estimatedDelivery || "3–7 business days"}. Tracking details will be e-mailed.</div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {invoiceUrl && (
                <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" className="btn outline" style={{ flex: 1 }}>
                  <FileText size={15} /> Invoice
                </a>
              )}
              <Link href="/track" className="btn outline" style={{ flex: 1 }}>
                <Truck size={15} /> Track order
              </Link>
              <Link href="/shop" className="btn gold" style={{ flex: "1 1 100%" }}>
                <ShoppingBag size={15} /> Continue shopping <ArrowRight size={14} />
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<main style={{ padding: "64px 20px", textAlign: "center", color: "var(--muted)" }}>Loading…</main>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
