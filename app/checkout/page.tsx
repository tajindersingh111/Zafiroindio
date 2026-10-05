"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/StoreProvider";
import {
  ShoppingBag, Lock, Truck, CreditCard, ShieldCheck,
  AlertCircle, Tag, CheckCircle2, RotateCcw, Check, Info,
  HelpCircle, ChevronRight, ChevronLeft, Phone, Mail, X, RefreshCw, Zap
} from "lucide-react";

interface ValidationErrors {
  email?: string;
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  stateName?: string;
  postalCode?: string;
  shipFullName?: string;
  shipAddress?: string;
  shipCity?: string;
  shipStateName?: string;
  shipPostalCode?: string;
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

  // Fastrr 1-Click Checkout Drawer State
  const [showFastrrDrawer, setShowFastrrDrawer] = useState(true);
  const [fastrrTab, setFastrrTab] = useState<"drawer" | "live">("live");
  const [showOrderSummaryDetails, setShowOrderSummaryDetails] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

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

  // Recipient Shipping Address (if different from Billing)
  const [shipDifferent, setShipDifferent] = useState(false);
  const [shipFullName, setShipFullName] = useState("");
  const [shipAddress, setShipAddress] = useState("");
  const [shipApartment, setShipApartment] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipPostalCode, setShipPostalCode] = useState("");
  const [shipStateName, setShipStateName] = useState("");
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

  // Interactive Payment Gateway Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalTab, setPaymentModalTab] = useState<"upi" | "card" | "netbanking" | "cod">("upi");
  const [paymentStep, setPaymentStep] = useState<"select" | "processing" | "bank_otp">("select");
  const [cardNo, setCardNo] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [upiIdInput, setUpiIdInput] = useState("");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [bankOtpCode, setBankOtpCode] = useState("");
  const [paymentGatewayError, setPaymentGatewayError] = useState("");

  const discount = Math.round((subtotal * discountPercent) / 100);

  // Auto-initiate Shiprocket Fastrr 1-Click Checkout via server token
  useEffect(() => {
    if (cart.length === 0) return;
    setShowFastrrDrawer(true);

    fetch("/api/checkout/shiprocket/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((x) => ({
          productId: x.product.slug,
          qty: x.qty,
          size: x.size,
          color: x.color
        })),
        couponCode: appliedCoupon || undefined
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.token && typeof window !== "undefined") {
          try {
            const w = window as any;
            if (typeof w.fastrrCheckout === "function") {
              w.fastrrCheckout(data.token);
            } else if (typeof w.Fastrr?.open === "function") {
              w.Fastrr.open(data.token);
            } else if (typeof w.ShiprocketCheckout?.init === "function") {
              w.ShiprocketCheckout.init(data.token);
            }
          } catch (e) {
            console.warn("Fastrr SDK token trigger notice:", e);
          }
        }
      })
      .catch((err) => console.error("Checkout token fetch failed:", err));
  }, [cart, appliedCoupon]);

  // Auto-load saved customer profile from localStorage if present
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("zafiro-customer-profile");
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        if (p.email) setEmail(p.email);
        if (p.fullName) setFullName(p.fullName);
        if (p.phone) setPhone(p.phone);
        if (p.street || p.address) setAddress(p.address || p.street);
        if (p.city) setCity(p.city);
        if (p.state) setStateName(p.state);
        if (p.pincode || p.postalCode) setPostalCode(p.pincode || p.postalCode);
      } else {
        const savedPhone = localStorage.getItem("zafiro_user_phone");
        if (savedPhone) setPhone(savedPhone);
      }
    } catch {}
  }, []);

  // Auto-apply WELCOME10 coupon if none applied initially
  useEffect(() => {
    if (!appliedCoupon) {
      applyCoupon("WELCOME10");
    }
  }, [appliedCoupon, applyCoupon]);

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

  // Auto PIN Code Lookup to autofill City & State (Billing Address)
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

  // Auto PIN Code Lookup for Recipient Shipping Address
  useEffect(() => {
    if (!shipDifferent) return;
    const cleanPin = shipPostalCode.trim().replace(/\D/g, "");
    if (cleanPin.length === 6) {
      fetch(`/api/pincode/${cleanPin}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.available) {
            if (data.city) setShipCity(data.city);
            if (data.state) setShipStateName(data.state);
          }
        })
        .catch(() => {});
    }
  }, [shipPostalCode, shipDifferent]);

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

    if (shipDifferent) {
      const cleanShipPin = shipPostalCode.trim().replace(/\D/g, "");
      if (!shipFullName.trim()) {
        errs.shipFullName = "Recipient full name is required.";
      }
      if (!shipAddress.trim() || shipAddress.trim().length < 5) {
        errs.shipAddress = "Complete shipping address is required.";
      }
      if (!shipCity.trim()) {
        errs.shipCity = "Shipping city is required.";
      }
      if (!shipStateName.trim()) {
        errs.shipStateName = "Shipping state is required.";
      }
      if (!cleanShipPin || !/^\d{6}$/.test(cleanShipPin)) {
        errs.shipPostalCode = "Please enter a valid 6-digit PIN code.";
      }
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

  // Trigger Send OTP Request via REAL Backend API (/api/auth/send-otp)
  const triggerSendOtp = async () => {
    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setOtpError("Please enter a valid 10-digit Indian mobile number starting with 6-9.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");
    setOtpSentMsg("");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone })
      });
      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || "Failed to send OTP SMS. Please try again.");
      } else {
        setOtpSentMsg(data.message || `OTP code sent via SMS to +91 ${cleanPhone}`);
        if (data.devOtp) {
          setDevOtpHint(data.devOtp);
        } else {
          setDevOtpHint("");
        }
        setResendCooldown(60);
      }
    } catch (err) {
      console.error("Send OTP failed:", err);
      setOtpError("Network error sending OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP Code via REAL Backend API (/api/auth/verify-otp)
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setOtpError("");
    const cleanPhone = phone.trim().replace(/\D/g, "");
    const cleanOtp = otpInput.trim().replace(/\D/g, "");

    if (!cleanOtp || cleanOtp.length !== 6) {
      setOtpError("Please enter 6-digit OTP code received on your mobile.");
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, otp: cleanOtp })
      });
      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || "Invalid OTP code. Please try again.");
      } else {
        setIsPhoneVerified(true);
        try {
          localStorage.setItem("zafiro_verified_phone", cleanPhone);
        } catch {}
        setOtpSentMsg("Mobile number verified successfully!");
        setOtpError("");
      }
    } catch (err) {
      console.error("Verify OTP failed:", err);
      setOtpError("Network error verifying OTP. Please try again.");
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
      postalCode: true,
      ...(shipDifferent ? {
        shipFullName: true,
        shipAddress: true,
        shipCity: true,
        shipStateName: true,
        shipPostalCode: true
      } : {})
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

    // Directly place order via Shiprocket Engine
    await executePlaceOrder();
  };

  // Backend Order Creation API call via Shiprocket Fastrr Engine
  const executePlaceOrder = async () => {
    const cleanPhone = phone.trim().replace(/\D/g, "");

    // Guard: Mandatory Mobile OTP Verification via Shiprocket Fastrr
    if (!isPhoneVerified) {
      triggerSendOtp();
      setErrorMsg("Mobile OTP verification is required by Shiprocket Fastrr before placing order. Please enter the 6-digit OTP code in the Fastrr Checkout drawer (hint: 123456).");
      setShowFastrrDrawer(true);
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0] || "Customer";
      const lastName = nameParts.slice(1).join(" ") || "";
      const fullAddress = apartment ? `${address.trim()}, ${apartment.trim()}` : address.trim();

      if (saveInfo) {
        try {
          localStorage.setItem(
            "zafiro-customer-profile",
            JSON.stringify({
              fullName: fullName.trim(),
              email: email.trim(),
              phone: cleanPhone,
              street: address.trim(),
              city: city.trim(),
              state: stateName.trim(),
              pincode: postalCode.trim()
            })
          );
          localStorage.setItem("zafiro_user_phone", cleanPhone);
          localStorage.setItem("zafiro_verified_phone", cleanPhone);
        } catch {}
      }

      const shipNameParts = shipDifferent ? shipFullName.trim().split(" ") : nameParts;
      const shipFirstName = shipNameParts[0] || "Customer";
      const shipLastName = shipNameParts.slice(1).join(" ") || "";
      const fullShipAddress = shipDifferent
        ? (shipApartment ? `${shipAddress.trim()}, ${shipApartment.trim()}` : shipAddress.trim())
        : fullAddress;

      const payload = {
        customerName: fullName.trim(),
        customerEmail: email.trim(),
        customerPhone: cleanPhone,
        billing: { firstName, lastName, address1: fullAddress, city: city.trim(), state: stateName, postalCode: postalCode.trim(), country: "India", phone: cleanPhone, email: email.trim() },
        shipping: shipDifferent
          ? {
              firstName: shipFirstName,
              lastName: shipLastName,
              address1: fullShipAddress,
              city: shipCity.trim(),
              state: shipStateName.trim(),
              postalCode: shipPostalCode.trim(),
              country: "India",
              phone: cleanPhone,
              email: email.trim()
            }
          : { firstName, lastName, address1: fullAddress, city: city.trim(), state: stateName, postalCode: postalCode.trim(), country: "India", phone: cleanPhone, email: email.trim() },
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
        paymentMethod: paymentModalTab || paymentMethod,
        paymentStatus: (paymentModalTab || paymentMethod) === "cod" ? "pending" : "paid",
        couponCode: appliedCoupon || undefined,
        discount,
        total: grandTotal
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to place order. Please try again.");
        setSubmitting(false);
      } else {
        const targetOrderNumber = data.order?.orderNumber || data.order?.id || `ZI-${Date.now()}`;
        const targetOrderId = data.order?.id || targetOrderNumber;
        clearCart();
        window.location.href = `/order-success?orderNumber=${encodeURIComponent(targetOrderNumber)}&orderId=${encodeURIComponent(targetOrderId)}`;
      }
    } catch (err) {
      console.error("Order submission error:", err);
      setErrorMsg("An error occurred while communicating with the server. Please try again.");
      setSubmitting(false);
    }
  };

  if (submitting) {
    return (
      <main style={{ background: "#faf8f5", minHeight: "100vh", padding: "100px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", background: "#ffffff", padding: "48px 36px", borderRadius: 12, border: "1px solid #e7e1d6", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
          <div style={{ width: 48, height: 48, border: "3px solid #f3ebe0", borderTopColor: "#a67c37", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />
          <h2 className="serif" style={{ fontSize: 26, margin: "0 0 10px", color: "#1c1917" }}>Processing Your Order</h2>
          <p style={{ color: "#666", fontSize: 14, margin: 0, lineHeight: 1.6 }}>Generating invoice and confirming your details with Shiprocket Engine. Please do not close or refresh this page…</p>
        </div>
      </main>
    );
  }

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
            {/* ⚡ SHIPROCKET 1-CLICK FAST CHECKOUT ENGINE BANNER */}
            <div style={{
              background: "linear-gradient(135deg, #1c1917 0%, #2d2825 100%)",
              color: "#ffffff",
              borderRadius: 10,
              padding: "20px 24px",
              marginBottom: 24,
              boxShadow: "0 4px 18px rgba(0,0,0,0.08)",
              border: "1px solid #3d3632",
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ background: "#c5a028", color: "#1c1917", fontSize: 11, fontWeight: 900, padding: "3px 8px", borderRadius: 4, letterSpacing: "0.5px" }}>
                    1-CLICK FAST CHECKOUT
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.3px", color: "#f5f2eb" }}>
                    Shiprocket Checkout Engine
                  </span>
                </div>
                <span style={{ fontSize: 11, color: "#a8a29e", display: "flex", alignItems: "center", gap: 4 }}>
                  <ShieldCheck size={14} color="#c5a028" /> WhatsApp / SMS OTP Verified
                </span>
              </div>

              <p style={{ margin: 0, fontSize: 12.5, color: "#d6d3d1", lineHeight: 1.5 }}>
                Pre-fill address automatically for 100M+ Indian shoppers. Verified via instant WhatsApp OTP — <strong>Zafiro Customer Account auto-created</strong>.
              </p>

              <button
                type="button"
                onClick={async () => {
                  if (!phone || phone.trim().length < 10) {
                    setErrorMsg("Please enter your 10-digit mobile number in the contact details below.");
                    return;
                  }
                  await triggerSendOtp();
                }}
                style={{
                  background: "linear-gradient(135deg, #c5a028 0%, #a67c37 100%)",
                  color: "#1c1917",
                  border: "none",
                  padding: "13px 20px",
                  borderRadius: 6,
                  fontWeight: 800,
                  fontSize: 13,
                  letterSpacing: "0.6px",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 2px 10px rgba(197, 160, 40, 0.3)"
                }}
              >
                <Zap size={16} fill="#1c1917" /> Buy Fast via Shiprocket 1-Click OTP
              </button>
            </div>

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

              {shipDifferent && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px dashed #d4cdbf" }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1c1917", marginBottom: 16 }}>
                    Recipient Shipping Address
                  </h3>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 600 }}>
                      Recipient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Name of person receiving the order"
                      value={shipFullName}
                      onChange={(e) => {
                        setShipFullName(e.target.value);
                        if (touched.shipFullName) setErrors((prev) => ({ ...prev, shipFullName: undefined }));
                      }}
                      onBlur={() => setTouched((prev) => ({ ...prev, shipFullName: true }))}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        border: errors.shipFullName && touched.shipFullName ? "1px solid #c83232" : "1px solid #d4cdbf",
                        borderRadius: 4,
                        fontSize: 13,
                        outline: "none",
                        backgroundColor: errors.shipFullName && touched.shipFullName ? "#fff9f9" : "#ffffff"
                      }}
                    />
                    {errors.shipFullName && touched.shipFullName && (
                      <span style={{ color: "#c83232", fontSize: 11.5, marginTop: 4, display: "block", fontWeight: 500 }}>
                        {errors.shipFullName}
                      </span>
                    )}
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 600 }}>
                      Shipping Street Address *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="House/Flat No., Building, Street Name"
                      value={shipAddress}
                      onChange={(e) => {
                        setShipAddress(e.target.value);
                        if (touched.shipAddress) setErrors((prev) => ({ ...prev, shipAddress: undefined }));
                      }}
                      onBlur={() => setTouched((prev) => ({ ...prev, shipAddress: true }))}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        border: errors.shipAddress && touched.shipAddress ? "1px solid #c83232" : "1px solid #d4cdbf",
                        borderRadius: 4,
                        fontSize: 13,
                        outline: "none",
                        backgroundColor: errors.shipAddress && touched.shipAddress ? "#fff9f9" : "#ffffff"
                      }}
                    />
                    {errors.shipAddress && touched.shipAddress && (
                      <span style={{ color: "#c83232", fontSize: 11.5, marginTop: 4, display: "block", fontWeight: 500 }}>
                        {errors.shipAddress}
                      </span>
                    )}
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 500 }}>
                      Apartment, suite, landmark (optional)
                    </label>
                    <input
                      type="text"
                      value={shipApartment}
                      onChange={(e) => setShipApartment(e.target.value)}
                      style={{ width: "100%", padding: "11px 14px", border: "1px solid #d4cdbf", borderRadius: 4, fontSize: 13, outline: "none" }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 600 }}>
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={shipCity}
                        onChange={(e) => {
                          setShipCity(e.target.value);
                          if (touched.shipCity) setErrors((prev) => ({ ...prev, shipCity: undefined }));
                        }}
                        onBlur={() => setTouched((prev) => ({ ...prev, shipCity: true }))}
                        style={{
                          width: "100%",
                          padding: "11px 14px",
                          border: errors.shipCity && touched.shipCity ? "1px solid #c83232" : "1px solid #d4cdbf",
                          borderRadius: 4,
                          fontSize: 13,
                          outline: "none",
                          backgroundColor: errors.shipCity && touched.shipCity ? "#fff9f9" : "#ffffff"
                        }}
                      />
                      {errors.shipCity && touched.shipCity && (
                        <span style={{ color: "#c83232", fontSize: 11.5, marginTop: 4, display: "block", fontWeight: 500 }}>
                          {errors.shipCity}
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
                        value={shipStateName}
                        onChange={(e) => {
                          setShipStateName(e.target.value);
                          if (touched.shipStateName) setErrors((prev) => ({ ...prev, shipStateName: undefined }));
                        }}
                        onBlur={() => setTouched((prev) => ({ ...prev, shipStateName: true }))}
                        style={{
                          width: "100%",
                          padding: "11px 14px",
                          border: errors.shipStateName && touched.shipStateName ? "1px solid #c83232" : "1px solid #d4cdbf",
                          borderRadius: 4,
                          fontSize: 13,
                          outline: "none",
                          backgroundColor: errors.shipStateName && touched.shipStateName ? "#fff9f9" : "#ffffff"
                        }}
                      />
                      {errors.shipStateName && touched.shipStateName && (
                        <span style={{ color: "#c83232", fontSize: 11.5, marginTop: 4, display: "block", fontWeight: 500 }}>
                          {errors.shipStateName}
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
                        value={shipPostalCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setShipPostalCode(val);
                          if (touched.shipPostalCode) setErrors((prev) => ({ ...prev, shipPostalCode: undefined }));
                        }}
                        onBlur={() => setTouched((prev) => ({ ...prev, shipPostalCode: true }))}
                        style={{
                          width: "100%",
                          padding: "11px 14px",
                          border: errors.shipPostalCode && touched.shipPostalCode ? "1px solid #c83232" : "1px solid #d4cdbf",
                          borderRadius: 4,
                          fontSize: 13,
                          outline: "none",
                          backgroundColor: errors.shipPostalCode && touched.shipPostalCode ? "#fff9f9" : "#ffffff"
                        }}
                      />
                      {errors.shipPostalCode && touched.shipPostalCode && (
                        <span style={{ color: "#c83232", fontSize: 11.5, marginTop: 4, display: "block", fontWeight: 500 }}>
                          {errors.shipPostalCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
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

              {/* Main Place Order Button — Powered by Shiprocket 1-Click Fast Checkout */}
              <button
                type="submit"
                disabled={submitting || otpLoading}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #1c1917 0%, #2d2825 100%)",
                  color: "#ffffff",
                  border: "1px solid #c5a028",
                  padding: "16px 20px",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                  transition: "all 0.2s ease"
                }}
              >
                {submitting || otpLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Processing Shiprocket Order…</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} fill="#c5a028" color="#c5a028" />
                    <span>SHIPROCKET 1-CLICK FAST CHECKOUT</span>
                  </>
                )}
              </button>
              <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#777" }}>
                🔒 WhatsApp / SMS OTP Verified · Auto Customer Account Sync
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, fontSize: 11, color: "#777" }}>
                <span>You won't be charged until you review your order</span>
                <Info size={13} color="#999" />
              </div>
            </div>
          </div>
        </form>



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

      {/* ── FASTRR 1-CLICK CHECKOUT SIDE DRAWER (MATCHING USER SCREENSHOT 1:1) ── */}
      {showFastrrDrawer && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(3px)"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              height: "100vh",
              background: "#f4f6f8",
              display: "flex",
              flexDirection: "column",
              boxShadow: "-6px 0 30px rgba(0,0,0,0.25)",
              overflow: "hidden",
              position: "relative"
            }}
          >
            {/* 1. Header */}
            <div
              style={{
                background: "#ffffff",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #eaeaea"
              }}
            >
              <button
                type="button"
                onClick={() => setShowFastrrDrawer(false)}
                style={{ background: "none", border: 0, cursor: "pointer", padding: 4, color: "#333" }}
              >
                <ChevronLeft size={22} />
              </button>

              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, letterSpacing: "2px", color: "#1c1917" }}>
                  ZAFIRO
                </div>
                <div style={{ fontSize: 9, letterSpacing: "3px", color: "#666", fontWeight: 600, marginTop: -2 }}>
                  INDIO
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFastrrDrawer(false)}
                style={{ background: "none", border: 0, cursor: "pointer", padding: 4, color: "#666" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Teal Prepaid Discount Banner */}
            <div
              style={{
                background: "#3ebdb6",
                color: "#ffffff",
                textAlign: "center",
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.2px"
              }}
            >
              Extra 3% Discount on Prepaid orders.
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Order Summary Box */}
              <div style={{ background: "#ffffff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div
                  onClick={() => setShowOrderSummaryDetails(!showOrderSummaryDetails)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1c1917" }}>
                    Order summary <span style={{ color: "#666", fontWeight: 500 }}>({cart.reduce((a, b) => a + b.qty, 0)} Item{cart.reduce((a, b) => a + b.qty, 0) > 1 ? "s" : ""})</span>
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 800, color: "#1c1917" }}>
                    ₹{grandTotal.toLocaleString("en-IN")}.00
                    <ChevronRight size={16} color="#666" style={{ transform: showOrderSummaryDetails ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                  </div>
                </div>

                {showOrderSummaryDetails && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #f0f0f0", display: "flex", flexDirection: "column", gap: 10 }}>
                    {cart.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {item.product.images?.[0] && (
                            <img src={item.product.images[0]} alt={item.product.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} />
                          )}
                          <div>
                            <div style={{ fontWeight: 600, color: "#333" }}>{item.product.name}</div>
                            <div style={{ fontSize: 11, color: "#888" }}>Qty: {item.qty}</div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, color: "#1c1917" }}>₹{(item.product.price * item.qty).toLocaleString("en-IN")}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Coupon Code Input */}
                <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
                    <span style={{ position: "absolute", left: 12, color: "#16a34a", fontWeight: 800, fontSize: 13 }}>%</span>
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      style={{
                        width: "100%",
                        padding: "10px 12px 10px 32px",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                        fontSize: 13,
                        outline: "none"
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    style={{ background: "none", border: 0, color: "#16a34a", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: "8px 12px" }}
                  >
                    Apply
                  </button>
                </div>
                {couponMsg && (
                  <div style={{ fontSize: 12, marginTop: 6, color: couponMsg.type === "success" ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                    {couponMsg.text}
                  </div>
                )}
              </div>

              {/* ── STEP 1: MOBILE OTP VERIFICATION CARD (POWERED BY SHIPROCKET) ── */}
              <div style={{ background: "#ffffff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", border: isPhoneVerified ? "1.5px solid #10b981" : "1.5px solid #f59e0b" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1c1917", display: "flex", alignItems: "center", gap: 6 }}>
                    <Phone size={16} color={isPhoneVerified ? "#10b981" : "#f59e0b"} />
                    WhatsApp &amp; Mobile OTP Verification
                  </span>
                  {isPhoneVerified ? (
                    <span style={{ fontSize: 10, background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: 4, fontWeight: 800 }}>
                      ✓ OTP VERIFIED
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 4, fontWeight: 800 }}>
                      OTP REQUIRED
                    </span>
                  )}
                </div>

                {!isPhoneVerified ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                    <div style={{ fontSize: 12, color: "#4b5563" }}>
                      Verify mobile number via OTP before confirming order:
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Mobile Number"
                        style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}
                      />
                      <button
                        type="button"
                        onClick={triggerSendOtp}
                        disabled={otpLoading}
                        style={{ background: "#1c1917", color: "#ffffff", border: 0, padding: "8px 14px", borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: "pointer" }}
                      >
                        {otpSentMsg ? "RESEND OTP" : "SEND OTP"}
                      </button>
                    </div>

                    {otpSentMsg && (
                      <div style={{ fontSize: 12, color: "#059669", background: "#f0fdf4", padding: "8px 10px", borderRadius: 6, border: "1px solid #bbf7d0" }}>
                        {otpSentMsg}
                        {devOtpHint && (
                          <div style={{ fontWeight: 800, marginTop: 4, color: "#166534" }}>
                            ⚡ OTP Verification Code: <span style={{ letterSpacing: 2, fontSize: 14 }}>{devOtpHint}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {otpSentMsg && (
                      <form onSubmit={handleVerifyOtp} style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <input
                          type="text"
                          maxLength={6}
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                          placeholder="Enter 6-digit OTP code"
                          style={{ flex: 1, padding: "10px 12px", borderRadius: 6, border: "1.5px solid #10b981", fontSize: 14, fontWeight: 800, letterSpacing: "3px", textAlign: "center" }}
                        />
                        <button
                          type="submit"
                          style={{ background: "#10b981", color: "#ffffff", border: 0, padding: "10px 16px", borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: "pointer", textTransform: "uppercase" }}
                        >
                          VERIFY OTP
                        </button>
                      </form>
                    )}

                    {otpError && (
                      <div style={{ fontSize: 12, color: "#dc2626", background: "#fef2f2", padding: "8px 10px", borderRadius: 6, border: "1px solid #fecaca" }}>
                        {otpError}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#166534", background: "#f0fdf4", padding: "8px 12px", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #bbf7d0" }}>
                    <span>Verified Mobile: <strong>+91 {phone.trim().replace(/\D/g, "")}</strong></span>
                    <button type="button" onClick={() => setIsPhoneVerified(false)} style={{ background: "none", border: 0, color: "#059669", fontSize: 11, textDecoration: "underline", cursor: "pointer" }}>
                      Change
                    </button>
                  </div>
                )}
              </div>

              {/* Delivery Details Box */}
              <div style={{ background: "#ffffff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1c1917" }}>Delivery details</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingAddress(!isEditingAddress)}
                    style={{ background: "none", border: 0, color: "#16a34a", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    {isEditingAddress ? "Save" : "Change"}
                  </button>
                </div>

                {isEditingAddress ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 12 }}
                    />
                    <input
                      type="text"
                      placeholder="Phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 12 }}
                    />
                    <input
                      type="text"
                      placeholder="Address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 12 }}
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      <input type="text" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 12 }} />
                      <input type="text" placeholder="State" value={stateName} onChange={(e) => setStateName(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 12 }} />
                      <input type="text" placeholder="PIN" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 12 }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 700, color: "#111827" }}>{fullName || "Tajinder"}</div>
                    <div>{address ? `${address}, ${city}, ${stateName}, ${postalCode}` : "B-30 Hari nagar, South West Delhi, Delhi, 110064"}</div>
                    <div style={{ color: "#6b7280", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <span>📞</span> {phone || "9672361864"}
                    </div>
                  </div>
                )}

                {/* Standard Delivery info */}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#1f2937", fontWeight: 600 }}>
                    <Truck size={15} color="#10b981" />
                    Standard delivery: <span style={{ color: "#4b5563" }}>Monday, Oct 05</span>
                  </div>
                  <span style={{ color: "#10b981", fontWeight: 700 }}>Free shipping for you</span>
                </div>
              </div>

              {/* Offers Banner */}
              <div style={{ background: "#ffffff", borderRadius: 10, padding: "12px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", border: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ background: "#00baf2", color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 800 }}>paytm</span>
                    <div>
                      <div style={{ fontWeight: 700, color: "#111827" }}>Get up to ₹200 Cashback</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Use PAYTM App and win cashback as per spend.</div>
                    </div>
                  </div>
                  <span style={{ color: "#10b981", fontWeight: 700, cursor: "pointer" }}>View all offers &gt;</span>
                </div>
              </div>

              {/* Pay Via Section */}
              <div style={{ background: "#ffffff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917", marginBottom: 12 }}>Pay via</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                  {/* Option 1: Cash on delivery */}
                  <button
                    type="button"
                    onClick={async () => {
                      setPaymentMethod("cod");
                      await executePlaceOrder();
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 16px",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      background: "#ffffff",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <ShoppingBag size={18} color="#4b5563" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Cash on delivery</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#111827" }}>
                      ₹{grandTotal.toLocaleString("en-IN")}.00 &gt;
                    </div>
                  </button>

                  {/* Option 2: Scan QR Code & Pay via UPI */}
                  <div style={{ border: "1px solid #10b981", borderRadius: 8, padding: "14px 16px", background: "#f0fdf4" }}>
                    <div style={{ textAlign: "center", marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#065f46" }}>Scan the QR code &amp; pay via any UPI app</div>
                    </div>

                    <div style={{ textAlign: "center", margin: "10px 0" }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=zafiro@upi&pn=ZafiroIndio&am=${Math.round(grandTotal * 0.97)}&cu=INR`}
                        alt="UPI QR Code"
                        style={{ width: 140, height: 140, margin: "0 auto", border: "4px solid #ffffff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        setPaymentMethod("upi");
                        await executePlaceOrder();
                      }}
                      style={{
                        width: "100%",
                        background: "#10b981",
                        color: "#ffffff",
                        border: 0,
                        padding: "12px",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        textTransform: "uppercase"
                      }}
                    >
                      Pay ₹{Math.round(grandTotal * 0.97).toLocaleString("en-IN")}.00 via UPI
                    </button>
                  </div>

                  {/* Option 3: Credit / Debit Card */}
                  <button
                    type="button"
                    onClick={async () => {
                      setPaymentMethod("card");
                      await executePlaceOrder();
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 16px",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      background: "#ffffff",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <CreditCard size={18} color="#4b5563" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Credit/Debit Card</div>
                        <span style={{ fontSize: 10, background: "#dcfce7", color: "#15803d", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                          Save ₹{Math.round(grandTotal * 0.03)}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ textDecoration: "line-through", color: "#9ca3af", fontSize: 12 }}>₹{grandTotal}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>₹{Math.round(grandTotal * 0.97)} &gt;</span>
                    </div>
                  </button>

                  {/* Option 4: Wallets */}
                  <button
                    type="button"
                    onClick={async () => {
                      setPaymentMethod("netbanking");
                      await executePlaceOrder();
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 16px",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      background: "#ffffff",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Lock size={18} color="#4b5563" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Wallets</div>
                        <span style={{ fontSize: 10, background: "#dcfce7", color: "#15803d", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                          Save ₹{Math.round(grandTotal * 0.03)}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ textDecoration: "line-through", color: "#9ca3af", fontSize: 12 }}>₹{grandTotal}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>₹{Math.round(grandTotal * 0.97)} &gt;</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Account Dropdown */}
              <div style={{ background: "#ffffff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Account</span>
                <ChevronRight size={16} color="#6b7280" />
              </div>

              {/* Footer Links & Shiprocket Branding */}
              <div style={{ textAlign: "center", padding: "12px 0 24px", fontSize: 11, color: "#6b7280", lineHeight: 1.6 }}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 12 }}>
                  <Link href="/terms" style={{ color: "#6b7280", textDecoration: "none" }}>T&amp;C</Link> |
                  <Link href="/returns" style={{ color: "#6b7280", textDecoration: "none" }}>Return &amp; Exchange</Link> |
                  <Link href="/privacy" style={{ color: "#6b7280", textDecoration: "none" }}>Privacy Policy</Link> |
                  <Link href="/refunds" style={{ color: "#6b7280", textDecoration: "none" }}>Refund Policy</Link> |
                  <Link href="/shipping" style={{ color: "#6b7280", textDecoration: "none" }}>Shipping Policy</Link>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 600, color: "#4b5563" }}>
                  <span>Powered By</span>
                  <span style={{ fontWeight: 800, color: "#4338ca", display: "flex", alignItems: "center", gap: 2 }}>
                    🚀 Shiprocket
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}    </main>
  );
}
