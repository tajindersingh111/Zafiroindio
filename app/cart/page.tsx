"use client";
import Link from "next/link";
import { X, Heart, Minus, Plus, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { useStore } from "@/components/StoreProvider";
import ShiprocketCheckoutButton from "@/components/ShiprocketCheckoutButton";
import SmartRecommendations from "@/components/site/SmartRecommendations";

const FREE_SHIPPING_FROM = 999;

export default function Cart() {
  const { cart, wishlist, subtotal, setQty, remove, toggleWish } = useStore();
  const count = cart.reduce((a, x) => a + x.qty, 0);
  const remaining = Math.max(0, FREE_SHIPPING_FROM - subtotal);

  return (
    <main className="blockprint-bg">
      <div className="container section">
        <div className="breadcrumb">
          <Link href="/">Home</Link> / <span>Cart</span>
        </div>

        <h1 className="serif" style={{ fontSize: "clamp(32px, 5vw, 46px)", marginBottom: 6 }}>
          Your Cart {count > 0 && <span style={{ color: "var(--muted)", fontSize: "0.5em" }}>({count} {count === 1 ? "item" : "items"})</span>}
        </h1>
        <div className="ornament" style={{ justifyContent: "flex-start", margin: "6px 0 28px" }}><i /></div>

        {!cart.length ? (
          <div className="lux-card" style={{ textAlign: "center", padding: "64px 24px" }}>
            <h2 className="serif" style={{ fontSize: 30, marginBottom: 10 }}>Your cart is waiting for something beautiful.</h2>
            <p style={{ marginBottom: 26, color: "var(--muted)" }}>Hand-block printed cotton, made by artisans in Jaipur.</p>
            <Link className="btn gold" href="/shop">Explore the Collection</Link>
          </div>
        ) : (
          <div className="cartLayout">
            <div>
              <div className="lux-card" style={{ padding: "16px 20px", marginBottom: 20 }}>
                {remaining === 0 ? (
                  <strong style={{ fontSize: 13, color: "var(--success)" }}>You've unlocked complimentary shipping.</strong>
                ) : (
                  <strong style={{ fontSize: 13 }}>
                    Add <span style={{ color: "var(--gold-dark)" }}>₹{remaining.toLocaleString("en-IN")}</span> more for complimentary shipping
                  </strong>
                )}
                <div className="progress" style={{ marginTop: 10, marginBottom: 0 }}>
                  <span style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_FROM) * 100)}%` }} />
                </div>
              </div>

              {cart.map((x) => (
                <div className="cartItem" key={`${x.product.slug}-${x.size}-${x.color}`}>
                  <img src={x.product.images[0]} alt={x.product.name} />
                  <div>
                    <Link href={`/products/${x.product.slug}`} className="serif" style={{ fontSize: 20, lineHeight: 1.2 }}>
                      {x.product.name}
                    </Link>
                    <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 8px" }}>
                      {[x.size, x.color].filter(Boolean).join(" · ")}
                    </p>
                    <button
                      className="iconbtn"
                      onClick={() => {
                        remove(x.product.slug, x.size, x.color);
                        if (!wishlist.includes(x.product.slug)) toggleWish(x.product.slug);
                      }}
                      style={{ fontSize: 11.5, color: "var(--muted)", gap: 5 }}
                    >
                      <Heart size={13} /> Save for later
                    </button>
                  </div>
                  <div className="cartPrice" style={{ textAlign: "center" }}>
                    <strong style={{ fontSize: 15 }}>₹{x.product.price.toLocaleString("en-IN")}</strong>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>each</div>
                  </div>
                  <div className="cartQty qty">
                    <button onClick={() => setQty(x.product.slug, x.qty - 1, x.size, x.color)} aria-label="Decrease quantity"><Minus size={12} /></button>
                    <span>{x.qty}</span>
                    <button onClick={() => setQty(x.product.slug, x.qty + 1, x.size, x.color)} aria-label="Increase quantity"><Plus size={12} /></button>
                  </div>
                  <button className="iconbtn" onClick={() => remove(x.product.slug, x.size, x.color)} aria-label="Remove item" style={{ color: "var(--muted)" }}>
                    <X size={16} />
                  </button>
                </div>
              ))}

              <div className="trust-row" style={{ marginTop: 22 }}>
                {[
                  { icon: <Truck size={16} />, title: "Free shipping", sub: `On orders above ₹${FREE_SHIPPING_FROM}` },
                  { icon: <RotateCcw size={16} />, title: "Easy returns", sub: "Within 7 days of delivery" },
                  { icon: <ShieldCheck size={16} />, title: "Secure payment", sub: "UPI, cards, netbanking & COD" },
                ].map((b) => (
                  <div key={b.title} className="lux-card" style={{ display: "flex", gap: 10, padding: "14px 14px" }}>
                    <span style={{ color: "var(--gold-dark)", marginTop: 2 }}>{b.icon}</span>
                    <div>
                      <strong style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.6, display: "block" }}>{b.title}</strong>
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{b.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="cartSummary lux-card">
              <h3 className="serif" style={{ fontSize: 24, margin: "0 0 14px", paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>Order Summary</h3>
              <div className="summaryLine">
                <span style={{ color: "var(--muted)" }}>Subtotal</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="summaryLine">
                <span style={{ color: "var(--muted)" }}>Shipping</span>
                <span style={{ color: "var(--muted)", fontSize: 12.5 }}>Calculated at checkout</span>
              </div>
              <div className="summaryLine" style={{ fontWeight: 700, fontSize: 18, marginTop: 8, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                <span>Estimated total</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "10px 0 18px" }}>
                Coupon codes, delivery address and payment are handled on the next secure step. Final prices are confirmed there.
              </p>
              <ShiprocketCheckoutButton />
              <Link href="/shop" style={{ display: "block", textAlign: "center", fontSize: 12, color: "var(--muted)", marginTop: 14, textDecoration: "underline" }}>
                Continue shopping
              </Link>
            </aside>
          </div>
        )}

        <SmartRecommendations mode="interest" title="You Might Also Love" subtitle="Picked from what you've been browsing." maxItems={4} />
        <SmartRecommendations mode="recent" title="Recently Viewed" subtitle="Pick up where you left off." maxItems={4} />
      </div>
    </main>
  );
}
