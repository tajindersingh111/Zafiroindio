"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, ArrowRight, Clock, CheckCircle2, Truck, AlertCircle } from "lucide-react";
import type { Order } from "@/lib/db/types";

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/orders?pageSize=50")
      .then(res => res.json())
      .then(data => {
        if (data.orders) {
          setOrders(data.orders);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
      case "completed":
        return <span style={{ padding: "4px 12px", background: "#f0fdf4", color: "#166534", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>PAID</span>;
      case "shipped":
        return <span style={{ padding: "4px 12px", background: "#eff6ff", color: "#1e40af", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>SHIPPED</span>;
      case "out_for_delivery":
        return <span style={{ padding: "4px 12px", background: "#fefce8", color: "#854d0e", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>OUT FOR DELIVERY</span>;
      case "delivered":
        return <span style={{ padding: "4px 12px", background: "#ecfdf5", color: "#065f46", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>DELIVERED</span>;
      case "cancelled":
        return <span style={{ padding: "4px 12px", background: "#fef2f2", color: "#991b1b", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>CANCELLED</span>;
      default:
        return <span style={{ padding: "4px 12px", background: "var(--cream)", color: "var(--gold-dark)", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{status.toUpperCase()}</span>;
    }
  };

  return (
    <main style={{ padding: "40px 20px", background: "var(--cream)", minHeight: "80vh" }}>
      <div className="container" style={{ maxWidth: 960 }}>
        <div className="breadcrumb" style={{ marginBottom: 16 }}>
          <Link href="/">Home</Link> / <span>My Orders</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 className="serif" style={{ fontSize: 28, margin: "0 0 4px" }}>My Orders</h1>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Track and manage your Zafiro bedsheet purchases.</p>
          </div>
          <Link href="/shop" className="btn gold" style={{ fontSize: 12 }}>
            Browse Shop <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>Loading your orders…</div>
        ) : orders.length === 0 ? (
          <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 16, padding: 48, textAlign: "center" }}>
            <Package size={40} style={{ color: "var(--gold-dark)", marginBottom: 12 }} />
            <h2 className="serif" style={{ fontSize: 20, margin: "0 0 8px" }}>No orders placed yet</h2>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Discover our luxury bedding collections and make your bedroom feel like home.</p>
            <Link href="/shop" className="btn gold">Explore Collections</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {orders.map(order => (
              <div key={order.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: 12, marginBottom: 14 }}>
                  <div>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Order ID:</span>{" "}
                    <strong style={{ fontSize: 14, color: "var(--ink)" }}>{order.orderNumber}</strong>
                    <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 16 }}>
                      Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div>{getStatusBadge(order.status)}</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 13, margin: "0 0 4px", fontWeight: 600 }}>
                      {order.items.map(i => `${i.name} (${i.quantity})`).join(", ")}
                    </p>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      Payment: {order.paymentMethod.toUpperCase()} · Payable Total: <strong style={{ color: "var(--gold-dark)" }}>₹{order.total.toLocaleString("en-IN")}</strong>
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <a
                      href={`/api/invoices/${order.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn outline"
                      style={{ padding: "6px 14px", fontSize: 11 }}
                    >
                      Invoice
                    </a>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="btn gold"
                      style={{ padding: "6px 14px", fontSize: 11 }}
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
