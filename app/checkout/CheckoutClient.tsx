"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2, Truck, BadgePercent, ShieldCheck, Wallet, Banknote, X } from "lucide-react";
import { useStore } from "@/components/StoreProvider";
import { useAuth } from "@/components/AuthProvider";
import { img, fallbackToOriginal } from "@/lib/img";
import { INDIAN_STATES } from "@/lib/checkout/states";
import { loadRazorpaySdk, openRazorpayCheckout, preloadRazorpaySdk } from "@/lib/checkout/razorpay-launch";
import { clearBuyNow, readBuyNow, type BuyNowItem } from "@/lib/checkout/buy-now";

type PaymentMethod = "razorpay" | "cod";

interface QuoteLine {
  productId: string;
  name: string;
  image?: string;
  quantity: number;
  price: number;
  mrp: number;
  total: number;
  size?: string;
  color?: string;
}

interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  savings: number;
  discount: number;
  coupon: { code: string; discount: number } | null;
  couponError: string | null;
  shippingCost: number;
  codFee: number;
  isFreeShipping: boolean;
  freeShippingRemaining: number;
  freeShippingThreshold: number;
  tax: number;
  total: number;
  codAvailable: boolean;
  codUnavailableReason?: string;
}

const EMPTY_ADDRESS = {
  firstName: "",
  lastName: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  phone: "",
  email: "",
};

type AddressForm = typeof EMPTY_ADDRESS;

const rupees = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  border: "1px solid var(--line)",
  borderRadius: 8,
  fontSize: 14.5,
  background: "#fff",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".05em",
  textTransform: "uppercase",
  marginBottom: 6,
  color: "var(--muted)",
};

