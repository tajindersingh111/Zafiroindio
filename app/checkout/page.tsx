"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/StoreProvider";
import {
  ShoppingBag, Lock, Truck, CreditCard, ShieldCheck,
  AlertCircle, Tag, CheckCircle2, RotateCcw, Check, Info,
  HelpCircle, ChevronRight, Phone, Mail, X, RefreshCw
} from "lucide-react";

interface ValidationErrors {
  email?: string;
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  stateName?: string;
  postalCode?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const {
    cart,
    subtotal,
    clearCart,
    appliedCoupon,
    discountPercent,
    applyCoupon,
    removeCoupon
  } = useStore();

  // Form State
  const [email, setEmail] = useState("manisha@gmail.com");
  const [newsletter, setNewsletter] = useState(true);
  const [fullName, setFullName] = useState("Manisha Verma");
  const [phone, setPhone] = useState("9876543210");
  const [address, setAddress] = useState("22, 9th Cross, Sarjapur Road");
  const [apartment, setApartment] = useState("");
  const [city, setCity] = useState("Bangalore");
  const [postalCode, setPostalCode] = useState("560035");
  const [stateName, setStateName] = useState("Karnataka");
  const [shipDifferent, setShipDifferent] = useState(false);
  const [saveInfo, setSaveInfo] = useState(true);

  const [deliveryMethod, setDeliveryMethod] = useState<"standard" | "express">("standard");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking" | "cod">("upi");
  const [couponInput, setCouponInput] = useState("");

  // Shipping & Calculation State
  const [shippingFee, setShippingFee] = useState(0);
  const [codFee, setCodFee] = useState(0);
  const [codBlockedError, setCodBlockedError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Validation State
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // OTP Verification State
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSentMsg, setOtpSentMsg] = useState("");
  const [devOtpHint, setDevOtpHint] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const discount = Math.round((subtotal * discountPercent) / 100);

  // Auto-apply WELCOME10 coupon if none applied initially
  useEffect(() => {
    if (!appliedCoupon) {
      applyCoupon("WELCOME10");
    }
  }, [appliedCoupon, applyCoupon]);

  // Check if current phone is already verified in localStorage
  useEffect(() => {
    try {
      const verifiedPhone = localStorage.getItem("zafiro_verified_phone");
      const cleanPhone = phone.trim().replace(/\D/g, "");
      if (verifiedPhone && verifiedPhone === cleanPhone) {
        setIsPhoneVerified(true);
      } else {
        setIsPhoneVerified(false);
      }
    } catch {}
  }, [phone]);

  // Resend cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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

