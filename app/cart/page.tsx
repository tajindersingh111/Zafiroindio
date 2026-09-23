"use client";
import { useState } from "react";
import Link from "next/link";
import { X, Heart, Minus, Plus, Truck, ShieldCheck, RotateCcw, Tag, CheckCircle2, AlertCircle } from "lucide-react";
import { useStore, AVAILABLE_COUPONS } from "@/components/StoreProvider";
import SmartRecommendations from "@/components/site/SmartRecommendations";

export default function Cart() {
  const {
    cart,
    wishlist,
    subtotal,
    setQty,
    remove,
    toggleWish,
    appliedCoupon,
    discountPercent,
    applyCoupon,
    removeCoupon
  } = useStore();

  const [couponInput, setCouponInput] = useState("");
  const [couponMessage, setCouponMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const shipping = subtotal >= 999 || subtotal === 0 ? 0 : 99;
  const discount = Math.round((subtotal * discountPercent) / 100);
  const total = Math.max(0, subtotal - discount + shipping);
  const freeShippingThreshold = 999;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponMessage(null);
    const res = applyCoupon(couponInput);
    if (res.success) {
      setCouponMessage({ type: "success", text: res.message });
      setCouponInput("");
    } else {
      setCouponMessage({ type: "error", text: res.message });
    }
  };

  return (
    <main>
      <div className="container section">
        <div className="breadcrumb">
          <Link href="/">Home</Link> / <span>Cart</span>
        </div>

        <h1 className="serif" style={{ fontSize: 36, marginBottom: 28 }}>
          Your Cart {cart.length > 0 && `(${cart.reduce((a, x) => a + x.qty, 0)} items)`}
        </h1>

        {!cart.length ? (
          <div className="empty">
            <h2 className="serif" style={{ marginBottom: 12 }}>Your cart is waiting for something beautiful.</h2>
            <p style={{ marginBottom: 24, color: "var(--muted)" }}>Browse our collection of premium bedsheets.</p>
            <Link className="btn gold" href="/shop">Continue Shopping</Link>
          </div>
        ) : (
          <div className="cartLayout">
            {/* Cart Items */}
            <div>
              {/* Free Shipping Progress */}
              <div style={{ border: "1px solid var(--line)", padding: "16px 18px", marginBottom: 20, background: "#fff" }}>
                {shipping === 0 ? (
                  <strong style={{ fontSize: 13, color: "var(--success)", display: "flex", alignItems: "center", gap: 6 }}>
                    🎉 Yay! You get <span style={{ color: "var(--gold-dark)" }}>FREE shipping!</span>
                  </strong>
                ) : (
                  <strong style={{ fontSize: 13 }}>
                    You're <span style={{ color: "var(--gold-dark)" }}>₹{(freeShippingThreshold - subtotal).toLocaleString("en-IN")}</span> away from <span style={{ color: "var(--gold-dark)" }}>FREE shipping!</span>
                  </strong>
                )}
                <div className="progress" style={{ marginTop: 10, marginBottom: 0 }}>
                  <span style={{ width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%` }} />
                </div>
              </div>

              {/* Items */}
              {cart.map(x => (
                <div
                  className="cartItem"
                  key={`${x.product.slug}-${x.size}-${x.color}`}
                >
                  <img src={x.product.images[0]} alt={x.product.name} />

                  <div>
                    <Link href={`/products/${x.product.slug}`} style={{ fontWeight: 700, fontSize: 14 }}>
                      {x.product.name}
                    </Link>
                    <p style={{ fontSize: 11, color: "var(--muted)", margin: "4px 0 8px" }}>
                      {x.size && `${x.size}`}
                      {x.size && x.color && " · "}
                      {x.color}
                    </p>
                    <button
                      className="iconbtn"
                      onClick={() => {
                        remove(x.product.slug, x.size, x.color);
                        if (!wishlist.includes(x.product.slug)) {
                          toggleWish(x.product.slug);
                        }
                      }}
                      style={{ fontSize: 11, color: "var(--muted)", gap: 5 }}
                    >
                      <Heart size={13} /> Move to Wishlist
                    </button>
                  </div>

                  <div className="cartPrice" style={{ textAlign: "center" }}>
                    <strong style={{ fontSize: 15 }}>₹{x.product.price.toLocaleString("en-IN")}</strong>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>each</div>
                  </div>

                  <div className="cartQty qty">
                    <button onClick={() => setQty(x.product.slug, x.qty - 1, x.size, x.color)} aria-label="Decrease"><Minus size={12} /></button>
                    <span>{x.qty}</span>
                    <button onClick={() => setQty(x.product.slug, x.qty + 1, x.size, x.color)} aria-label="Increase"><Plus size={12} /></button>
                  </div>

                  <button
                    className="iconbtn"
                    onClick={() => remove(x.product.slug, x.size, x.color)}
                    aria-label="Remove item"
                    style={{ color: "var(--muted)" }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              {/* Delivery benefits */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 20, borderTop: "1px solid var(--line)", paddingTop: 20 }}>
                {[
                  { icon: <Truck size={16} />, title: "Free Shipping", sub: "Orders above ₹999" },
                  { icon: <RotateCcw size={16} />, title: "Easy Returns", sub: "Within 7 days" },
                  { icon: <ShieldCheck size={16} />, title: "Secure Payments", sub: "Safe & encrypted" },
                ].map(b => (
                  <div key={b.title} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 12px", border: "1px solid var(--line)" }}>
                    <span style={{ color: "var(--gold-dark)", flexShrink: 0, marginTop: 2 }}>{b.icon}</span>
                    <div>
                      <strong style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, display: "block" }}>{b.title}</strong>
                      <span style={{ fontSize: 10.5, color: "var(--muted)", display: "block", marginTop: 2 }}>{b.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <aside className="cartSummary">
              <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 16px", paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
                Order Summary
              </h3>

              <div className="summaryLine">
                <span style={{ color: "var(--muted)" }}>Subtotal</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>

              {discount > 0 && (
                <div className="summaryLine">
                  <span style={{ color: "var(--danger)" }}>Discount ({appliedCoupon})</span>
                  <span style={{ color: "var(--danger)" }}>−₹{discount.toLocaleString("en-IN")}</span>
                </div>
              )}

              <div className="summaryLine">
                <span style={{ color: "var(--muted)" }}>Shipping</span>
                <span style={{ color: shipping === 0 ? "var(--success)" : "var(--ink)", fontWeight: 700 }}>
                  {shipping === 0 ? "FREE" : `₹${shipping}`}
                </span>
              </div>

              {/* Coupon Code Form */}
              <div style={{ margin: "16px 0", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "14px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>
                  <Tag size={14} style={{ color: "var(--gold-dark)" }} /> Apply Coupon / Promo Code
                </div>

                {!appliedCoupon ? (
                  <>
                    <form onSubmit={handleApplyCoupon} style={{ display: "flex", gap: 0 }}>
                      <input
                        type="text"
                        placeholder="Enter coupon code (e.g. WELCOME10)"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        style={{
                          flex: 1,
                          border: "1.5px solid var(--line)",
                          borderRight: 0,
                          padding: "9px 12px",
                          fontSize: 12,
                          outline: "none",
                          textTransform: "uppercase"
                        }}
                      />
                      <button
                        type="submit"
                        style={{
                          border: 0,
                          background: "var(--ink)",
                          color: "#fff",
                          padding: "9px 16px",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.5px",
                          textTransform: "uppercase",
                          cursor: "pointer"
                        }}
                      >
                        Apply
                      </button>
                    </form>

                    {/* Quick Select Chips */}
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                        Available Coupons (Click to Apply):
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {AVAILABLE_COUPONS.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setCouponInput(c.code);
                              const res = applyCoupon(c.code);
                              if (res.success) {
                                setCouponMessage({ type: "success", text: res.message });
                                setCouponInput("");
                              } else {
                                setCouponMessage({ type: "error", text: res.message });
                              }
                            }}
                            style={{
                              border: "1px dashed var(--gold-dark)",
                              background: "#faf6f0",
                              color: "var(--gold-dark)",
                              padding: "4px 8px",
                              fontSize: 10.5,
                              fontWeight: 700,
                              borderRadius: 4,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4
                            }}
                          >
                            <Tag size={10} /> {c.code} ({c.pct}% OFF)
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#f0faf0", border: "1px solid #a8d5a8", fontSize: 12, color: "var(--success)", borderRadius: 4 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                      <CheckCircle2 size={15} /> Code <strong>{appliedCoupon}</strong> Applied ({discountPercent}% OFF)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        removeCoupon();
                        setCouponMessage(null);
                        setCouponInput("");
                      }}
                      style={{ border: 0, background: "none", color: "var(--danger)", fontSize: 11, textDecoration: "underline", marginLeft: "auto", cursor: "pointer", fontWeight: 700 }}
                    >
                      Remove
                    </button>
                  </div>
                )}

                {couponMessage && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11.5,
                    marginTop: 8,
                    color: couponMessage.type === "success" ? "var(--success)" : "var(--danger)"
                  }}>
                    {couponMessage.type === "success" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                    {couponMessage.text}
                  </div>
                )}
              </div>

              <div className="summaryTotal">
                <div className="summaryLine" style={{ fontWeight: 800, fontSize: 17 }}>
                  <span>Total</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {discount > 0 && (
                <p style={{ fontSize: 11.5, color: "var(--success)", marginTop: 8, fontWeight: 600 }}>
                  🎉 You save ₹{discount.toLocaleString("en-IN")} on this order!
                </p>
              )}

              <Link className="btn gold full" href="/checkout" style={{ marginTop: 20, padding: "15px 22px", fontSize: 13 }}>
                Proceed to Checkout
              </Link>

              <Link href="/shop" style={{ display: "block", textAlign: "center", fontSize: 12, color: "var(--muted)", marginTop: 14, textDecoration: "underline" }}>
                Continue Shopping
              </Link>
            </aside>
          </div>
        )}

        {/* Smart Personalised Recommendations */}
        <SmartRecommendations
          mode="interest"
          title="You Might Also Love"
          subtitle="Based on what you've been browsing — picked just for you."
          maxItems={4}
        />
        <SmartRecommendations
          mode="recent"
          title="Recently Viewed"
          subtitle="Continue exploring where you left off."
          maxItems={4}
        />
      </div>
    </main>
  );
}