export default function CheckoutClient() {
  const router = useRouter();
  const params = useSearchParams();
  const isBuyNow = params.get("mode") === "buy-now";
  const { cart, clearCart, cartReady } = useStore();
  const { customer, loading: authLoading } = useAuth();

  // "Buy it now" checks out one stashed line and leaves the cart alone.
  const [buyNow, setBuyNow] = useState<BuyNowItem[] | null>(null);
  const [buyNowReady, setBuyNowReady] = useState(!isBuyNow);
  useEffect(() => {
    if (!isBuyNow) return;
    setBuyNow(readBuyNow());
    setBuyNowReady(true);
  }, [isBuyNow]);

  const [address, setAddress] = useState<AddressForm>(EMPTY_ADDRESS);
  const [prefilled, setPrefilled] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("razorpay");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [onlineAvailable, setOnlineAvailable] = useState(true);
  const [quoting, setQuoting] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const inflight = useRef(false);

  const items = useMemo(
    () => buyNow ?? cart.map((x) => ({ productId: x.product.slug, qty: x.qty, size: x.size, color: x.color })),
    [buyNow, cart]
  );
  const ready = cartReady && buyNowReady;
  const hasLines = items.length > 0;

  useEffect(() => preloadRazorpaySdk(), []);

  // An empty cart has nothing to check out — but only once the cart has actually been read back
  // from localStorage, otherwise this fires on the first render and bounces everyone to /cart.
  useEffect(() => {
    if (ready && !hasLines && !placing) router.replace("/cart");
  }, [ready, hasLines, placing, router]);

  // Prefill from the signed-in shopper's saved address, once.
  useEffect(() => {
    if (prefilled || authLoading || !customer) return;
    const saved = customer.shipping;
    setAddress((current) => ({
      ...current,
      firstName: saved?.firstName || customer.firstName || "",
      lastName: saved?.lastName || customer.lastName || "",
      address1: saved?.address1 || "",
      address2: saved?.address2 || "",
      city: saved?.city || "",
      state: saved?.state || "",
      postalCode: saved?.postalCode || "",
      country: saved?.country || "India",
      phone: saved?.phone || customer.phone || "",
      email: saved?.email || customer.email || "",
    }));
    setPrefilled(true);
  }, [customer, authLoading, prefilled]);

  const refreshQuote = useCallback(
    async (coupon: string, paymentMethod: PaymentMethod) => {
      if (!items.length) return;
      setQuoting(true);
      try {
        const res = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items, couponCode: coupon || undefined, paymentMethod }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "We could not price your cart.");
          setQuote(null);
          return;
        }
        setError("");
        setQuote(data.quote);
        setOnlineAvailable(data.onlinePaymentAvailable !== false);
        // The server may refuse COD for this cart; follow its decision.
        if (!data.quote.codAvailable && paymentMethod === "cod") setMethod("razorpay");
        if (data.quote.couponError) setAppliedCoupon("");
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setQuoting(false);
      }
    },
    [items]
  );

  useEffect(() => {
    void refreshQuote(appliedCoupon, method);
  }, [refreshQuote, appliedCoupon, method]);

  function set<K extends keyof AddressForm>(key: K, value: AddressForm[K]) {
    setAddress((a) => ({ ...a, [key]: value }));
    setFieldErrors((e) => (e[key] ? { ...e, [key]: "" } : e));
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!address.firstName.trim()) errors.firstName = "Required";
    if (address.address1.trim().length < 5) errors.address1 = "Enter the full address";
    if (address.city.trim().length < 2) errors.city = "Required";
    if (!address.state) errors.state = "Select a state";
    if (!/^[1-9]\d{5}$/.test(address.postalCode)) errors.postalCode = "6-digit PIN";
    if (!/^[6-9]\d{9}$/.test(address.phone)) errors.phone = "10-digit mobile";
    if (address.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address.email)) errors.email = "Invalid e-mail";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("Please correct the highlighted fields.");
      return false;
    }
    return true;
  }

  /** Clear whichever basket this checkout came from. */
  function finishCart() {
    if (buyNow) clearBuyNow();
    else clearCart();
  }

  async function placeOrder() {
    if (inflight.current || !quote) return;
    if (!validate()) return;

    inflight.current = true;
    setPlacing(true);
    setError("");

    try {
      // Load the payment window while our server starts the checkout.
      const [res] = await Promise.all([
        fetch("/api/checkout/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items,
            shipping: { ...address, email: address.email || undefined, address2: address.address2 || undefined },
            couponCode: appliedCoupon || undefined,
            paymentMethod: method,
            source: buyNow ? "buy-now" : "cart",
          }),
        }),
        method === "razorpay" ? loadRazorpaySdk().catch(() => undefined) : Promise.resolve(undefined),
      ]);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "We could not place your order. Please try again.");

      // ── Cash on delivery: already placed ──
      if (data.mode === "cod") {
        finishCart();
        router.replace(data.redirectTo || `/order-success?ref=${data.ref}`);
        return;
      }

      // ── Online: open Razorpay ──
      await loadRazorpaySdk();
      const outcome = await openRazorpayCheckout({
        keyId: data.keyId,
        orderId: data.razorpayOrderId,
        amount: data.amount,
        currency: data.currency || "INR",
        name: "Zafiro Indio",
        description: `Order total ${rupees(data.total)}`,
        prefill: data.prefill,
        notes: { ref: data.ref },
      });

      if (outcome.status === "dismissed") {
        // Tell the server so the pending session isn't left dangling; no order was created.
        void fetch("/api/checkout/verify", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ref: data.ref }),
        });
        setError("Payment cancelled. Your cart is safe — you can try again.");
        return;
      }

      if (outcome.status === "failed") {
        setError(outcome.message);
        return;
      }

      const verifyRes = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: data.ref,
          razorpayOrderId: outcome.handshake.razorpay_order_id,
          razorpayPaymentId: outcome.handshake.razorpay_payment_id,
          signature: outcome.handshake.razorpay_signature,
        }),
      });
      const verified = await verifyRes.json().catch(() => ({}));

      if (!verifyRes.ok) {
        // The money may well have left: never tell the shopper to just pay again.
        setError(
          verified.error ||
            "We could not confirm your payment. If money was deducted, please contact us with your payment id before paying again."
        );
        return;
      }

      finishCart();
      router.replace(verified.redirectTo || `/order-success?ref=${data.ref}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      inflight.current = false;
      setPlacing(false);
    }
  }

  if (!ready || !hasLines) return null;

  const codDisabled = !quote?.codAvailable;

  return (
    <main className="blockprint-bg">
      <div className="container section">
        <div className="breadcrumb" style={{ marginBottom: 14 }}>
          <Link href="/">Home</Link> / <Link href="/cart">Cart</Link> / <span>Checkout</span>
        </div>

        <h1 className="serif" style={{ fontSize: "clamp(28px, 4.5vw, 40px)", marginBottom: 6 }}>
          Checkout
        </h1>
        <div className="ornament" style={{ justifyContent: "flex-start", margin: "6px 0 26px" }}>
          <i />
        </div>

        {!authLoading && !customer && (
          <div className="lux-card" style={{ padding: "14px 18px", marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13.5 }}>Signing in saves your address and keeps all your orders in one place.</span>
            <Link className="btn" href="/login?next=/checkout" style={{ padding: "9px 18px", fontSize: 11.5 }}>
              Sign in with WhatsApp
            </Link>
          </div>
        )}

        <div className="cartLayout">
          {/* ───────────────── Address + payment ───────────────── */}
          <div>
            <div className="lux-card" style={{ padding: "24px 22px", marginBottom: 20 }}>
              <h2 className="serif" style={{ fontSize: 22, marginBottom: 18 }}>
                Delivery address
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="First name" error={fieldErrors.firstName}>
                  <input style={inputStyle} value={address.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" />
                </Field>
                <Field label="Last name" error={fieldErrors.lastName}>
                  <input style={inputStyle} value={address.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" />
                </Field>
              </div>

              <div style={{ marginTop: 14 }}>
                <Field label="House / flat, street" error={fieldErrors.address1}>
                  <input style={inputStyle} value={address.address1} onChange={(e) => set("address1", e.target.value)} autoComplete="address-line1" />
                </Field>
              </div>

              <div style={{ marginTop: 14 }}>
                <Field label="Area, landmark (optional)" error={fieldErrors.address2}>
                  <input style={inputStyle} value={address.address2} onChange={(e) => set("address2", e.target.value)} autoComplete="address-line2" />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                <Field label="PIN code" error={fieldErrors.postalCode}>
                  <input
                    style={inputStyle}
                    inputMode="numeric"
                    maxLength={6}
                    value={address.postalCode}
                    onChange={(e) => set("postalCode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                    autoComplete="postal-code"
                  />
                </Field>
                <Field label="City" error={fieldErrors.city}>
                  <input style={inputStyle} value={address.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" />
                </Field>
              </div>

              <div style={{ marginTop: 14 }}>
                <Field label="State" error={fieldErrors.state}>
                  <select style={inputStyle} value={address.state} onChange={(e) => set("state", e.target.value)} autoComplete="address-level1">
                    <option value="">Select a state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                <Field label="Mobile number" error={fieldErrors.phone}>
                  <input
                    style={inputStyle}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="98765 43210"
                    value={address.phone}
                    onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    autoComplete="tel-national"
                  />
                </Field>
                <Field label="E-mail (for the invoice)" error={fieldErrors.email}>
                  <input style={inputStyle} type="email" value={address.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
                </Field>
              </div>
            </div>

            <div className="lux-card" style={{ padding: "24px 22px" }}>
              <h2 className="serif" style={{ fontSize: 22, marginBottom: 18 }}>
                Payment
              </h2>

              <PaymentOption
                selected={method === "razorpay"}
                disabled={!onlineAvailable}
                onSelect={() => setMethod("razorpay")}
                icon={<Wallet size={18} />}
                title="Pay online"
                subtitle={onlineAvailable ? "UPI, cards, net banking and wallets — secured by Razorpay" : "Temporarily unavailable"}
              />

              <PaymentOption
                selected={method === "cod"}
                disabled={codDisabled}
                onSelect={() => setMethod("cod")}
                icon={<Banknote size={18} />}
                title="Cash on Delivery"
                subtitle={
                  codDisabled
                    ? quote?.codUnavailableReason || "Not available for this order"
                    : quote?.codFee
                      ? `A handling fee of ${rupees(quote.codFee)} applies`
                      : "Pay the courier when it arrives"
                }
              />

              <p style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "var(--muted)", fontSize: 11.5, marginTop: 18, lineHeight: 1.6 }}>
                <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>We never see or store your card details. Payments are handled entirely by Razorpay.</span>
              </p>
            </div>
          </div>

          {/* ───────────────── Summary ───────────────── */}
          <aside>
            <div className="lux-card" style={{ padding: "22px 20px", position: "sticky", top: 90 }}>
              <h2 className="serif" style={{ fontSize: 20, marginBottom: 16 }}>
                Order summary
              </h2>

              <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
                {(quote?.lines ?? []).map((line) => (
                  <div key={`${line.productId}-${line.size}-${line.color}`} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {line.image && (
                      <img
                        src={img(line.image, 128)}
                        onError={fallbackToOriginal(line.image)}
                        alt={line.name}
                        width={48}
                        height={60}
                        loading="lazy"
                        decoding="async"
                        style={{ width: 48, height: 60, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, lineHeight: 1.3, margin: 0 }}>{line.name}</p>
                      <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "3px 0 0" }}>
                        {[line.size, line.color].filter(Boolean).join(" · ")}
                        {[line.size, line.color].filter(Boolean).length ? " · " : ""}Qty {line.quantity}
                      </p>
                    </div>
                    <strong style={{ fontSize: 13 }}>{rupees(line.total)}</strong>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, marginBottom: 16 }}>
                {quote?.coupon ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--success)", fontWeight: 600 }}>
                      <BadgePercent size={14} /> {quote.coupon.code} applied
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon("");
                        setCouponInput("");
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", padding: 2 }}
                      aria-label="Remove coupon"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setAppliedCoupon(couponInput.trim().toUpperCase());
                    }}
                    style={{ display: "flex", gap: 8 }}
                  >
                    <input
                      style={{ ...inputStyle, padding: "10px 12px", fontSize: 13, textTransform: "uppercase" }}
                      placeholder="Coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      aria-label="Coupon code"
                    />
                    <button type="submit" className="btn" style={{ padding: "10px 16px", fontSize: 11.5, whiteSpace: "nowrap" }} disabled={!couponInput.trim() || quoting}>
                      Apply
                    </button>
                  </form>
                )}
                {quote?.couponError && (
                  <p role="alert" style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>
                    {quote.couponError}
                  </p>
                )}
              </div>

              {/* Totals */}
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, display: "grid", gap: 9, fontSize: 13.5 }}>
                <Row label="Subtotal" value={rupees(quote?.subtotal ?? 0)} />
                {!!quote?.savings && <Row label="You save" value={`− ${rupees(quote.savings)}`} positive />}
                {!!quote?.discount && <Row label={`Coupon ${quote.coupon?.code ?? ""}`.trim()} value={`− ${rupees(quote.discount)}`} positive />}
                <Row
                  label="Shipping"
                  value={quote?.isFreeShipping || !quote?.shippingCost ? "Free" : rupees(quote.shippingCost)}
                  positive={quote?.isFreeShipping}
                />
                {!!quote?.codFee && <Row label="COD handling fee" value={rupees(quote.codFee)} />}

                <div style={{ borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 15 }}>Total</strong>
                  <strong className="serif" style={{ fontSize: 24 }}>
                    {quoting && !quote ? "—" : rupees(quote?.total ?? 0)}
                  </strong>
                </div>
              </div>

              {!!quote && !quote.isFreeShipping && quote.freeShippingRemaining > 0 && (
                <p style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 12, color: "var(--muted)", marginTop: 12 }}>
                  <Truck size={13} /> Add {rupees(quote.freeShippingRemaining)} more for free shipping
                </p>
              )}

              <button
                type="button"
                className="btn gold full"
                onClick={placeOrder}
                disabled={placing || quoting || !quote}
                aria-busy={placing}
                style={{ padding: "16px 22px", fontSize: 12.5, marginTop: 20 }}
              >
                {placing ? (
                  <>
                    <Loader2 size={14} className="spin" /> {method === "cod" ? "Placing order…" : "Opening payment…"}
                  </>
                ) : (
                  <>
                    <Lock size={14} /> {method === "cod" ? "Place order" : `Pay ${rupees(quote?.total ?? 0)}`}
                  </>
                )}
              </button>

              {error && (
                <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 14, lineHeight: 1.55 }}>
                  {error}
                </p>
              )}

              <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 14, lineHeight: 1.6 }}>
                By placing this order you agree to our{" "}
                <Link href="/return-policy" style={{ color: "var(--gold-dark)" }}>
                  return &amp; exchange policy
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && (
        <span style={{ display: "block", color: "var(--danger)", fontSize: 11.5, marginTop: 4 }}>{error}</span>
      )}
    </div>
  );
}

function Row({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span style={{ fontWeight: 600, color: positive ? "var(--success)" : undefined }}>{value}</span>
    </div>
  );
}

function PaymentOption({
  selected,
  disabled,
  onSelect,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      aria-pressed={selected}
      style={{
        width: "100%",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        textAlign: "left",
        padding: "15px 16px",
        marginBottom: 10,
        border: `1.5px solid ${selected ? "var(--gold-dark)" : "var(--line)"}`,
        borderRadius: 8,
        background: selected ? "var(--cream)" : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span style={{ color: selected ? "var(--gold-dark)" : "var(--muted)", marginTop: 1 }}>{icon}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{title}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 3, lineHeight: 1.5 }}>{subtitle}</span>
      </span>
      <span
        aria-hidden="true"
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: `1.5px solid ${selected ? "var(--gold-dark)" : "var(--line)"}`,
          background: selected ? "var(--gold-dark)" : "transparent",
          boxShadow: selected ? "inset 0 0 0 3px #fff" : undefined,
          flexShrink: 0,
          marginTop: 2,
        }}
      />
    </button>
  );
}
