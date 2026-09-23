"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User, Package, MapPin, Search, ChevronRight, CheckCircle2, Clock, Truck,
  FileText, RotateCcw, Heart, ShieldCheck, Mail, Phone, ShoppingBag, ExternalLink
} from "lucide-react";
import { useStore } from "@/components/StoreProvider";
import ProductCard from "@/components/ProductCard";
import { products } from "@/lib/data";

export default function CustomerAccountPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "addresses" | "wishlist" | "profile">("orders");
  const [searchQuery, setSearchQuery] = useState("manisha@gmail.com");
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [returnMsg, setReturnMsg] = useState<string | null>(null);

  // Mobile OTP Register & Login State
  const [phoneInput, setPhoneInput] = useState("");
  const [otpStep, setOtpStep] = useState<"PHONE" | "OTP" | "VERIFIED">("PHONE");
  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMsg, setOtpMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

  const { wishlist, add } = useStore();

  // Load saved verified phone on mount
  useEffect(() => {
    try {
      const savedPhone = localStorage.getItem("zafiro_user_phone");
      if (savedPhone) {
        setVerifiedPhone(savedPhone);
        setOtpStep("VERIFIED");
        setSearchQuery(savedPhone);
        fetchCustomerData(savedPhone);
      }
    } catch {}
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneInput.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setOtpMsg({ type: "error", text: "Please enter a valid 10-digit Indian Mobile Number." });
      return;
    }

    setOtpLoading(true);
    setOtpMsg(null);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpStep("OTP");
        setOtpMsg({ type: "success", text: `OTP sent to +91 ${cleanPhone}. (For demo, use default OTP or check console/SMS)` });
      } else {
        setOtpMsg({ type: "error", text: data.error || "Failed to send OTP." });
      }
    } catch {
      setOtpMsg({ type: "error", text: "Unable to send OTP. Please try again." });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneInput.replace(/\D/g, "");
    if (!otpValue || otpValue.trim().length !== 6) {
      setOtpMsg({ type: "error", text: "Please enter a valid 6-digit OTP code." });
      return;
    }

    setOtpLoading(true);
    setOtpMsg(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, otp: otpValue.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVerifiedPhone(cleanPhone);
        setOtpStep("VERIFIED");
        localStorage.setItem("zafiro_user_phone", cleanPhone);
        setOtpMsg({ type: "success", text: "🎉 Account Verified & Logged in successfully!" });
        setSearchQuery(cleanPhone);
        fetchCustomerData(cleanPhone);
      } else {
        setOtpMsg({ type: "error", text: data.error || "Invalid OTP code." });
      }
    } catch {
      setOtpMsg({ type: "error", text: "OTP verification failed." });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleLogoutPhone = () => {
    localStorage.removeItem("zafiro_user_phone");
    setVerifiedPhone(null);
    setOtpStep("PHONE");
    setPhoneInput("");
    setOtpValue("");
    setOtpMsg(null);
  };

  const fetchCustomerData = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setReturnMsg(null);
    try {
      const res = await fetch(`/api/admin/orders`);
      if (res.ok) {
        const data = await res.json();
        const allOrders = data.orders || [];
        const q = query.trim().toLowerCase();
        const filtered = allOrders.filter(
          (o: any) =>
            o.customerEmail?.toLowerCase().includes(q) ||
            o.customerPhone?.includes(q) ||
            o.orderNumber?.toLowerCase().includes(q) ||
            o.id?.toLowerCase().includes(q) ||
            (o.billing?.email && o.billing.email.toLowerCase().includes(q))
        );
        setOrders(filtered);

        // Extract unique shipping addresses from orders
        const addrMap = new Map();
        filtered.forEach((o: any) => {
          const addr = o.shipping || o.billing;
          if (addr && addr.address1) {
            const key = `${addr.address1}-${addr.postalCode || addr.pincode}`;
            if (!addrMap.has(key)) {
              addrMap.set(key, {
                fullName: `${addr.firstName || ""} ${addr.lastName || ""}`.trim() || o.customerName,
                street: addr.address1,
                city: addr.city,
                state: addr.state,
                pincode: addr.postalCode || addr.pincode,
                phone: addr.phone || o.customerPhone,
                isDefault: addrMap.size === 0
              });
            }
          }
        });
        setAddresses(Array.from(addrMap.values()));
      }
    } catch (err) {
      console.error("Fetch orders failed:", err);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  // Initial load search if prefilled
  useEffect(() => {
    fetchCustomerData(searchQuery);
  }, []);

  const activeDeliveriesCount = orders.filter(
    (o) => o.orderStatus !== "delivered" && o.orderStatus !== "cancelled"
  ).length;

  const getStepProgress = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "delivered") return 5;
    if (s === "out for delivery" || s === "out_for_delivery") return 4;
    if (s === "shipped") return 3;
    if (s === "processing" || s === "confirmed") return 2;
    return 1; // Order Placed
  };

  const handleReorder = (orderItems: any[]) => {
    if (!orderItems || !orderItems.length) return;
    orderItems.forEach((item) => {
      const match = products.find((p) => p.slug === item.productId || p.name === item.name);
      if (match) {
        const size = item.attributes?.find((a: any) => a.name === "Size")?.value || match.sizes[0];
        const color = item.attributes?.find((a: any) => a.name === "Color")?.value || match.colors[0];
        for (let i = 0; i < (item.quantity || 1); i++) {
          add(match, size, color);
        }
      }
    });
    alert("Items added to your cart successfully!");
  };

  const handleRequestReturn = (orderNumber: string) => {
    setReturnMsg(`Return request for Order #${orderNumber} submitted successfully! Our support team will contact you within 24 hours for doorstep pickup.`);
  };

  return (
    <main style={{ background: "#faf8f5", minHeight: "100vh", padding: "40px 0 80px" }}>
      <div className="container" style={{ maxWidth: 1060, margin: "0 auto", padding: "0 20px" }}>
        
        {/* ── Top Header Banner ─────────────────────────────────── */}
        <div style={{ background: "#ffffff", border: "1px solid #e7e1d6", borderRadius: 12, padding: "28px 32px", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#a67c37", marginBottom: 4 }}>
                CUSTOMER PORTAL
              </div>
              <h1 className="serif" style={{ fontSize: 32, fontWeight: 500, color: "#1c1917", margin: 0 }}>
                {orders.length > 0 && orders[0].customerName
                  ? `Welcome back, ${orders[0].customerName}`
                  : "My Account & Orders"}
              </h1>
              <p style={{ color: "#666", fontSize: 13.5, margin: "4px 0 0" }}>
                Track your active shipments, view order history, and manage your addresses.
              </p>
            </div>

            {/* Quick Stat Badges */}
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ background: "#faf6f0", border: "1px solid #e2d7c5", padding: "10px 18px", borderRadius: 8, textAlign: "center" }}>
                <span style={{ display: "block", fontSize: 18, fontWeight: 800, color: "#1c1917" }}>{orders.length}</span>
                <span style={{ fontSize: 11, color: "#777", fontWeight: 600 }}>Total Orders</span>
              </div>
              <div style={{ background: "#faf6f0", border: "1px solid #e2d7c5", padding: "10px 18px", borderRadius: 8, textAlign: "center" }}>
                <span style={{ display: "block", fontSize: 18, fontWeight: 800, color: "#a67c37" }}>{activeDeliveriesCount}</span>
                <span style={{ fontSize: 11, color: "#777", fontWeight: 600 }}>Active Shipments</span>
              </div>
              <div style={{ background: "#faf6f0", border: "1px solid #e2d7c5", padding: "10px 18px", borderRadius: 8, textAlign: "center" }}>
                <span style={{ display: "block", fontSize: 18, fontWeight: 800, color: "#1c1917" }}>{wishlist.length}</span>
                <span style={{ fontSize: 11, color: "#777", fontWeight: 600 }}>Wishlist</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile Phone OTP Login / Register Card ───────────────────── */}
        <div style={{ background: "#ffffff", border: "1px solid #c5a028", borderRadius: 12, padding: "24px", marginBottom: 28, boxShadow: "0 4px 20px rgba(18, 25, 44, 0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#12192c", color: "#c5a028", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                <Phone size={18} />
              </div>
              <div>
                <h3 className="serif" style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#12192c" }}>
                  {verifiedPhone ? `Account Verified: +91 ${verifiedPhone}` : "Login / Register with Mobile Number"}
                </h3>
                <p style={{ fontSize: 12, color: "#666", margin: 0 }}>
                  {verifiedPhone ? "You are logged in with SMS OTP verification." : "Enter your 10-digit phone number to receive an instant OTP."}
                </p>
              </div>
            </div>

            {verifiedPhone && (
              <button
                type="button"
                onClick={handleLogoutPhone}
                style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
              >
                Logout Phone
              </button>
            )}
          </div>

          {otpMsg && (
            <div style={{ padding: "10px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, marginBottom: 14, background: otpMsg.type === "success" ? "#eef7ee" : "#fdf2f0", border: otpMsg.type === "success" ? "1px solid #c3e6c3" : "1px solid #e8c5be", color: otpMsg.type === "success" ? "#2e7d32" : "#c83232" }}>
              {otpMsg.text}
            </div>
          )}

          {otpStep === "PHONE" && (
            <form onSubmit={handleSendOtp} style={{ display: "flex", gap: 10, maxWidth: 500 }}>
              <div style={{ display: "flex", flex: 1, border: "1px solid #d4cdbf", borderRadius: 6, overflow: "hidden" }}>
                <span style={{ background: "#f4eee4", padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#12192c", borderRight: "1px solid #d4cdbf" }}>
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  placeholder="Enter 10-digit mobile number (e.g. 9876543210)"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  style={{ flex: 1, padding: "10px 14px", border: "none", outline: "none", fontSize: 13 }}
                />
              </div>
              <button
                type="submit"
                disabled={otpLoading || phoneInput.length < 10}
                style={{
                  background: phoneInput.length === 10 ? "#12192c" : "#94a3b8",
                  color: "#c5a028",
                  padding: "10px 20px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  border: "none",
                  cursor: phoneInput.length === 10 ? "pointer" : "not-allowed"
                }}
              >
                {otpLoading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {otpStep === "OTP" && (
            <form onSubmit={handleVerifyOtp} style={{ display: "flex", gap: 10, maxWidth: 500, alignItems: "center" }}>
              <input
                type="text"
                maxLength={6}
                required
                placeholder="Enter 6-digit OTP code"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value)}
                style={{ flex: 1, padding: "10px 14px", border: "1px solid #c5a028", borderRadius: 6, outline: "none", fontSize: 14, fontWeight: 700, letterSpacing: "2px" }}
              />
              <button
                type="submit"
                disabled={otpLoading || otpValue.length !== 6}
                style={{
                  background: "#12192c",
                  color: "#c5a028",
                  padding: "10px 20px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                {otpLoading ? "Verifying..." : "Verify & Login"}
              </button>
              <button
                type="button"
                onClick={() => setOtpStep("PHONE")}
                style={{ background: "none", border: "none", color: "#666", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
              >
                Change Number
              </button>
            </form>
          )}
        </div>

        {/* ── Order Search & Lookup Bar ─────────────────────────── */}
        <div style={{ background: "#ffffff", border: "1px solid #e7e1d6", borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#1c1917", marginBottom: 8 }}>
            Instant Order Lookup (Email, Phone or Order ID)
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Search size={18} style={{ position: "absolute", left: 14, top: 12, color: "#999" }} />
              <input
                type="text"
                placeholder="Enter Email (e.g. manisha@gmail.com), Phone or Order ID (e.g. ZI-84920)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchCustomerData(searchQuery)}
                style={{
                  width: "100%",
                  padding: "10px 14px 10px 42px",
                  borderRadius: 6,
                  border: "1px solid #d4cdbf",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => fetchCustomerData(searchQuery)}
              style={{
                background: "#a67c37",
                color: "#ffffff",
                padding: "10px 22px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.5px",
                border: "none",
                cursor: "pointer"
              }}
            >
              {loading ? "Searching…" : "FIND ORDERS"}
            </button>
          </div>
        </div>

        {/* Return request feedback message banner */}
        {returnMsg && (
          <div style={{ background: "#eef7ee", border: "1px solid #c3e6c3", borderRadius: 8, padding: "14px 18px", marginBottom: 24, fontSize: 13, color: "#2e7d32", display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle2 size={18} />
            {returnMsg}
          </div>
        )}

        {/* ── Navigation Tabs ─────────────────────────────────── */}
        <div style={{ display: "flex", gap: 12, borderBottom: "1px solid #e7e1d6", marginBottom: 28 }}>
          {[
            { id: "orders", label: `Order History & Tracking (${orders.length})`, icon: <Package size={17} /> },
            { id: "addresses", label: `Saved Addresses (${addresses.length})`, icon: <MapPin size={17} /> },
            { id: "wishlist", label: `My Wishlist (${wishlist.length})`, icon: <Heart size={17} /> },
            { id: "profile", label: "Profile & Settings", icon: <User size={17} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: "12px 20px",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.id ? "2.5px solid #a67c37" : "2.5px solid transparent",
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? "#1c1917" : "#777",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13.5
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: ORDERS HISTORY & LIVE TRACKING ────────────── */}
        {activeTab === "orders" && (
          <div>
            {orders.length === 0 ? (
              <div style={{ background: "#ffffff", border: "1px solid #e7e1d6", borderRadius: 12, padding: "60px 20px", textAlign: "center" }}>
                <Package size={48} style={{ color: "#c5bcae", marginBottom: 16 }} />
                <h3 className="serif" style={{ fontSize: 24, margin: "0 0 8px", color: "#1c1917" }}>
                  {searched ? "No orders found for this search query" : "Search your email to view order history"}
                </h3>
                <p style={{ color: "#777", fontSize: 13.5, marginBottom: 24 }}>
                  Enter your order email or phone number in the search bar above.
                </p>
                <Link
                  href="/shop"
                  style={{
                    background: "#a67c37",
                    color: "#ffffff",
                    padding: "12px 24px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    textDecoration: "none"
                  }}
                >
                  Explore Shop
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {orders.map((o) => {
                  const step = getStepProgress(o.orderStatus);
                  const isDelivered = (o.orderStatus || "").toLowerCase() === "delivered";

                  return (
                    <div
                      key={o.id}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e7e1d6",
                        borderRadius: 12,
                        padding: "24px 28px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.02)"
                      }}
                    >
                      {/* Top Header info */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f0eae1", paddingBottom: 16, marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                        <div>
                          <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>ORDER ID</span>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#1c1917" }}>#{o.orderNumber || o.id}</div>
                        </div>

                        <div>
                          <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>DATE</span>
                          <div style={{ fontSize: 13, color: "#444" }}>
                            {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        </div>

                        <div>
                          <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>PAYMENT</span>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#1c1917", textTransform: "uppercase" }}>
                            {o.paymentMethod || "UPI"}
                          </div>
                        </div>

                        <div>
                          <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>TOTAL</span>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#1c1917" }}>
                            ₹{(o.total || o.totalAmount || 0).toLocaleString("en-IN")}
                          </div>
                        </div>

                        <div>
                          <span
                            style={{
                              padding: "5px 14px",
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: "0.5px",
                              textTransform: "uppercase",
                              backgroundColor: isDelivered ? "#e6f4ea" : "#fff6e6",
                              color: isDelivered ? "#137333" : "#b06000",
                              border: isDelivered ? "1px solid #b7e1cd" : "1px solid #fce8b2"
                            }}
                          >
                            {o.orderStatus || "Processing"}
                          </span>
                        </div>
                      </div>

                      {/* Live Tracking Stepper */}
                      <div style={{ background: "#faf8f5", border: "1px solid #e7e1d6", borderRadius: 8, padding: "16px 20px", marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917", marginBottom: 14 }}>
                          LIVE SHIPMENT TRACKING
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
                          {[
                            "Order Placed",
                            "Processing",
                            "Shipped",
                            "Out for Delivery",
                            "Delivered"
                          ].map((lbl, idx) => {
                            const isDone = idx + 1 <= step;
                            const isCurrent = idx + 1 === step;
                            return (
                              <div key={lbl} style={{ flex: 1, textAlign: "center", position: "relative", zIndex: 2 }}>
                                <div
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: "50%",
                                    background: isDone ? "#a67c37" : "#ffffff",
                                    border: isDone ? "2px solid #a67c37" : "2px solid #ccc",
                                    color: isDone ? "#ffffff" : "#999",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    margin: "0 auto 6px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                  }}
                                >
                                  {isDone ? <CheckCircle2 size={14} /> : idx + 1}
                                </div>
                                <span style={{ fontSize: 11, color: isCurrent ? "#a67c37" : isDone ? "#1c1917" : "#888", fontWeight: isCurrent ? 700 : 400 }}>
                                  {lbl}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Items List */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                        {o.items?.map((item: any, idx: number) => {
                          const matchedProduct = products.find(p => p.slug === item.productId || p.name === item.name);
                          const imgUrl = item.image || (matchedProduct ? matchedProduct.images[0] : "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=400&q=80");
                          return (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: idx < o.items.length - 1 ? "1px dashed #eee" : "none" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <img
                                  src={imgUrl}
                                  alt={item.name}
                                  style={{ width: 56, height: 56, borderRadius: 6, objectFit: "cover", border: "1px solid #eee" }}
                                />
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 13.5, color: "#1c1917" }}>{item.name}</div>
                                  <div style={{ fontSize: 11.5, color: "#777", marginTop: 2 }}>
                                    Qty: {item.quantity} · ₹{item.price.toLocaleString("en-IN")} each
                                  </div>
                                </div>
                              </div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: "#1c1917" }}>
                                ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Order Action Buttons Footer */}
                      <div style={{ display: "flex", gap: 12, borderTop: "1px solid #f0eae1", paddingTop: 16, flexWrap: "wrap" }}>
                        <Link
                          href={`/admin/orders/${o.id}/invoice`}
                          target="_blank"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            background: "#faf6f0",
                            border: "1px solid #d4cdbf",
                            color: "#1c1917",
                            padding: "8px 16px",
                            fontSize: 11.5,
                            fontWeight: 700,
                            borderRadius: 4,
                            textDecoration: "none"
                          }}
                        >
                          <FileText size={14} color="#a67c37" /> View Invoice
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleReorder(o.items)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            background: "#a67c37",
                            border: 0,
                            color: "#ffffff",
                            padding: "8px 16px",
                            fontSize: 11.5,
                            fontWeight: 700,
                            borderRadius: 4,
                            cursor: "pointer"
                          }}
                        >
                          <RotateCcw size={14} /> Buy Again / Reorder
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRequestReturn(o.orderNumber || o.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            background: "#ffffff",
                            border: "1px solid #d4cdbf",
                            color: "#555",
                            padding: "8px 16px",
                            fontSize: 11.5,
                            fontWeight: 600,
                            borderRadius: 4,
                            cursor: "pointer",
                            marginLeft: "auto"
                          }}
                        >
                          Request Return / Exchange
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: SAVED ADDRESSES ───────────────────────────── */}
        {activeTab === "addresses" && (
          <div>
            {addresses.length === 0 ? (
              <div style={{ background: "#ffffff", border: "1px solid #e7e1d6", borderRadius: 12, padding: "60px 20px", textAlign: "center" }}>
                <MapPin size={48} style={{ color: "#c5bcae", marginBottom: 16 }} />
                <h3 className="serif" style={{ fontSize: 24, margin: "0 0 8px", color: "#1c1917" }}>No saved addresses found</h3>
                <p style={{ color: "#777", fontSize: 13.5 }}>
                  Addresses are automatically saved when you place an order.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                {addresses.map((addr, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e7e1d6",
                      borderRadius: 10,
                      padding: "24px",
                      position: "relative"
                    }}
                  >
                    {addr.isDefault && (
                      <span
                        style={{
                          position: "absolute",
                          top: 18,
                          right: 18,
                          fontSize: 10,
                          fontWeight: 800,
                          backgroundColor: "#faf6f0",
                          color: "#a67c37",
                          border: "1px solid #e2d7c5",
                          padding: "3px 8px",
                          borderRadius: 4,
                          textTransform: "uppercase"
                        }}
                      >
                        Default Address
                      </span>
                    )}
                    <h4 style={{ margin: "0 0 10px 0", fontSize: 15, fontWeight: 700, color: "#1c1917" }}>
                      {addr.fullName || "Shipping Address"}
                    </h4>
                    <p style={{ fontSize: 13, color: "#555", margin: 0, lineHeight: 1.6 }}>
                      {addr.street}<br />
                      {addr.city}, {addr.state} - {addr.pincode}<br />
                      <strong>Phone:</strong> {addr.phone}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: MY WISHLIST ──────────────────────────────── */}
        {activeTab === "wishlist" && (
          <div>
            {wishlist.length === 0 ? (
              <div style={{ background: "#ffffff", border: "1px solid #e7e1d6", borderRadius: 12, padding: "60px 20px", textAlign: "center" }}>
                <Heart size={48} style={{ color: "#c5bcae", marginBottom: 16 }} />
                <h3 className="serif" style={{ fontSize: 24, margin: "0 0 8px", color: "#1c1917" }}>Your wishlist is empty</h3>
                <p style={{ color: "#777", fontSize: 13.5, marginBottom: 20 }}>
                  Save your favorite bedsheets to view them here anytime.
                </p>
                <Link
                  href="/shop"
                  style={{
                    background: "#a67c37",
                    color: "#ffffff",
                    padding: "12px 24px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    textDecoration: "none"
                  }}
                >
                  Explore Shop
                </Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
                {products
                  .filter((p) => wishlist.includes(p.slug))
                  .map((p) => (
                    <ProductCard key={p.slug} p={p} />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: PROFILE & SETTINGS ────────────────────────── */}
        {activeTab === "profile" && <ProfileSettingsTab orders={orders} searchQuery={searchQuery} />}
      </div>
    </main>
  );
}

function ProfileSettingsTab({ orders, searchQuery }: { orders: any[]; searchQuery: string }) {
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("zafiro-customer-profile");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      fullName: orders[0]?.customerName || "Manisha Verma",
      email: searchQuery || "manisha@gmail.com",
      phone: orders[0]?.customerPhone || "9876543210",
      street: orders[0]?.shipping?.address1 || "22, 9th Cross, Sarjapur Road",
      city: orders[0]?.shipping?.city || "Bangalore",
      state: orders[0]?.shipping?.state || "Karnataka",
      pincode: orders[0]?.shipping?.postalCode || "560035",
      emailNotif: true,
      whatsappNotif: true,
      smsNotif: true,
    };
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      localStorage.setItem("zafiro-customer-profile", JSON.stringify(profile));
      setTimeout(() => {
        setSavingProfile(false);
        setProfileMsg({ type: "success", text: "🎉 Profile details and address preferences updated successfully!" });
      }, 300);
    } catch {
      setSavingProfile(false);
      setProfileMsg({ type: "error", text: "Failed to save profile changes." });
    }
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (!newPassword || newPassword.length < 6) {
      setPassMsg({ type: "error", text: "New password must be at least 6 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: "error", text: "New password and Confirm password do not match." });
      return;
    }

    setSavingPass(true);
    setTimeout(() => {
      setSavingPass(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPassMsg({ type: "success", text: "🔒 Your password has been updated successfully!" });
    }, 400);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
      {/* Profile & Personal Info Form */}
      <div style={{ background: "#ffffff", border: "1px solid #e7e1d6", borderRadius: 12, padding: "28px 32px" }}>
        <h3 className="serif" style={{ fontSize: 22, margin: "0 0 6px", color: "#1c1917" }}>Personal Details</h3>
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 24px" }}>
          Update your personal contact details and default shipping address.
        </p>

        {profileMsg && (
          <div style={{ padding: "10px 14px", borderRadius: 6, fontSize: 12.5, fontWeight: 600, marginBottom: 18, background: profileMsg.type === "success" ? "#eef7ee" : "#fdf2f0", border: profileMsg.type === "success" ? "1px solid #c3e6c3" : "1px solid #e8c5be", color: profileMsg.type === "success" ? "#2e7d32" : "#c83232" }}>
            {profileMsg.text}
          </div>
        )}

        <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#1c1917", marginBottom: 6 }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid #d4cdbf", borderRadius: 4, fontSize: 13, outline: "none" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#1c1917", marginBottom: 6 }}>
                Email Address *
              </label>
              <input
                type="email"
                required
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #d4cdbf", borderRadius: 4, fontSize: 13, outline: "none" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#1c1917", marginBottom: 6 }}>
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #d4cdbf", borderRadius: 4, fontSize: 13, outline: "none" }}
              />
            </div>
          </div>

          <div style={{ borderTop: "1px solid #e7e1d6", paddingTop: 18, marginTop: 4 }}>
            <h4 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917", margin: "0 0 12px" }}>
              DEFAULT SHIPPING ADDRESS
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 4 }}>Street Address</label>
                <input
                  type="text"
                  value={profile.street}
                  onChange={(e) => setProfile({ ...profile, street: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #d4cdbf", borderRadius: 4, fontSize: 13, outline: "none" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 4 }}>City</label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #d4cdbf", borderRadius: 4, fontSize: 13, outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 4 }}>State</label>
                  <input
                    type="text"
                    value={profile.state}
                    onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #d4cdbf", borderRadius: 4, fontSize: 13, outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 4 }}>PIN Code</label>
                  <input
                    type="text"
                    value={profile.pincode}
                    onChange={(e) => setProfile({ ...profile, pincode: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #d4cdbf", borderRadius: 4, fontSize: 13, outline: "none" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Communication Preferences */}
          <div style={{ borderTop: "1px solid #e7e1d6", paddingTop: 18 }}>
            <h4 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917", margin: "0 0 12px" }}>
              NOTIFICATIONS & PREFERENCES
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#444", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={profile.emailNotif}
                  onChange={(e) => setProfile({ ...profile, emailNotif: e.target.checked })}
                  style={{ accentColor: "#a67c37", width: 15, height: 15 }}
                />
                Email notifications for order status &amp; exclusive offers
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#444", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={profile.whatsappNotif}
                  onChange={(e) => setProfile({ ...profile, whatsappNotif: e.target.checked })}
                  style={{ accentColor: "#a67c37", width: 15, height: 15 }}
                />
                WhatsApp tracking updates for active shipments
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#444", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={profile.smsNotif}
                  onChange={(e) => setProfile({ ...profile, smsNotif: e.target.checked })}
                  style={{ accentColor: "#a67c37", width: 15, height: 15 }}
                />
                SMS alerts for dispatch &amp; delivery
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            style={{
              marginTop: 10,
              background: "#a67c37",
              color: "#ffffff",
              border: 0,
              padding: "12px 24px",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "1px",
              textTransform: "uppercase",
              borderRadius: 4,
              cursor: "pointer"
            }}
          >
            {savingProfile ? "SAVING CHANGES…" : "SAVE PROFILE CHANGES"}
          </button>
        </form>
      </div>

      {/* Security & Password Update Form */}
      <div style={{ background: "#ffffff", border: "1px solid #e7e1d6", borderRadius: 12, padding: "28px 32px", height: "fit-content" }}>
        <h3 className="serif" style={{ fontSize: 22, margin: "0 0 6px", color: "#1c1917" }}>Security &amp; Password</h3>
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 24px" }}>
          Update your account password to keep your Zafiro profile secure.
        </p>

        {passMsg && (
          <div style={{ padding: "10px 14px", borderRadius: 6, fontSize: 12.5, fontWeight: 600, marginBottom: 18, background: passMsg.type === "success" ? "#eef7ee" : "#fdf2f0", border: passMsg.type === "success" ? "1px solid #c3e6c3" : "1px solid #e8c5be", color: passMsg.type === "success" ? "#2e7d32" : "#c83232" }}>
            {passMsg.text}
          </div>
        )}

        <form onSubmit={handleSavePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#1c1917", marginBottom: 6 }}>
              Current Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid #d4cdbf", borderRadius: 4, fontSize: 13, outline: "none" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#1c1917", marginBottom: 6 }}>
              New Password
            </label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid #d4cdbf", borderRadius: 4, fontSize: 13, outline: "none" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#1c1917", marginBottom: 6 }}>
              Confirm New Password
            </label>
            <input
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid #d4cdbf", borderRadius: 4, fontSize: 13, outline: "none" }}
            />
          </div>

          <button
            type="submit"
            disabled={savingPass}
            style={{
              marginTop: 10,
              background: "#1c1917",
              color: "#ffffff",
              border: 0,
              padding: "12px 24px",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "1px",
              textTransform: "uppercase",
              borderRadius: 4,
              cursor: "pointer"
            }}
          >
            {savingPass ? "UPDATING…" : "UPDATE PASSWORD"}
          </button>
        </form>
      </div>
    </div>
  );
}
