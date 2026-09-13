"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { User, Package, MapPin, Search, ChevronRight, CheckCircle2, Clock, Truck } from "lucide-react";

export default function CustomerAccountPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "addresses" | "profile">("orders");
  const [emailQuery, setEmailQuery] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchCustomerData = async (query: string) => {
    if (!query) return;
    setLoading(true);
    try {
      // Lookup customer orders from admin orders endpoint
      const res = await fetch(`/api/admin/orders`);
      if (res.ok) {
        const data = await res.json();
        const allOrders = data.orders || [];
        const filtered = allOrders.filter(
          (o: any) =>
            o.customer?.email?.toLowerCase().includes(query.toLowerCase()) ||
            o.customer?.phone?.includes(query) ||
            o.orderNumber?.toLowerCase().includes(query.toLowerCase())
        );
        setOrders(filtered);

        // Extract unique shipping addresses from orders
        const addrMap = new Map();
        filtered.forEach((o: any) => {
          if (o.shippingAddress && o.shippingAddress.street) {
            const key = `${o.shippingAddress.street}-${o.shippingAddress.pincode}`;
            if (!addrMap.has(key)) {
              addrMap.set(key, { ...o.shippingAddress, isDefault: addrMap.size === 0 });
            }
          }
        });
        setAddresses(Array.from(addrMap.values()));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  return (
    <main style={{ padding: "40px 0", minHeight: "80vh", backgroundColor: "#faf8f5" }}>
      <div className="container" style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px" }}>
        
        {/* Header */}
        <div style={{ marginBottom: 32, borderBottom: "1px solid #e5dfd5", paddingBottom: 24 }}>
          <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c8275", marginBottom: 6 }}>
            My Account & Orders
          </div>
          <h1 className="serif" style={{ fontSize: 32, fontWeight: 400, color: "#1a1612", margin: 0 }}>
            Customer Portal
          </h1>
          <p style={{ color: "#665f55", fontSize: 14, marginTop: 4 }}>
            Track your orders, view saved shipping addresses, and manage your Zafiro profile.
          </p>
        </div>

        {/* Lookup Bar */}
        <div style={{ background: "#ffffff", padding: 24, borderRadius: 12, border: "1px solid #e8e2d9", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", marginBottom: 32 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#2c251e", marginBottom: 8 }}>
            Search Your Orders by Email, Phone or Order ID
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={18} style={{ position: "absolute", left: 14, top: 14, color: "#9c9285" }} />
              <input
                type="text"
                placeholder="Enter email (e.g. customer@example.com) or Order ID"
                value={emailQuery}
                onChange={(e) => setEmailQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchCustomerData(emailQuery)}
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  borderRadius: 8,
                  border: "1px solid #dcd4c8",
                  fontSize: 14,
                  outline: "none"
                }}
              />
            </div>
            <button
              onClick={() => fetchCustomerData(emailQuery)}
              style={{
                backgroundColor: "#1a1612",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 14,
                border: "none",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
            >
              {loading ? "Searching..." : "Find Orders"}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: 12, borderBottom: "1px solid #e0d8cc", marginBottom: 24 }}>
          <button
            onClick={() => setActiveTab("orders")}
            style={{
              padding: "10px 18px",
              border: "none",
              background: "none",
              borderBottom: activeTab === "orders" ? "2px solid #1a1612" : "2px solid transparent",
              fontWeight: activeTab === "orders" ? 600 : 400,
              color: activeTab === "orders" ? "#1a1612" : "#786f63",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 15
            }}
          >
            <Package size={18} /> Orders ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab("addresses")}
            style={{
              padding: "10px 18px",
              border: "none",
              background: "none",
              borderBottom: activeTab === "addresses" ? "2px solid #1a1612" : "2px solid transparent",
              fontWeight: activeTab === "addresses" ? 600 : 400,
              color: activeTab === "addresses" ? "#1a1612" : "#786f63",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 15
            }}
          >
            <MapPin size={18} /> Saved Addresses ({addresses.length})
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "orders" && (
          <div>
            {orders.length === 0 ? (
              <div style={{ background: "#ffffff", padding: 48, textAlign: "center", borderRadius: 12, border: "1px solid #e8e2d9" }}>
                <Package size={42} style={{ color: "#c2b8aa", marginBottom: 12 }} />
                <h3 style={{ margin: 0, fontWeight: 500, color: "#2c251e" }}>
                  {searched ? "No orders found for this search" : "Enter your email above to view order history"}
                </h3>
                <p style={{ color: "#786f63", fontSize: 14, marginTop: 6, marginBottom: 20 }}>
                  Need to place a new order?
                </p>
                <Link
                  href="/shop"
                  style={{
                    backgroundColor: "#1a1612",
                    color: "#fff",
                    padding: "10px 20px",
                    borderRadius: 6,
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 500
                  }}
                >
                  Explore Shop
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {orders.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      background: "#ffffff",
                      borderRadius: 12,
                      border: "1px solid #e8e2d9",
                      padding: 24,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f0eae1", paddingBottom: 16, marginBottom: 16 }}>
                      <div>
                        <span style={{ fontSize: 13, color: "#8c8275", display: "block" }}>Order ID</span>
                        <span style={{ fontSize: 16, fontWeight: 600, color: "#1a1612" }}>#{o.orderNumber || o.id}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: 13, color: "#8c8275", display: "block" }}>Order Date</span>
                        <span style={{ fontSize: 14, color: "#2c251e" }}>{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: 13, color: "#8c8275", display: "block" }}>Total Amount</span>
                        <span style={{ fontSize: 16, fontWeight: 600, color: "#1a1612" }}>₹{o.totalAmount?.toLocaleString("en-IN")}</span>
                      </div>
                      <div>
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            backgroundColor: o.orderStatus === "delivered" ? "#e6f4ea" : o.orderStatus === "shipped" ? "#e8f0fe" : "#fff8e1",
                            color: o.orderStatus === "delivered" ? "#137333" : o.orderStatus === "shipped" ? "#1a73e8" : "#b06000"
                          }}
                        >
                          {o.orderStatus || "Processing"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {o.items?.map((item: any, idx: number) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {item.image && (
                              <img src={item.image} alt={item.name} style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover" }} />
                            )}
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 14, color: "#2c251e" }}>{item.name}</div>
                              <div style={{ fontSize: 12, color: "#8c8275" }}>Qty: {item.quantity} | ₹{item.price}</div>
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1612" }}>
                            ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "addresses" && (
          <div>
            {addresses.length === 0 ? (
              <div style={{ background: "#ffffff", padding: 48, textAlign: "center", borderRadius: 12, border: "1px solid #e8e2d9" }}>
                <MapPin size={42} style={{ color: "#c2b8aa", marginBottom: 12 }} />
                <h3 style={{ margin: 0, fontWeight: 500, color: "#2c251e" }}>No saved addresses found</h3>
                <p style={{ color: "#786f63", fontSize: 14, marginTop: 6 }}>
                  Addresses are automatically saved when you place an order.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {addresses.map((addr, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#ffffff",
                      borderRadius: 12,
                      border: "1px solid #e8e2d9",
                      padding: 20,
                      position: "relative"
                    }}
                  >
                    {addr.isDefault && (
                      <span
                        style={{
                          position: "absolute",
                          top: 16,
                          right: 16,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: "#f5eee6",
                          color: "#8c5e2b",
                          padding: "2px 8px",
                          borderRadius: 4,
                          textTransform: "uppercase"
                        }}
                      >
                        Default Address
                      </span>
                    )}
                    <h4 style={{ margin: "0 0 8px 0", fontSize: 15, fontWeight: 600, color: "#1a1612" }}>
                      {addr.fullName || "Shipping Address"}
                    </h4>
                    <p style={{ fontSize: 13, color: "#554e44", margin: 0, lineHeight: 1.5 }}>
                      {addr.street}<br />
                      {addr.landmark && `${addr.landmark}, `}{addr.city}, {addr.state} - {addr.pincode}<br />
                      Phone: {addr.phone}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