  // Auto PIN Code Lookup to autofill City & State
  useEffect(() => {
    const cleanPin = postalCode.trim().replace(/\D/g, "");
    if (cleanPin.length === 6) {
      fetch(`/api/pincode/${cleanPin}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.available) {
            if (data.city) setCity(data.city);
            if (data.state) setStateName(data.state);
          }
        })
        .catch(() => {});
    }
  }, [postalCode]);

  // Validation function
  const validateForm = (): { isValid: boolean; errs: ValidationErrors } => {
    const errs: ValidationErrors = {};
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim().replace(/\D/g, "");
    const cleanPin = postalCode.trim().replace(/\D/g, "");

    if (!cleanEmail) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errs.email = "Please enter a valid email address (e.g. user@example.com).";
    }

    if (!fullName.trim()) {
      errs.fullName = "Full name is required.";
    } else if (fullName.trim().length < 2) {
      errs.fullName = "Please enter your full name.";
    }

    if (!cleanPhone) {
      errs.phone = "Phone number is required.";
    } else if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.phone = "Please enter a valid 10-digit Indian mobile number starting with 6-9.";
    }

    if (!address.trim()) {
      errs.address = "Street address is required.";
    } else if (address.trim().length < 5) {
      errs.address = "Please enter complete street address.";
    }

    if (!city.trim()) {
      errs.city = "City is required.";
    }

    if (!stateName.trim()) {
      errs.stateName = "State is required.";
    }

    if (!cleanPin) {
      errs.postalCode = "PIN code is required.";
    } else if (!/^\d{6}$/.test(cleanPin)) {
      errs.postalCode = "Please enter a valid 6-digit PIN code.";
    }

    return { isValid: Object.keys(errs).length === 0, errs };
  };

  const deliveryAddon = deliveryMethod === "express" ? 149 : 0;
  const totalShipping = shippingFee + (paymentMethod === "cod" ? codFee : 0) + deliveryAddon;
  const grandTotal = Math.max(0, subtotal - discount + totalShipping);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponMsg(null);
    const res = applyCoupon(couponInput);
    if (res.success) {
      setCouponMsg({ type: "success", text: res.message });
      setCouponInput("");
    } else {
      setCouponMsg({ type: "error", text: res.message });
    }
  };

  // Trigger Send OTP Request
  const triggerSendOtp = async () => {
    setOtpLoading(true);
    setOtpError("");
    setOtpSentMsg("");
    setDevOtpHint("");

    const cleanPhone = phone.trim().replace(/\D/g, "");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone })
      });
      const data = await res.json();

      if (res.ok) {
        setOtpSentMsg(`OTP code sent to +91 ${cleanPhone}`);
        if (data.devOtp) {
          setDevOtpHint(data.devOtp);
          setOtpInput(data.devOtp); // Auto-fill in dev mode for smooth demo
        }
        setShowOtpModal(true);
        setResendCooldown(30);
      } else {
        setOtpError(data.error || "Failed to send OTP. Please check mobile number.");
      }
    } catch {
      setOtpError("Network error while sending OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP & Execute Order
  const handleVerifyOtpAndPlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");

    if (!otpInput || otpInput.trim().length !== 6) {
      setOtpError("Please enter 6-digit OTP code.");
      return;
    }

    setOtpLoading(true);
    const cleanPhone = phone.trim().replace(/\D/g, "");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, otp: otpInput.trim() })
      });
      const data = await res.json();

      if (res.ok) {
        setIsPhoneVerified(true);
        try {
          localStorage.setItem("zafiro_verified_phone", cleanPhone);
        } catch {}
        setShowOtpModal(false);
        // Execute place order now
        await executePlaceOrder();
      } else {
        setOtpError(data.error || "Invalid OTP code. Please try again.");
      }
    } catch {
      setOtpError("Network error during OTP verification.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Main Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Mark all fields as touched for inline validation feedback
    setTouched({
      email: true,
      fullName: true,
      phone: true,
      address: true,
      city: true,
      stateName: true,
      postalCode: true
    });

    const { isValid, errs } = validateForm();
    setErrors(errs);

    if (!isValid) {
      setErrorMsg("Please fix the highlighted errors in your contact and shipping details before proceeding.");
      return;
    }

    if (codBlockedError && paymentMethod === "cod") {
      setErrorMsg(codBlockedError);
      return;
    }

    // Check if phone needs OTP verification first
    const cleanPhone = phone.trim().replace(/\D/g, "");
    const verifiedPhone = typeof window !== "undefined" ? localStorage.getItem("zafiro_verified_phone") : null;

    if (!isPhoneVerified && verifiedPhone !== cleanPhone) {
      // Trigger OTP Modal for Login / Mobile Verification
      await triggerSendOtp();
    } else {
      // Directly place order
      await executePlaceOrder();
    }
  };

  // Backend Order Creation API call
  const executePlaceOrder = async () => {
    setSubmitting(true);
    setErrorMsg("");

    try {
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0] || "Customer";
      const lastName = nameParts.slice(1).join(" ") || "";
      const fullAddress = apartment ? `${address.trim()}, ${apartment.trim()}` : address.trim();
      const cleanPhone = phone.trim().replace(/\D/g, "");

      const payload = {
        customerName: fullName.trim(),
        customerEmail: email.trim(),
        customerPhone: cleanPhone,
        billing: { firstName, lastName, address1: fullAddress, city: city.trim(), state: stateName, postalCode: postalCode.trim(), country: "India", phone: cleanPhone, email: email.trim() },
        shipping: { firstName, lastName, address1: fullAddress, city: city.trim(), state: stateName, postalCode: postalCode.trim(), country: "India", phone: cleanPhone, email: email.trim() },
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
        couponCode: appliedCoupon || undefined,
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
      <main style={{ background: "#faf8f5", minHeight: "100vh", padding: "80px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 500, margin: "0 auto", background: "#ffffff", padding: "40px 30px", borderRadius: 12, border: "1px solid #e7e1d6" }}>
          <ShoppingBag size={44} style={{ margin: "0 auto 16px", color: "#a67c37" }} />
          <h2 className="serif" style={{ fontSize: 28, margin: "0 0 10px", color: "#1c1917" }}>Your cart is empty</h2>
          <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>Explore our luxury bedsheet collections to add items to your checkout.</p>
          <Link
            href="/shop"
            style={{
              display: "inline-block",
              background: "#a67c37",
              color: "#ffffff",
              padding: "12px 24px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "1px",
              textTransform: "uppercase",
              borderRadius: 4,
              textDecoration: "none"
            }}
          >
            Explore Shop
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "#faf8f5", minHeight: "100vh", paddingBottom: 80 }}>
      <div className="container" style={{ maxWidth: 1240, margin: "0 auto", padding: "0 20px" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: 12, color: "#888", padding: "20px 0 14px", display: "flex", gap: 6, alignItems: "center" }}>
          <Link href="/" style={{ color: "#888", textDecoration: "none" }}>Home</Link>
          <ChevronRight size={12} color="#aaa" />
          <Link href="/cart" style={{ color: "#888", textDecoration: "none" }}>Cart</Link>
          <ChevronRight size={12} color="#aaa" />
          <span style={{ color: "#333", fontWeight: 500 }}>Checkout</span>
        </nav>

        {/* Page Title & Subtitle */}
        <div style={{ marginBottom: 28 }}>
          <h1
            className="serif"
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: "#1c1917",
              letterSpacing: "0.5px",
              margin: "0 0 4px"
            }}
          >
            CHECKOUT
          </h1>
          <p style={{ fontSize: 13, color: "#66625d", margin: 0 }}>
            Secure and simple checkout
          </p>
        </div>

        <form onSubmit={handleFormSubmit} noValidate style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 36 }}>
          {/* ── LEFT COLUMN: Form Steps ────────────────────────── */}
          <div>
            {errorMsg && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", background: "#fdf2f0", border: "1px solid #e8c5be", borderRadius: 8, marginBottom: 20, fontSize: 13, color: "#c83232", fontWeight: 500 }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. CONTACT INFORMATION */}
            <div style={{ background: "#ffffff", border: "1px solid #e7e1d6", borderRadius: 8, padding: "24px 28px", marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#f4efea", color: "#1c1917", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    1
                  </span>
                  <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917", margin: 0 }}>
                    CONTACT INFORMATION
                  </h2>
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  Already have an account?{" "}
                  <Link href="/account" style={{ color: "#a67c37", fontWeight: 700, textDecoration: "none" }}>
                    Login
                  </Link>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 600 }}>
                  Email address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, email: true }));
                    const { errs } = validateForm();
                    setErrors((prev) => ({ ...prev, email: errs.email }));
                  }}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    border: errors.email && touched.email ? "1px solid #c83232" : "1px solid #d4cdbf",
                    borderRadius: 4,
                    fontSize: 13,
                    outline: "none",
                    color: "#1c1917",
                    backgroundColor: errors.email && touched.email ? "#fff9f9" : "#ffffff"
                  }}
                />
                {errors.email && touched.email && (
                  <span style={{ color: "#c83232", fontSize: 11.5, marginTop: 4, display: "block", fontWeight: 500 }}>
                    {errors.email}
                  </span>
                )}
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#444", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={newsletter}
                  onChange={(e) => setNewsletter(e.target.checked)}
                  style={{ accentColor: "#a67c37", width: 16, height: 16, cursor: "pointer" }}
                />
                Email me with news and exclusive offers
              </label>
            </div>

            {/* 2. SHIPPING ADDRESS */}
            <div style={{ background: "#ffffff", border: "1px solid #e7e1d6", borderRadius: 8, padding: "24px 28px", marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#f4efea", color: "#1c1917", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    2
                  </span>
                  <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917", margin: 0 }}>
                    SHIPPING ADDRESS
                  </h2>
                </div>

                {isPhoneVerified && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#2e7d32", background: "#eef7ee", border: "1px solid #c3e6c3", padding: "3px 8px", borderRadius: 4 }}>
                    <CheckCircle2 size={13} /> Mobile Verified via OTP
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 600 }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (touched.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, fullName: true }))}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      border: errors.fullName && touched.fullName ? "1px solid #c83232" : "1px solid #d4cdbf",
                      borderRadius: 4,
                      fontSize: 13,
                      outline: "none",
                      backgroundColor: errors.fullName && touched.fullName ? "#fff9f9" : "#ffffff"
                    }}
                  />
                  {errors.fullName && touched.fullName && (
                    <span style={{ color: "#c83232", fontSize: 11.5, marginTop: 4, display: "block", fontWeight: 500 }}>
                      {errors.fullName}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 600 }}>
                    Phone Number (10 digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setPhone(val);
                      if (touched.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      border: errors.phone && touched.phone ? "1px solid #c83232" : "1px solid #d4cdbf",
                      borderRadius: 4,
                      fontSize: 13,
                      outline: "none",
                      backgroundColor: errors.phone && touched.phone ? "#fff9f9" : "#ffffff"
                    }}
                  />
                  {errors.phone && touched.phone && (
                    <span style={{ color: "#c83232", fontSize: 11.5, marginTop: 4, display: "block", fontWeight: 500 }}>
                      {errors.phone}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 600 }}>
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="House/Flat No., Building, Street Name"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (touched.address) setErrors((prev) => ({ ...prev, address: undefined }));
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, address: true }))}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    border: errors.address && touched.address ? "1px solid #c83232" : "1px solid #d4cdbf",
                    borderRadius: 4,
                    fontSize: 13,
                    outline: "none",
                    backgroundColor: errors.address && touched.address ? "#fff9f9" : "#ffffff"
                  }}
                />
                {errors.address && touched.address && (
                  <span style={{ color: "#c83232", fontSize: 11.5, marginTop: 4, display: "block", fontWeight: 500 }}>
                    {errors.address}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 500 }}>
                  Apartment, suite, landmark (optional)
                </label>
                <input
                  type="text"
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", border: "1px solid #d4cdbf", borderRadius: 4, fontSize: 13, outline: "none" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 600 }}>
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      if (touched.city) setErrors((prev) => ({ ...prev, city: undefined }));
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, city: true }))}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      border: errors.city && touched.city ? "1px solid #c83232" : "1px solid #d4cdbf",
                      borderRadius: 4,
                      fontSize: 13,
                      outline: "none",
                      backgroundColor: errors.city && touched.city ? "#fff9f9" : "#ffffff"
                    }}
                  />
                  {errors.city && touched.city && (
                    <span style={{ color: "#c83232", fontSize: 11.5, marginTop: 4, display: "block", fontWeight: 500 }}>
                      {errors.city}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 600 }}>
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={stateName}
                    onChange={(e) => {
                      setStateName(e.target.value);
                      if (touched.stateName) setErrors((prev) => ({ ...prev, stateName: undefined }));
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, stateName: true }))}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      border: errors.stateName && touched.stateName ? "1px solid #c83232" : "1px solid #d4cdbf",
                      borderRadius: 4,
                      fontSize: 13,
                      outline: "none",
                      backgroundColor: errors.stateName && touched.stateName ? "#fff9f9" : "#ffffff"
                    }}
                  />
                  {errors.stateName && touched.stateName && (
                    <span style={{ color: "#c83232", fontSize: 11.5, marginTop: 4, display: "block", fontWeight: 500 }}>
                      {errors.stateName}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 600 }}>
                    PIN Code (6 digits) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={postalCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setPostalCode(val);
                      if (touched.postalCode) setErrors((prev) => ({ ...prev, postalCode: undefined }));
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, postalCode: true }))}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      border: errors.postalCode && touched.postalCode ? "1px solid #c83232" : "1px solid #d4cdbf",
                      borderRadius: 4,
                      fontSize: 13,
                      outline: "none",
                      backgroundColor: errors.postalCode && touched.postalCode ? "#fff9f9" : "#ffffff"
                    }}
                  />
                  {errors.postalCode && touched.postalCode && (
                    <span style={{ color: "#c83232", fontSize: 11.5, marginTop: 4, display: "block", fontWeight: 500 }}>
                      {errors.postalCode}
                    </span>
                  )}
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#444", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={shipDifferent}
                  onChange={(e) => setShipDifferent(e.target.checked)}
                  style={{ accentColor: "#a67c37", width: 16, height: 16, cursor: "pointer" }}
                />
                Ship to a different address
              </label>
            </div>

            {/* 3. DELIVERY METHOD */}
            <div style={{ background: "#ffffff", border: "1px solid #e7e1d6", borderRadius: 8, padding: "24px 28px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#f4efea", color: "#1c1917", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  3
                </span>
                <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917", margin: 0 }}>
                  DELIVERY METHOD
                </h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Standard Delivery */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 18px",
                    border: deliveryMethod === "standard" ? "1.5px solid #a67c37" : "1px solid #d4cdbf",
                    background: deliveryMethod === "standard" ? "#faf6f0" : "#ffffff",
                    borderRadius: 6,
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryMethod === "standard"}
                      onChange={() => setDeliveryMethod("standard")}
                      style={{ accentColor: "#a67c37", width: 16, height: 16, cursor: "pointer" }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>Standard Delivery</div>
                      <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>3-5 business days</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#2e7d32" }}>FREE</span>
                </label>

                {/* Express Delivery */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 18px",
                    border: deliveryMethod === "express" ? "1.5px solid #a67c37" : "1px solid #d4cdbf",
                    background: deliveryMethod === "express" ? "#faf6f0" : "#ffffff",
                    borderRadius: 6,
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryMethod === "express"}
                      onChange={() => setDeliveryMethod("express")}
                      style={{ accentColor: "#a67c37", width: 16, height: 16, cursor: "pointer" }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>Express Delivery</div>
                      <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>1-2 business days</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#1c1917" }}>₹149</span>
                </label>
              </div>
            </div>

            {/* 4. PAYMENT METHOD */}
            <div style={{ background: "#ffffff", border: "1px solid #e7e1d6", borderRadius: 8, padding: "24px 28px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#f4efea", color: "#1c1917", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  4
                </span>
                <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917", margin: 0 }}>
                  PAYMENT METHOD
                </h2>
              </div>
              <p style={{ fontSize: 12, color: "#666", margin: "0 0 16px 34px" }}>
                All transactions are secure and encrypted.
              </p>

              {codBlockedError && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#fdf6e8", border: "1px solid #e8d5a0", borderRadius: 4, marginBottom: 12, fontSize: 12, color: "#7a5c10" }}>
                  <AlertCircle size={14} /> {codBlockedError}
                </div>
              )}

              <div style={{ border: "1px solid #d4cdbf", borderRadius: 6, overflow: "hidden" }}>
                {/* UPI Option */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    background: paymentMethod === "upi" ? "#faf6f0" : "#ffffff",
                    borderBottom: "1px solid #e7e1d6",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "upi"}
                      onChange={() => setPaymentMethod("upi")}
                      style={{ accentColor: "#a67c37", width: 16, height: 16, cursor: "pointer" }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>UPI (GPay / PhonePe / Paytm)</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", background: "#fff", border: "1px solid #ccc", borderRadius: 3, color: "#1c1917" }}>
                    UPI
                  </span>
                </label>

                {/* Credit / Debit Card Option */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    background: paymentMethod === "card" ? "#faf6f0" : "#ffffff",
                    borderBottom: "1px solid #e7e1d6",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "card"}
                      onChange={() => setPaymentMethod("card")}
                      style={{ accentColor: "#a67c37", width: 16, height: 16, cursor: "pointer" }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>Credit / Debit Card</span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", background: "#1a1f71", color: "#fff", borderRadius: 2 }}>VISA</span>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", background: "#eb001b", color: "#fff", borderRadius: 2 }}>Mastercard</span>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", background: "#0072bb", color: "#fff", borderRadius: 2 }}>RuPay</span>
                  </div>
                </label>

                {/* Net Banking Option */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    background: paymentMethod === "netbanking" ? "#faf6f0" : "#ffffff",
                    borderBottom: "1px solid #e7e1d6",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "netbanking"}
                      onChange={() => setPaymentMethod("netbanking")}
                      style={{ accentColor: "#a67c37", width: 16, height: 16, cursor: "pointer" }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>Net Banking</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#666" }}>🏦</span>
                </label>

                {/* Cash on Delivery Option */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    background: paymentMethod === "cod" ? "#faf6f0" : "#ffffff",
                    cursor: !!codBlockedError ? "not-allowed" : "pointer",
                    opacity: !!codBlockedError ? 0.6 : 1
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input
                      type="radio"
                      name="payment"
                      disabled={!!codBlockedError}
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      style={{ accentColor: "#a67c37", width: 16, height: 16, cursor: "pointer" }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>Cash on Delivery</span>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", background: "#f0f0f0", border: "1px solid #ccc", borderRadius: 3, color: "#555" }}>
                    COD
                  </span>
                </label>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#444", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={saveInfo}
                    onChange={(e) => setSaveInfo(e.target.checked)}
                    style={{ accentColor: "#a67c37", width: 16, height: 16, cursor: "pointer" }}
                  />
                  Save this information for faster checkout
                </label>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Order Summary Card ───────────────── */}
          <div>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e7e1d6",
                borderRadius: 8,
                padding: "24px 24px",
                position: "sticky",
                top: 90
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917", margin: 0 }}>
                  ORDER SUMMARY
                </h2>
                <Link href="/cart" style={{ fontSize: 12, color: "#a67c37", fontWeight: 700, textDecoration: "none" }}>
                  Edit Cart
                </Link>
              </div>

              {/* Items List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20, borderBottom: "1px solid #e7e1d6", paddingBottom: 20 }}>
                {cart.map((x, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <img
                        src={x.product.images[0]}
                        alt={x.product.name}
                        style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: "1px solid #eee", display: "block" }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          background: "#a67c37",
                          color: "#ffffff",
                          fontSize: 10,
                          fontWeight: 700,
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        {x.qty}
                      </span>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917", marginBottom: 2 }}>
                        {x.product.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#777" }}>
                        {x.size || "Double"} | {x.color || "Sage Green"}
                      </div>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>
                      ₹{(x.product.price * x.qty).toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Breakdown */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, paddingBottom: 16, borderBottom: "1px solid #e7e1d6" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#555" }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 600, color: "#1c1917" }}>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>

                {discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#c83232" }}>
                    <span>Discount ({appliedCoupon || "WELCOME10"})</span>
                    <span style={{ fontWeight: 700 }}>−₹{discount.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", color: "#555" }}>
                  <span>Shipping</span>
                  <span style={{ fontWeight: 700, color: totalShipping === 0 ? "#2e7d32" : "#1c1917" }}>
                    {totalShipping === 0 ? "FREE" : `₹${totalShipping}`}
                  </span>
                </div>
              </div>

              {/* Grand Total */}
              <div style={{ padding: "16px 0 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#1c1917" }}>Total</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "#1c1917" }}>
                    ₹{grandTotal.toLocaleString("en-IN")}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Inclusive of all taxes</div>
              </div>

              {/* Savings Green Notification Banner */}
              {discount > 0 && (
                <div
                  style={{
                    background: "#eef7ee",
                    border: "1px solid #c3e6c3",
                    borderRadius: 6,
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "#2e7d32",
                    fontWeight: 600,
                    marginBottom: 16
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Yay! You saved ₹{discount.toLocaleString("en-IN")} on this order</span>
                </div>
              )}

              {/* Coupon Box Input / Applied Badge */}
              <div style={{ marginBottom: 20 }}>
                {appliedCoupon ? (
                  <div>
                    <div style={{ display: "flex", gap: 0, overflow: "hidden", borderRadius: 4, border: "1px solid #a8d5a8" }}>
                      <input
                        readOnly
                        value={appliedCoupon}
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                          background: "#ffffff",
                          border: 0,
                          outline: "none",
                          color: "#1c1917"
                        }}
                      />
                      <button
                        type="button"
                        style={{
                          background: "#d4ecd4",
                          color: "#2e7d32",
                          border: 0,
                          padding: "10px 16px",
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: "0.5px",
                          cursor: "default"
                        }}
                      >
                        APPLIED
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        removeCoupon();
                        setCouponMsg(null);
                      }}
                      style={{
                        background: "none",
                        border: 0,
                        color: "#666",
                        fontSize: 11,
                        textDecoration: "underline",
                        marginTop: 6,
                        cursor: "pointer",
                        padding: 0
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} style={{ display: "flex", gap: 0 }}>
                    <input
                      placeholder="Coupon code (e.g. WELCOME10)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        fontSize: 12,
                        border: "1px solid #d4cdbf",
                        borderRight: 0,
                        borderTopLeftRadius: 4,
                        borderBottomLeftRadius: 4,
                        outline: "none"
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        background: "#a67c37",
                        color: "#ffffff",
                        border: 0,
                        padding: "10px 16px",
                        fontSize: 11,
                        fontWeight: 700,
                        borderTopRightRadius: 4,
                        borderBottomRightRadius: 4,
                        cursor: "pointer"
                      }}
                    >
                      APPLY
                    </button>
                  </form>
                )}

                {couponMsg && (
                  <div style={{ fontSize: 11, color: couponMsg.type === "success" ? "#2e7d32" : "#c83232", marginTop: 6 }}>
                    {couponMsg.text}
                  </div>
                )}
              </div>

              {/* Main Place Order Button */}
              <button
                type="submit"
                disabled={submitting || otpLoading}
                style={{
                  width: "100%",
                  background: "#a67c37",
                  color: "#ffffff",
                  border: 0,
                  padding: "15px 20px",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  borderRadius: 4,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "background 0.2s ease"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#8e682c")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#a67c37")}
              >
                <Lock size={15} />
                {submitting
                  ? "PLACING ORDER…"
                  : otpLoading
                  ? "SENDING OTP…"
                  : isPhoneVerified
                  ? "PLACE ORDER NOW"
                  : "VERIFY MOBILE & PLACE ORDER"}
              </button>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, fontSize: 11, color: "#777" }}>
                <span>You won't be charged until you review your order</span>
                <Info size={13} color="#999" />
              </div>
            </div>
          </div>
        </form>

        {/* ── OTP VERIFICATION MODAL ──────────────────────────── */}
        {showOtpModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              backgroundColor: "rgba(28, 25, 23, 0.65)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e7e1d6",
                borderRadius: 12,
                maxWidth: 440,
                width: "100%",
                padding: "32px 28px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
                position: "relative"
              }}
            >
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "none",
                  border: 0,
                  color: "#888",
                  cursor: "pointer",
                  padding: 4
                }}
              >
                <X size={20} />
              </button>

              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "#faf6f0",
                    border: "1px solid #e2d7c5",
                    color: "#a67c37",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px"
                  }}
                >
                  <Phone size={22} />
                </div>
                <h3 className="serif" style={{ fontSize: 24, margin: "0 0 6px", color: "#1c1917" }}>
                  OTP Login &amp; Verification
                </h3>
                <p style={{ fontSize: 13, color: "#666", margin: 0, lineHeight: 1.5 }}>
                  We've sent a 6-digit verification code to<br />
                  <strong style={{ color: "#1c1917" }}>+91 {phone.trim().replace(/\D/g, "")}</strong>
                </p>
              </div>

              {devOtpHint && (
                <div style={{ background: "#eef7ee", border: "1px solid #c3e6c3", borderRadius: 6, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#2e7d32", textAlign: "center", fontWeight: 600 }}>
                  ⚡ Dev Demo OTP Code: <span style={{ fontSize: 15, letterSpacing: 2, fontWeight: 800 }}>{devOtpHint}</span>
                </div>
              )}

              {otpError && (
                <div style={{ background: "#fdf2f0", border: "1px solid #e8c5be", borderRadius: 6, padding: "10px 14px", marginBottom: 18, fontSize: 12.5, color: "#c83232", textAlign: "center", fontWeight: 500 }}>
                  {otpError}
                </div>
              )}

              <form onSubmit={handleVerifyOtpAndPlaceOrder}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#1c1917", marginBottom: 8, textAlign: "center" }}>
                    Enter 6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    placeholder="123456"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                    style={{
                      width: "100%",
                      padding: "12px",
                      fontSize: 22,
                      fontWeight: 800,
                      letterSpacing: "6px",
                      textAlign: "center",
                      border: "1.5px solid #a67c37",
                      borderRadius: 6,
                      outline: "none",
                      backgroundColor: "#faf8f5"
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={otpLoading || otpInput.length !== 6}
                  style={{
                    width: "100%",
                    background: "#a67c37",
                    color: "#ffffff",
                    border: 0,
                    padding: "14px",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    borderRadius: 4,
                    cursor: otpInput.length === 6 ? "pointer" : "not-allowed",
                    opacity: otpInput.length === 6 ? 1 : 0.6,
                    marginBottom: 16
                  }}
                >
                  {otpLoading ? "VERIFYING OTP…" : "VERIFY & PLACE ORDER"}
                </button>
              </form>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#666" }}>
                <span>Didn't receive code?</span>
                {resendCooldown > 0 ? (
                  <span style={{ color: "#888", fontWeight: 600 }}>Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={triggerSendOtp}
                    disabled={otpLoading}
                    style={{ background: "none", border: 0, color: "#a67c37", fontWeight: 700, cursor: "pointer", padding: 0, textDecoration: "underline" }}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── BOTTOM TRUST BADGES BAR ────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 20,
            marginTop: 60,
            paddingTop: 36,
            borderTop: "1px solid #e7e1d6"
          }}
        >
          {/* Badge 1 */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#f4efea", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ShieldCheck size={20} color="#a67c37" />
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917" }}>
                SECURE CHECKOUT
              </strong>
              <span style={{ fontSize: 11.5, color: "#666", display: "block", marginTop: 2 }}>
                Your data is protected
              </span>
            </div>
          </div>

          {/* Badge 2 */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#f4efea", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <RotateCcw size={20} color="#a67c37" />
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917" }}>
                EASY RETURNS
              </strong>
              <span style={{ fontSize: 11.5, color: "#666", display: "block", marginTop: 2 }}>
                Hassle-free returns within 7 days
              </span>
            </div>
          </div>

          {/* Badge 3 */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#f4efea", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Tag size={20} color="#a67c37" />
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917" }}>
                QUALITY ASSURED
              </strong>
              <span style={{ fontSize: 11.5, color: "#666", display: "block", marginTop: 2 }}>
                Premium quality products for your comfort
              </span>
            </div>
          </div>

          {/* Badge 4 */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#f4efea", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Truck size={20} color="#a67c37" />
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917" }}>
                CUSTOMER SUPPORT
              </strong>
              <span style={{ fontSize: 11.5, color: "#666", display: "block", marginTop: 2 }}>
                We're here to help you
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
