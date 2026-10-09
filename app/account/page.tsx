"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Truck, FileText, RotateCcw, Heart, ShieldCheck } from "lucide-react";
import { useStore } from "@/components/StoreProvider";
import { img } from "@/lib/img";

type Lookup = {
  order: { orderNumber: string; status: string; customerFirstName: string; customerCity: string; orderDate: string; total: number; paymentMethod: string; items: { name: string; qty: number; price: number; image?: string }[] };
  shipment: { courierName?: string; trackingNumber?: string; trackingUrl?: string; status?: string } | null;
  currentStep: number;
  estimatedDelivery: string | null;
};

const CANCELLABLE = new Set(["payment_pending", "pending_payment", "paid", "processing", "on_hold"]);
const label = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function AccountPage() {
  const { wishlist } = useStore();
  const [orderNo, setOrderNo] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Lookup | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<"cancel" | "return" | null>(null);

  async function find(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/shipments/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: orderNo, contact }) });
      const json = await res.json();
      if (res.ok && json.found) setData(json);
      else {
        setData(null);
        setError(json.error || "We could not find that order.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAction() {
    if (!data || !action) return;
    setLoading(true);
    setError("");
    try {
      const url = action === "cancel" ? `/api/orders/${encodeURIComponent(data.order.orderNumber)}/cancel` : "/api/returns";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: data.order.orderNumber, contact, reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Request failed.");
      const msg = action === "cancel" ? "Your order has been cancelled. Any prepaid amount will be refunded to the original payment method." : "Your return request has been received. Our team will contact you shortly.";
      setAction(null);
      setReason("");
      await find();
      setNotice(msg);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const invoiceHref = data ? `/api/invoices/${encodeURIComponent(data.order.orderNumber)}/download?contact=${encodeURIComponent(contact)}` : "#";

  return (
    <main className="blockprint-bg">
      <div className="container section" style={{ maxWidth: 860 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span className="eyebrow">My orders</span>
          <h1 className="serif" style={{ fontSize: "clamp(34px,5vw,52px)", margin: "10px 0 0" }}>Find Your Order</h1>
          <div className="ornament"><i /></div>
          <p style={{ color: "var(--ink-soft)", margin: 0 }}>Enter your order number and the phone or email you ordered with. Track, download your invoice, cancel or request a return.</p>
        </div>

        <form onSubmit={find} className="lux-card" style={{ padding: 24, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", alignItems: "end" }}>
          <label style={{ fontSize: 12, fontWeight: 700 }}>
            Order number
            <input className="lux-input" required value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="ZI-10025" style={{ marginTop: 6 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 700 }}>
            Phone or email
            <input className="lux-input" required value={contact} onChange={(e) => setContact(e.target.value)} placeholder="98xxxxxx10 or you@email.com" style={{ marginTop: 6 }} />
          </label>
          <button className="btn gold" type="submit" disabled={loading}>{loading ? "Searching…" : "Find order"}</button>
        </form>

        {error && <p role="alert" style={{ color: "var(--danger)", marginTop: 14, textAlign: "center" }}>{error}</p>}
        {notice && <p role="status" style={{ color: "var(--success)", marginTop: 14, textAlign: "center" }}>{notice}</p>}

        {data && (
          <section className="lux-card" style={{ marginTop: 28, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
              <div>
                <p className="eyebrow" style={{ marginBottom: 4 }}>{data.order.orderNumber}</p>
                <h2 className="serif" style={{ fontSize: 28, margin: 0 }}>{label(data.order.status)}</h2>
                <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
                  Placed {new Date(data.order.orderDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  {data.order.customerCity ? ` · Shipping to ${data.order.customerCity}` : ""}
                </p>
              </div>
              <strong style={{ fontSize: 22 }}>₹{data.order.total.toLocaleString("en-IN")}</strong>
            </div>

            <div style={{ display: "flex", gap: 6, margin: "8px 0 22px" }} aria-label={`Progress step ${data.currentStep} of 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} style={{ flex: 1, height: 4, background: n <= data.currentStep ? "var(--gold)" : "var(--line)" }} />
              ))}
            </div>

            {data.order.items.map((i, idx) => (
              <div key={idx} style={{ display: "flex", gap: 14, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
                {i.image && <img src={img(i.image, 128)} alt="" width={52} height={52} style={{ objectFit: "cover" }} />}
                <div style={{ flex: 1, fontSize: 14 }}>{i.name}<div style={{ fontSize: 12, color: "var(--muted)" }}>Qty {i.qty}</div></div>
                <span>₹{(i.price * i.qty).toLocaleString("en-IN")}</span>
              </div>
            ))}

            {data.shipment?.trackingNumber && (
              <p style={{ fontSize: 13, marginTop: 14 }}>
                <Truck size={14} style={{ display: "inline", marginRight: 6, color: "var(--gold-dark)" }} />
                {data.shipment.courierName || "Courier"} · AWB {data.shipment.trackingNumber}
                {data.shipment.trackingUrl && <> · <a href={data.shipment.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>Live tracking</a></>}
              </p>
            )}
            {data.estimatedDelivery && <p style={{ fontSize: 13, color: "var(--muted)" }}>Estimated delivery: {data.estimatedDelivery}</p>}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
              <a className="btn outline" href={invoiceHref} target="_blank" rel="noopener noreferrer"><FileText size={14} /> Invoice</a>
              {CANCELLABLE.has(data.order.status) && <button className="btn outline" onClick={() => setAction("cancel")}><Package size={14} /> Cancel order</button>}
              {data.order.status === "delivered" && <button className="btn outline" onClick={() => setAction("return")}><RotateCcw size={14} /> Request return</button>}
            </div>

            {action && (
              <div style={{ marginTop: 18, borderTop: "1px solid var(--line)", paddingTop: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  {action === "cancel" ? "Reason for cancelling (optional)" : "Reason for return"}
                  <textarea className="lux-input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required={action === "return"} style={{ marginTop: 6 }} />
                </label>
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button className="btn indigo" disabled={loading || (action === "return" && !reason.trim())} onClick={submitAction}>Confirm {action === "cancel" ? "cancellation" : "return request"}</button>
                  <button className="btn outline" onClick={() => setAction(null)}>Never mind</button>
                </div>
              </div>
            )}
          </section>
        )}

        <div className="trust-row" style={{ marginTop: 36 }}>
          <Link href="/wishlist" className="lux-card" style={{ padding: 16, display: "flex", gap: 10, alignItems: "center" }}><Heart size={16} style={{ color: "var(--gold-dark)" }} /> Wishlist ({wishlist.length})</Link>
          <Link href="/track" className="lux-card" style={{ padding: 16, display: "flex", gap: 10, alignItems: "center" }}><Truck size={16} style={{ color: "var(--gold-dark)" }} /> Track a shipment</Link>
          <div className="lux-card" style={{ padding: 16, display: "flex", gap: 10, alignItems: "center" }}><ShieldCheck size={16} style={{ color: "var(--gold-dark)" }} /> Private &amp; secure lookup</div>
        </div>
      </div>
    </main>
  );
}
