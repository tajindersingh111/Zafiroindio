"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/StoreProvider";
import {
  ShoppingBag, Lock, Truck, CreditCard, ShieldCheck,
  AlertCircle, Tag, CheckCircle2, RotateCcw
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, subtotal, clearCart } = useStore();

  // Form State
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [apartment, setApartment] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("Rajasthan");
  const [postalCode, setPostalCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [deliveryMethod, setDeliveryMethod] = useState("standard");
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);

  // Shipping & Calculation State
  const [shippingFee, setShippingFee] = useState(0);
  const [codFee, setCodFee] = useState(0);
  const [codBlockedError, setCodBlockedError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const discount = couponApplied ? Math.round(subtotal * 0.1) : 0;

  // Dynamic Shipping & COD Rule Evaluation
  useEffect(() => {
    if (cart.length === 0) return;
    fetch("/api/shipping/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((x) => ({
          productId: x.product.slug,
          quantity: x.qty,
          price: x.product.price
        })),
        paymentMethod
      })
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.result) {
          if (!d.result.isAllowed) {
            setCodBlockedError(d.result.error || "COD is not available for an item in your cart.");
            setShippingFee(0);
            setCodFee(0);
          } else {
            setCodBlockedError("");
            setShippingFee(d.result.baseShippingCost || 0);
            setCodFee(d.result.codFee || 0);
          }
        }
      })
      .catch((err) => console.error("Shipping calc failed:", err));
  }, [cart, paymentMethod]);

  const deliveryAddon = deliveryMethod === "express" ? 149 : 0;
  const totalShipping = shippingFee + codFee + deliveryAddon;
  const grandTotal = Math.max(0, subtotal - discount + totalShipping);

  const applyCoupon = () => {
    if (coupon.trim().toUpperCase() === "WELCOME10") {
      setCouponApplied(true);
    } else {
      setErrorMsg("Invalid coupon code. Try WELCOME10.");
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !fullName.trim() || !phone.trim() || !address.trim() || !city.trim() || !postalCode.trim()) {
      setErrorMsg("Please complete all required contact and shipping address fields.");
      return;
    }
    if (codBlockedError && paymentMethod === "cod") {
      setErrorMsg(codBlockedError);
      return;
    }

    setSubmitting(true);
    try {
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0] || "Customer";
      const lastName = nameParts.slice(1).join(" ") || "";
      const fullAddress = apartment ? `${address.trim()}, ${apartment.trim()}` : address.trim();

      const payload = {
        customerName: fullName.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        billing: { firstName, lastName, address1: fullAddress, city: city.trim(), state: stateName, postalCode: postalCode.trim(), country: "India", phone: phone.trim(), email: email.trim() },
        shipping: { firstName, lastName, address1: fullAddress, city: city.trim(), state: stateName, postalCode: postalCode.trim(), country: "India", phone: phone.trim(), email: email.trim() },
        items: cart.map((x) => ({
          productId: x.product.slug,
          name: x.product.name,
          sku: `ZI-${x.product.slug.toUpperCase().slice(0, 8)}`,
          quantity: x.qty,
          price: x.product.price,
          attributes: [
            ...(x.size ? [{ name: "Size", value: x.size }] : []),
            ...(x.color ? [{ name: "Color", value: x.color }] : [])
          ]
        })),
        paymentMethod,
        paymentStatus: paymentMethod === "cod" ? "pending" : "paid",
        discount,
        total: grandTotal
      };

      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to place order. Please try again.");
        setSubmitting(false);
      } else {
        clearCart();
        router.push(`/order-success?orderNumber=${encodeURIComponent(data.order.orderNumber)}&orderId=${data.order.id}`);
      }
    } catch {
      setErrorMsg("An error occurred while communicating with the server.");
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <main className="checkout">
        <div className="container" style={{ maxWidth: 640, textAlign: "center", padding: "80px 0" }}>
          <ShoppingBag size={48} style={{ margin: "0 auto 16px", color: "var(--gold)" }} />
          <h2 className="serif" style={{ fontSize: 32, marginBottom: 10 }}>Your cart is empty</h2>
          <p style={{ color: "var(--muted)", marginBottom: 24 }}>Discover our beautiful bedsheets and add something to your cart.</p>
          <Link href="/shop" className="btn gold">Explore Shop</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout">
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link href="/">Home</Link> / <Link href="/cart">Cart</Link> / <span>Checkout</span>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h1 className="serif" style={{ fontSize: 34, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <Lock size={22} style={{ color: "var(--gold-dark)" }} /> Checkout
          </h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: 13 }}>Secure and simple checkout</p>
        </div>

        <form onSubmit={handlePlaceOrder} className="checkoutGrid">
          {/* ── LEFT COLUMN ──────────────────────────────── */}
          <div>
            {errorMsg && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#fdf2f0", border: "1px solid #e8c5be", marginBottom: 16, fontSize: 13, color: "var(--danger)" }}>
                <AlertCircle size={16} />
                {errorMsg}
              </div>
            )}

            {/* 1. Contact Information */}
            <div className="formSection">
              <h3>1. Contact Information</h3>
              <div className="field full" style={{ marginBottom: 12 }}>
                <label>Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <label className="check">
                <input type="checkbox" checked={newsletter} onChange={e => setNewsletter(e.target.checked)} />
                Keep me updated with offers and new arrivals
              </label>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
                Already have an account? <Link href="/account" style={{ color: "var(--gold-dark)", textDecoration: "underline" }}>Log in</Link>
              </p>
            </div>

            {/* 2. Shipping Address */}
            <div className="formSection">
              <h3>2. Shipping Address</h3>
              <div className="formGrid">
                <div className="field">
                  <label>Full Name *</label>
                  <input type="text" required placeholder="Rahul Sharma" value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
                <div className="field">
                  <label>Phone Number *</label>
                  <input type="tel" required placeholder="+91 9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div className="field full">
                  <label>Address *</label>
                  <input type="text" required placeholder="House No., Street Name, Area" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <div className="field full">
                  <label>Apartment / Suite (optional)</label>
                  <input type="text" placeholder="Apartment, suite, building (optional)" value={apartment} onChange={e => setApartment(e.target.value)} />
                </div>
                <div className="field">
                  <label>City *</label>
                  <input type="text" required placeholder="Jaipur" value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div className="field">
                  <label>PIN Code *</label>
                  <input type="text" required placeholder="302001" value={postalCode} onChange={e => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                </div>
                <div className="field">
                  <label>State *</label>
                  <input type="text" required value={stateName} onChange={e => setStateName(e.target.value)} />
                </div>
              </div>
            </div>

            {/* 3. Delivery Method */}
            <div className="formSection">
              <h3><Truck size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />3. Delivery Method</h3>

              <label
                className={`paymentOption${deliveryMethod === "standard" ? " selected" : ""}`}
                style={{ cursor: "pointer", marginBottom: 8 }}
              >
                <input
                  type="radio"
                  name="delivery"
                  style={{ accentColor: "var(--gold-dark)" }}
                  checked={deliveryMethod === "standard"}
                  onChange={() => setDeliveryMethod("standard")}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Standard Delivery</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>3–5 business days</div>
                </div>
                <span style={{ fontWeight: 800, color: "var(--gold-dark)", fontSize: 13 }}>
                  {shippingFee === 0 ? "FREE" : `₹${shippingFee}`}
                </span>
              </label>

              <label
                className={`paymentOption${deliveryMethod === "express" ? " selected" : ""}`}
                style={{ cursor: "pointer" }}
              >
                <input
                  type="radio"
                  name="delivery"
                  style={{ accentColor: "var(--gold-dark)" }}
                  checked={deliveryMethod === "express"}
                  onChange={() => setDeliveryMethod("express")}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Express Delivery</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>1–2 business days</div>
                </div>
                <span style={{ fontWeight: 800, fontSize: 13 }}>₹149</span>
              </label>
            </div>

            {/* 4. Payment Method */}
            <div className="formSection">
              <h3><CreditCard size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />4. Payment Method</h3>

              {codBlockedError && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#fdf6e8", border: "1px solid #e8d5a0", marginBottom: 10, fontSize: 12, color: "#7a5c10" }}>
                  <AlertCircle size={14} /> {codBlockedError}
                </div>
              )}

              {[
                { id: "upi", label: "UPI / QR", sub: "Google Pay, PhonePe, Paytm" },
                { id: "card", label: "Credit / Debit Card", sub: "Visa, Mastercard, Rupay" },
                { id: "netbanking", label: "Net Banking", sub: "All major banks supported" },
                { id: "cod", label: "Cash on Delivery", sub: codFee > 0 ? `+₹${codFee} handling fee applies` : "Available for this order", disabled: !!codBlockedError },
              ].map(opt => (
                <label
                  key={opt.id}
                  className={`paymentOption${paymentMethod === opt.id ? " selected" : ""}${opt.disabled ? "" : ""}`}
                  style={{ cursor: opt.disabled ? "not-allowed" : "pointer", opacity: opt.disabled ? 0.5 : 1, marginTop: 8 }}
                >
                  <input
                    type="radio"
                    name="pay"
                    value={opt.id}
                    disabled={opt.disabled}
                    checked={paymentMethod === opt.id}
                    onChange={() => setPaymentMethod(opt.id)}
                    style={{ accentColor: "var(--gold-dark)" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{opt.sub}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ── RIGHT COLUMN: Order Summary ───────────────── */}
          <div>
            <div className="orderSummaryCard">
              <h3>Order Summary</h3>

              {/* Items */}
              <div>
                {cart.map((x, idx) => (
                  <div className="summaryItem" key={idx}>
                    <img src={x.product.images[0]} alt={x.product.name} />
                    <div className="info">
                      <div className="iName">{x.product.name}</div>
                      <div className="iVariant">
                        {x.size && `Size: ${x.size}`}
                        {x.size && x.color && " · "}
                        {x.color && `${x.color}`}
                        {" · "}Qty: {x.qty}
                      </div>
                    </div>
                    <div className="iPrice">₹{(x.product.price * x.qty).toLocaleString("en-IN")}</div>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              {!couponApplied ? (
                <div className="couponRow">
                  <input
                    placeholder="Enter coupon code"
                    value={coupon}
                    onChange={e => setCoupon(e.target.value.toUpperCase())}
                  />
                  <button type="button" onClick={applyCoupon}>Apply</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#f0faf0", border: "1px solid #a8d5a8", marginTop: 12, fontSize: 12, color: "var(--success)" }}>
                  <CheckCircle2 size={14} /> WELCOME10 applied — 10% discount!
                </div>
              )}

              {/* Totals */}
              <div style={{ marginTop: 14 }}>
                <div className="summaryLine">
                  <span style={{ color: "var(--muted)" }}>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                {discount > 0 && (
                  <div className="summaryLine">
                    <span style={{ color: "var(--danger)" }}>Discount (WELCOME10)</span>
                    <span style={{ color: "var(--danger)" }}>−₹{discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="summaryLine">
                  <span style={{ color: "var(--muted)" }}>Shipping</span>
                  <span style={{ color: "var(--gold-dark)", fontWeight: 700 }}>
                    {totalShipping === 0 ? "FREE" : `₹${totalShipping}`}
                  </span>
                </div>
                {deliveryMethod === "express" && (
                  <div className="summaryLine" style={{ fontSize: 11, color: "var(--muted)" }}>
                    <span>Express upgrade</span>
                    <span>+₹149</span>
                  </div>
                )}
              </div>

              <div className="summaryTotal">
                <div className="summaryLine" style={{ fontSize: 17, padding: "14px 0 0" }}>
                  <span>Total</span>
                  <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {discount > 0 && (
                <div style={{ fontSize: 12, color: "var(--success)", marginTop: 6, fontWeight: 600 }}>
                  🎉 You're saving ₹{discount.toLocaleString("en-IN")} on this order!
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn gold full"
                style={{ marginTop: 20, padding: "15px 22px", fontSize: 13 }}
              >
                {submitting
                  ? "Placing Order…"
                  : `Place Order · ₹${grandTotal.toLocaleString("en-IN")}`}
              </button>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, fontSize: 11, color: "var(--muted)" }}>
                <ShieldCheck size={14} style={{ color: "var(--success)" }} />
                256-bit SSL secured · Safe &amp; encrypted
              </div>
            </div>

            {/* Trust row */}
            <div className="checkoutTrustRow">
              <div className="trustItem">
                <Lock size={18} className="icon" style={{ margin: "0 auto 6px", color: "var(--gold-dark)" }} />
                <strong>Secure Checkout</strong>
                <span>256-bit encrypted</span>
              </div>
              <div className="trustItem">
                <RotateCcw size={18} className="icon" style={{ margin: "0 auto 6px", color: "var(--gold-dark)" }} />
                <strong>Easy Returns</strong>
                <span>Within 7 days</span>
              </div>
              <div className="trustItem">
                <ShieldCheck size={18} className="icon" style={{ margin: "0 auto 6px", color: "var(--gold-dark)" }} />
                <strong>Quality Assured</strong>
                <span>100% authentic</span>
              </div>
              <div className="trustItem">
                <Truck size={18} className="icon" style={{ margin: "0 auto 6px", color: "var(--gold-dark)" }} />
                <strong>Customer Support</strong>
                <span>Mon–Sat 10AM–7PM</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
