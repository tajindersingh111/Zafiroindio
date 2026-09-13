"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Truck, Package, Download, XCircle, RotateCcw, ShieldCheck, ArrowLeft } from "lucide-react";
import type { Order } from "@/lib/db/types";

export default function CustomerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [showReturnModal, setShowReturnModal] = useState(false);

  useEffect(() => {
    fetch("/api/admin/orders?pageSize=100")
      .then(res => res.json())
      .then(data => {
        if (data.orders) {
          const found = data.orders.find((o: Order) => o.id === id || o.orderNumber === id);
          if (found) setOrder(found);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!confirm("Are you sure you want to cancel this order?")) return;

    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by customer via account portal" })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage("Order cancelled successfully.");
        setOrder(data.order);
      } else {
        alert(data.error || "Failed to cancel order.");
      }
    } catch (e) {
      alert("Error processing cancellation request.");
    }
  };

  const handleRequestReturn = async () => {
    if (!order || !returnReason) return;
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, reason: returnReason })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage("Return request submitted successfully.");
        setShowReturnModal(false);
        setOrder(data.order);
      } else {
        alert(data.error || "Failed to submit return request.");
      }
    } catch (e) {
      alert("Error submitting return request.");
    }
  };

  if (loading) {
    return (
      <main style={{ padding: "60px 20px", textAlign: "center", background: "var(--cream)", minHeight: "70vh" }}>
        Loading order details…
      </main>
    );
  }

  if (!order) {
    return (
      <main style={{ padding: "60px 20px", textAlign: "center", background: "var(--cream)", minHeight: "70vh" }}>
        <h1 className="serif">Order Not Found</h1>
        <Link href="/account/orders" className="btn gold" style={{ marginTop: 16 }}>Back to My Orders</Link>
      </main>
    );
  }

  // Timeline Stepper logic
  const steps = [
    { key: "created", label: "ORDER PLACED", icon: Clock },
    { key: "paid", label: "PAYMENT CONFIRMED", icon: CheckCircle2 },
    { key: "processing", label: "PROCESSING", icon: Package },
    { key: "shipped", label: "SHIPPED", icon: Truck },
    { key: "out_for_delivery", label: "OUT FOR DELIVERY", icon: Truck },
    { key: "delivered", label: "DELIVERED", icon: ShieldCheck },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case "payment_pending": return 0;
      case "paid": return 1;
      case "processing": return 2;
      case "shipped": return 3;
      case "out_for_delivery": return 4;
      case "delivered": return 5;
      case "completed": return 5;
      default: return 1;
    }
  };

  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <main style={{ padding: "40px 20px", background: "var(--cream)", minHeight: "80vh" }}>
      <div className="container" style={{ maxWidth: 900 }}>
        <Link href="/account/orders" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--gold-dark)", textDecoration: "none", fontWeight: 700, marginBottom: 16 }}>
          <ArrowLeft size={14} /> Back to My Orders
        </Link>

        {actionMessage && (
          <div style={{ padding: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 600 }}>
            {actionMessage}
          </div>
        )}

        {/* Top Header Card */}
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <p className="eyebrow" style={{ color: "var(--gold-dark)", marginBottom: 4 }}>Order Details</p>
              <h1 className="serif" style={{ fontSize: 26, margin: "0 0 4px" }}>Order #{order.orderNumber}</h1>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a
                href={`/api/invoices/${order.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn outline"
                style={{ fontSize: 12 }}
              >
                <Download size={14} /> Download Invoice
              </a>

              {!isCancelled && ["payment_pending", "paid", "processing"].includes(order.status) && (
                <button onClick={handleCancelOrder} className="btn outline" style={{ fontSize: 12, color: "#b91c1c", borderColor: "#fca5a5" }}>
                  <XCircle size={14} /> Cancel Order
                </button>
              )}

              {order.status === "delivered" && (
                <button onClick={() => setShowReturnModal(true)} className="btn gold" style={{ fontSize: 12 }}>
                  <RotateCcw size={14} /> Request Return
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Visual Timeline Stepper */}
        {!isCancelled ? (
          <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <h3 className="serif" style={{ fontSize: 16, margin: "0 0 20px" }}>Order Progress Timeline</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 12, textAlign: "center" }}>
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isDone = idx <= currentStep;
                const isCurrent = idx === currentStep;
                return (
                  <div key={step.key} style={{ opacity: isDone ? 1 : 0.4 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", margin: "0 auto 8px",
                      background: isDone ? (isCurrent ? "var(--gold-dark)" : "#166534") : "var(--cream)",
                      color: isDone ? "#fff" : "var(--muted)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: isDone ? "none" : "1px solid var(--line)"
                    }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: isDone ? "var(--ink)" : "var(--muted)" }}>
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {order.trackingNumber && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                <div>
                  <strong style={{ color: "var(--ink)" }}>Courier Partner:</strong> {order.courierName || "Delhivery"} |{" "}
                  <strong style={{ color: "var(--ink)" }}>Tracking AWB:</strong> <code>{order.trackingNumber}</code>
                </div>
                {order.trackingUrl && (
                  <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold-dark)", fontWeight: 700 }}>
                    Track Shipment External →
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: 16, marginBottom: 20, color: "#991b1b", fontSize: 13, fontWeight: 600 }}>
            This order was cancelled. If payment was collected, a refund has been initiated to your original payment method.
          </div>
        )}

        {/* Order Details Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
          {/* Left: Product Line Items */}
          <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: 24 }}>
            <h3 className="serif" style={{ fontSize: 16, margin: "0 0 16px" }}>Ordered Items</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {order.items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: idx < order.items.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <div>
                    <strong style={{ fontSize: 14, display: "block" }}>{item.name}</strong>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      SKU: <code>{item.sku}</code> · Qty: {item.quantity}
                    </span>
                    {item.attributes && item.attributes.length > 0 && (
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                        {item.attributes.map(a => `${a.name}: ${a.value}`).join(" | ")}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>
                    ₹{item.total.toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Summary & Address */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Price Summary */}
            <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: 20 }}>
              <h4 className="serif" style={{ fontSize: 15, margin: "0 0 12px" }}>Payment Summary</h4>
              <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 6, color: "var(--muted)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Item Subtotal</span><span>₹{order.subtotal.toLocaleString("en-IN")}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Shipping Fee</span><span>{order.shippingCost === 0 ? "FREE" : `₹${order.shippingCost}`}</span></div>
                {order.discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#166534" }}><span>Discount</span><span>-₹{order.discount}</span></div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 8, fontSize: 14, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>
                  <span>Payable Total</span>
                  <span style={{ color: "var(--gold-dark)" }}>₹{order.total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: 20, fontSize: 12, lineHeight: 1.6 }}>
              <h4 className="serif" style={{ fontSize: 15, margin: "0 0 8px" }}>Delivery Address</h4>
              <strong style={{ color: "var(--ink)" }}>{order.customerName}</strong><br />
              {order.shipping.address1}{order.shipping.address2 ? `, ${order.shipping.address2}` : ""}<br />
              {order.shipping.city}, {order.shipping.state} — {order.shipping.postalCode}<br />
              Phone: {order.customerPhone || order.shipping.phone}
            </div>
          </div>
        </div>

        {/* Return Modal */}
        {showReturnModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 460, width: "100%" }}>
              <h3 className="serif" style={{ margin: "0 0 8px" }}>Request Product Return</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Please state the reason for returning your item(s).</p>
              <textarea
                rows={3}
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
                placeholder="Reason (e.g. Size mismatch, defective stitching, change of mind)..."
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--line)", fontSize: 13, marginBottom: 16 }}
              />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setShowReturnModal(false)} className="btn outline" style={{ fontSize: 12 }}>Cancel</button>
                <button onClick={handleRequestReturn} className="btn gold" style={{ fontSize: 12 }}>Submit Request</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
