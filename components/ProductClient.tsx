"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Share2, Minus, Plus, ChevronDown, ChevronUp, Truck, RotateCcw, ShieldCheck, Search, ShoppingCart, Gift } from "lucide-react";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/data";
import { useCatalog } from "@/lib/storefront/useCatalog";
import { useStore } from "./StoreProvider";
import ShiprocketCheckoutButton from "./ShiprocketCheckoutButton";
import { img as optimizedImg, imgSrcSet, fallbackToOriginal } from "@/lib/img";

export default function ProductClient({ p }: { p: Product }) {
  const [img, setImg] = useState(0);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [size, setSize] = useState(p.sizes[1] || p.sizes[0] || "");
  const [color, setColor] = useState(p.colors[0] || "");
  const [qty, setQtyLocal] = useState(1);
  const [pincode, setPincode] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>("PRODUCT DETAILS");
  const { add, toggleWish, wishlist } = useStore();
  const wished = wishlist.includes(p.slug);

  const starCount = Math.round(p.rating || 0);

  const scrollToImage = (index: number) => {
    setImg(index);
    const el = document.getElementById(`product-img-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const accordionItems = [
    { title: "PRODUCT DETAILS", content: `Premium ${p.fabric} bedsheet with ${p.category.toLowerCase()} design. Machine washable. Fits mattresses up to 10 inches deep.` },
    { title: "FABRIC & MATERIAL", content: `Made from ${p.fabric}. Breathable, soft, and durable. Tested for skin-safety and long wash cycles.` },
    { title: "DIMENSIONS", content: "Single: 60×90 in · Double: 90×100 in · Queen: 90×108 in · King: 108×108 in. Pillow covers: 18×28 in each." },
    { title: "WHAT'S INCLUDED", content: "1 Flat Bedsheet + 2 Pillow Covers (1 for Single size)." },
    { title: "CARE INSTRUCTIONS", content: "Machine wash cold, gentle cycle. Tumble dry low. Do not bleach. Iron on medium heat." },
    { title: "SHIPPING INFORMATION", content: "Free shipping on orders above ₹999. Standard delivery in 3–5 business days. Express delivery available at ₹149." },
    { title: "RETURNS & EXCHANGE", content: "Easy 7-day returns on unused, unwashed items in original packaging. Pickup from your doorstep." },
    { title: "FAQS", content: "Q: Will the colour fade? A: No, our colours are tested for 50+ washes. Q: Is it pre-shrunk? A: Yes, all fabrics are pre-shrunk before finishing." },
  ];

  const { products: catalogProducts } = useCatalog();
  const youMayLike = catalogProducts.filter(x => x.slug !== p.slug).slice(0, 5);

  const [checkingPincode, setCheckingPincode] = useState(false);

  // Review Modal & Dynamic List State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewName, setReviewName] = useState("");
  const [reviewEmail, setReviewEmail] = useState("");
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  // Photos whose file is missing at the source are dropped instead of showing a broken image.
  const [deadImages, setDeadImages] = useState<string[]>([]);
  const markDead = (url: string) => setDeadImages((d) => (d.includes(url) ? d : [...d, url]));
  const gallery = (p.images || []).filter((u) => !deadImages.includes(u));
  const [showAllReviews, setShowAllReviews] = useState(false);
  // Star breakdown from the approved reviews actually shown on this page.
  const starRows = [5, 4, 3, 2, 1].map((n) => {
    const count = reviewsList.filter((r) => Math.round(Number(r.rating) || 0) === n).length;
    return { stars: `${n}★`, count, pct: reviewsList.length ? Math.round((count / reviewsList.length) * 100) : 0 };
  });

  // Approved reviews for this product (moderated in the admin panel).
  useEffect(() => {
    let alive = true;
    fetch(`/api/reviews?productId=${encodeURIComponent(p.slug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (alive && Array.isArray(data)) setReviewsList(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [p.slug]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewText.trim()) return;

    setReviewSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: p.slug,
          productName: p.name,
          customerName: reviewName,
          customerEmail: reviewEmail,
          rating: reviewRating,
          title: reviewTitle,
          review: reviewText,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReviewSuccessMsg(data.message || "Thank you! Your review will appear once our team approves it.");
        setTimeout(() => {
          setShowReviewModal(false);
          setReviewSuccessMsg(null);
          setReviewName("");
          setReviewEmail("");
          setReviewTitle("");
          setReviewText("");
        }, 1800);
      } else {
        alert(data.error || "Failed to submit review.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const checkPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = pincode.trim().replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setPincodeStatus("Please enter a valid 6-digit Indian PIN code.");
      return;
    }
    setCheckingPincode(true);
    setPincodeStatus("Checking PIN code availability...");
    try {
      const res = await fetch(`/api/pincode/${cleanCode}`);
      const data = await res.json();
      if (res.ok && data.available) {
        setPincodeStatus(data.message);
      } else {
        setPincodeStatus(data.message || "PIN code not serviceable.");
      }
    } catch {
      setPincodeStatus("Unable to check PIN code right now. Please try again.");
    } finally {
      setCheckingPincode(false);
    }
  };

  // Escape closes the zoom view and the review form.
  useEffect(() => {
    if (!lightboxImg && !showReviewModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setLightboxImg(null);
      setShowReviewModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxImg, showReviewModal]);

  return (
    <main style={{ background: "#faf8f5", minHeight: "100vh", paddingBottom: 80 }}>
      {/* Lightbox Zoom Modal */}
      {lightboxImg && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${p.name}: zoomed photo`}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.88)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
          onClick={() => setLightboxImg(null)}
        >
          <button
            type="button"
            aria-label="Close zoomed photo"
            autoFocus
            onClick={() => setLightboxImg(null)}
            style={{
              position: "absolute",
              top: 24,
              right: 24,
              background: "rgba(255,255,255,0.2)",
              color: "#ffffff",
              border: 0,
              borderRadius: "50%",
              width: 44,
              height: 44,
              fontSize: 20,
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ✕
          </button>
          <img
            src={optimizedImg(lightboxImg, 1920)}
            alt="Product Zoomed View"
            style={{
              maxWidth: "92vw",
              maxHeight: "92vh",
              objectFit: "contain",
              borderRadius: 8,
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="container" style={{ maxWidth: 1240, margin: "0 auto", padding: "0 20px" }}>
        {/* Breadcrumb */}
        <nav className="pdp-crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/shop">Shop</Link>
          <span>/</span>
          <span className="pdp-crumbs-current">{p.name}</span>
        </nav>

        {/* ── Top Layout: Gallery + Product Controls ──────────────────────────── */}
        <div className="pdp-grid">
          {/* Left: Gallery (desktop: thumbnails + stacked images; phone: swipeable slides) */}
          <div className="pdp-gallery">
            {/* Vertical Thumbnails (Sticky) */}
            {gallery.length > 1 && (
              <div className="pdp-thumbs">
                {gallery.map((x, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToImage(i)}
                    style={{
                      border: i === img ? "2px solid #a67c37" : "1px solid #e7e1d6",
                      borderRadius: 6,
                      overflow: "hidden",
                      cursor: "pointer",
                      padding: 0,
                      background: "#ffffff",
                      height: 80,
                      transition: "all 0.2s ease"
                    }}
                  >
                    <img
                      src={optimizedImg(x, 128)}
                      onError={fallbackToOriginal(x, () => markDead(x))}
                      alt={`${p.name} thumb ${i + 1}`}
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main Image Stack */}
            <div
              className="pdp-stack"
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollWidth > el.clientWidth + 4) setImg(Math.round(el.scrollLeft / el.clientWidth));
              }}
            >
              {gallery.length > 0 ? (
                gallery.map((imgUrl, i) => (
                  <div key={i} id={`product-img-${i}`} className="pdp-slide" onClick={() => setLightboxImg(imgUrl)}>
                    {i === 0 && p.badge && (
                      <span
                        style={{
                          position: "absolute",
                          top: 14,
                          left: 14,
                          background: p.badge === "SALE" ? "#c83232" : "#a67c37",
                          color: "#ffffff",
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: "1px",
                          padding: "4px 10px",
                          borderRadius: 3,
                          textTransform: "uppercase",
                          zIndex: 2
                        }}
                      >
                        {p.badge}
                      </span>
                    )}

                    <img
                      src={optimizedImg(imgUrl, 1080)}
                      srcSet={imgSrcSet(imgUrl, [640, 828, 1080, 1200])}
                      sizes="(max-width: 900px) 100vw, 55vw"
                      onError={fallbackToOriginal(imgUrl, () => markDead(imgUrl))}
                      alt={`${p.name} view ${i + 1}`}
                      className="pdp-img"
                      loading={i === 0 ? "eager" : "lazy"}
                      fetchPriority={i === 0 ? "high" : "auto"}
                      decoding="async"
                    />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxImg(imgUrl);
                      }}
                      style={{
                        position: "absolute",
                        bottom: 16,
                        right: 16,
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.9)",
                        backdropFilter: "blur(4px)",
                        border: "1px solid #e7e1d6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.12)"
                      }}
                      aria-label="Zoom image"
                    >
                      <Search size={18} color="#1c1917" />
                    </button>
                  </div>
                ))
              ) : null}

              {/* Craft & Quality Feature Banner if 2 or fewer images */}
              {(gallery.length <= 2) && (
                <div className="pdp-craft">
                  <h4 style={{ fontSize: 12, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#1c1917", marginBottom: 14 }}>
                    ARTISANAL CRAFT &amp; QUALITY HIGHLIGHTS
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div style={{ background: "#faf8f5", padding: "14px 16px", borderRadius: 6, border: "1px solid #eee8dd" }}>
                      <strong style={{ fontSize: 12, color: "#1c1917", display: "block", marginBottom: 4 }}>100% Pure Percale Cotton</strong>
                      <span style={{ fontSize: 11, color: "#666", lineHeight: 1.4, display: "block" }}>Ultra-soft 300 Thread Count weave for cool, crisp, all-night comfort.</span>
                    </div>
                    <div style={{ background: "#faf8f5", padding: "14px 16px", borderRadius: 6, border: "1px solid #eee8dd" }}>
                      <strong style={{ fontSize: 12, color: "#1c1917", display: "block", marginBottom: 4 }}>Traditional Handblock Print</strong>
                      <span style={{ fontSize: 11, color: "#666", lineHeight: 1.4, display: "block" }}>Hand-carved wooden blocks stamped by master artisans in Jaipur.</span>
                    </div>
                    <div style={{ background: "#faf8f5", padding: "14px 16px", borderRadius: 6, border: "1px solid #eee8dd" }}>
                      <strong style={{ fontSize: 12, color: "#1c1917", display: "block", marginBottom: 4 }}>Color Fast &amp; Pre-Shrunk</strong>
                      <span style={{ fontSize: 11, color: "#666", lineHeight: 1.4, display: "block" }}>Lab-tested to maintain rich colors wash after wash without shrinkage.</span>
                    </div>
                    <div style={{ background: "#faf8f5", padding: "14px 16px", borderRadius: 6, border: "1px solid #eee8dd" }}>
                      <strong style={{ fontSize: 12, color: "#1c1917", display: "block", marginBottom: 4 }}>Sustainable &amp; Skin-Safe</strong>
                      <span style={{ fontSize: 11, color: "#666", lineHeight: 1.4, display: "block" }}>Non-toxic eco dyes gentle on sensitive skin and safe for all ages.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="pdp-dots" aria-hidden="true">
                {gallery.map((_, i) => <i key={i} className={i === img ? "on" : ""} />)}
              </div>
            )}
          </div>

          {/* Right: Product Details & Controls (Sticky) */}
          <div className="pdp-info">
            <h1
              className="serif"
              style={{
                fontSize: 32,
                fontWeight: 500,
                color: "#1c1917",
                margin: "0 0 10px",
                letterSpacing: "-0.5px"
              }}
            >
              {p.name}
            </h1>

            {/* Rating Row (only once there are reviews) */}
            {p.reviews > 0 && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ color: "#c5a028", fontSize: 14 }}>
                {"★".repeat(starCount)}{"☆".repeat(5 - starCount)}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{p.rating}</span>
              <span style={{ fontSize: 12, color: "#777" }}>({p.reviews} {p.reviews === 1 ? "review" : "reviews"})</span>
            </div>}

            {/* Price Row */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#1c1917" }}>₹{p.price.toLocaleString("en-IN")}</span>
              {p.oldPrice > p.price && (
                <>
                  <span style={{ fontSize: 14, color: "#888", textDecoration: "line-through" }}>₹{p.oldPrice.toLocaleString("en-IN")}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#c83232" }}>{p.discount}% OFF</span>
                </>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 18 }}>Inclusive of all taxes</div>

            {/* Select Size */}
            {p.sizes.length > 0 && <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#1c1917" }}>
                  SELECT SIZE
                </span>
                <Link href="/about" style={{ fontSize: 11, color: "#777", textDecoration: "underline" }}>
                  Size Guide
                </Link>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {p.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    style={{
                      padding: "8px 18px",
                      fontSize: 12,
                      fontWeight: 600,
                      border: s === size ? "1.5px solid #1c1917" : "1px solid #d4cdbf",
                      background: s === size ? "#faf6f0" : "#ffffff",
                      color: "#1c1917",
                      borderRadius: 4,
                      cursor: "pointer"
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>}

            {/* Select Color */}
            {p.colors.length > 0 && <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#1c1917", marginBottom: 10 }}>
                SELECT COLOR: <span style={{ fontWeight: 600, color: "#a67c37", textTransform: "none" }}>{color}</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {p.colors.map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 6,
                      border: c === color ? "2px solid #a67c37" : "1px solid #d4cdbf",
                      overflow: "hidden",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    <img src={optimizedImg(p.images[i % p.images.length], 128)} alt={c} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            </div>}

            {/* Quantity */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#1c1917", marginBottom: 10 }}>
                QUANTITY
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid #d4cdbf", borderRadius: 4, background: "#ffffff" }}>
                <button
                  type="button"
                  onClick={() => setQtyLocal(Math.max(1, qty - 1))}
                  style={{ border: 0, background: "none", padding: "8px 14px", cursor: "pointer" }}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} color="#1c1917" />
                </button>
                <span style={{ padding: "0 12px", fontSize: 13, fontWeight: 700, minWidth: 24, textAlign: "center" }}>{qty}</span>
                <button
                  type="button"
                  onClick={() => setQtyLocal(Math.min(10, qty + 1))}
                  style={{ border: 0, background: "none", padding: "8px 14px", cursor: "pointer" }}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} color="#1c1917" />
                </button>
              </div>
            </div>

            {/* Action Buttons Stack */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <button
                type="button"
                disabled={p.badge === "SOLD OUT"}
                onClick={() => { for (let i = 0; i < qty; i++) add(p, size, color); }}
                style={{
                  width: "100%",
                  background: "#a67c37",
                  color: "#ffffff",
                  border: 0,
                  padding: "15px 20px",
                  fontSize: 12,
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
                <ShoppingCart size={16} /> {p.badge === "SOLD OUT" ? "SOLD OUT" : "ADD TO CART"}
              </button>

              {p.badge !== "SOLD OUT" && (
                // One tap to Shiprocket's checkout for just this item; the cart is left as it is.
                <ShiprocketCheckoutButton
                  label="BUY IT NOW"
                  items={[{ productId: p.slug, qty, size, color }]}
                  source="buy-now"
                  className="btn-buy-now"
                />
              )}
            </div>

            {/* Secondary Actions */}
            <div style={{ display: "flex", gap: 20, marginBottom: 24, fontSize: 12, color: "#555" }}>
              <button
                type="button"
                onClick={() => toggleWish(p.slug)}
                style={{ border: 0, background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: wished ? "#c83232" : "#555", fontSize: 12, padding: 0 }}
              >
                <Heart size={15} fill={wished ? "#c83232" : "none"} color={wished ? "#c83232" : "#555"} />
                {wished ? "Saved to Wishlist" : "Add to Wishlist"}
              </button>
              <button
                type="button"
                style={{ border: 0, background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "#555", fontSize: 12, padding: 0 }}
              >
                <Share2 size={15} color="#555" /> Share
              </button>
            </div>

            {/* Check Delivery Box */}
            <div style={{ background: "#faf8f5", border: "1px solid #e7e1d6", borderRadius: 6, padding: "16px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917", marginBottom: 8 }}>
                Check delivery availability
              </div>
              <form onSubmit={checkPincode} style={{ display: "flex", gap: 0, marginBottom: 6 }}>
                <input
                  type="text"
                  placeholder="Enter pincode"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                  style={{ flex: 1, padding: "8px 12px", border: "1px solid #d4cdbf", borderRight: 0, borderRadius: "4px 0 0 4px", fontSize: 12, outline: "none" }}
                />
                <button
                  type="submit"
                  disabled={checkingPincode}
                  style={{ background: "#1c1917", color: "#ffffff", border: 0, padding: "8px 16px", fontSize: 11, fontWeight: 800, letterSpacing: "1px", borderRadius: "0 4px 4px 0", cursor: "pointer", opacity: checkingPincode ? 0.7 : 1 }}
                >
                  {checkingPincode ? "CHECKING…" : "CHECK"}
                </button>
              </form>
              <div style={{ fontSize: 11, color: "#777" }}>
                {pincodeStatus || "Usually delivered in 3-5 days"}
              </div>
            </div>

            {/* Description (after the buy buttons, so they stay above the fold) */}
            {(() => {
              if (!p.description) return null;
              const cleaned = p.description.replace(/\\n/g, "\n");
              const isHtml = /<[a-z][\s\S]*>/i.test(cleaned);
              if (isHtml) {
                return (
                  <div
                    className="product-description-content text-stone-700 leading-relaxed mb-6"
                    style={{ fontSize: 13.5, color: "#555", lineHeight: 1.6, margin: "22px 0 0" }}
                    dangerouslySetInnerHTML={{ __html: cleaned }}
                  />
                );
              }
              return (
                <div style={{ fontSize: 13.5, color: "#555", lineHeight: 1.6, margin: "22px 0 0", whiteSpace: "pre-line" }}>
                  {cleaned}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Features Bar ────────────────────────────────────────── */}
        <div className="pdp-features">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#faf6f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ShieldCheck size={20} color="#a67c37" />
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917" }}>
                PREMIUM FABRIC
              </strong>
              <span style={{ fontSize: 11, color: "#777" }}>100% Cotton / Soft &amp; breathable</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#faf6f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <RotateCcw size={20} color="#a67c37" />
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917" }}>
                EASY RETURNS
              </strong>
              <span style={{ fontSize: 11, color: "#777" }}>Hassle free returns within 7 days</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#faf6f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Truck size={20} color="#a67c37" />
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917" }}>
                FREE SHIPPING
              </strong>
              <span style={{ fontSize: 11, color: "#777" }}>On orders above ₹999</span>
            </div>
          </div>
        </div>

        {/* ── 2-Column Section: Left Accordions + Right Customer Reviews ─────── */}
        <div className="pdp-grid pdp-lower">
          {/* Left: Accordions */}
          <div>
            {accordionItems.map((item) => {
              const isOpen = openAccordion === item.title;
              return (
                <div key={item.title} style={{ borderBottom: "1px solid #e7e1d6" }}>
                  <button
                    type="button"
                    onClick={() => setOpenAccordion(isOpen ? null : item.title)}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px 0",
                      background: "none",
                      border: 0,
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.5px",
                      color: "#1c1917",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <span>{item.title}</span>
                    {isOpen ? <ChevronUp size={16} color="#777" /> : <ChevronDown size={16} color="#777" />}
                  </button>
                  {isOpen && (
                    <div style={{ paddingBottom: 18, fontSize: 13, color: "#555", lineHeight: 1.6 }}>
                      {item.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: Customer Reviews */}
          <div style={{ background: "#ffffff", border: "1px solid #e7e1d6", borderRadius: 8, padding: "28px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#1c1917", margin: 0 }}>
                CUSTOMER REVIEWS
              </h3>
              {reviewsList.length > 3 && (
                <button type="button" onClick={() => setShowAllReviews((v) => !v)} style={{ fontSize: 11, color: "#777", textDecoration: "underline", background: "none", border: 0, cursor: "pointer", padding: 0 }}>
                  {showAllReviews ? "Show fewer" : `See all ${reviewsList.length}`}
                </button>
              )}
            </div>

            {/* Summary Box */}
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 20, alignItems: "center", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #e7e1d6" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 44, fontWeight: 800, color: "#1c1917", lineHeight: 1 }}>{p.reviews > 0 ? p.rating : "–"}</div>
                <div style={{ color: "#c5a028", fontSize: 13, margin: "4px 0" }}>{"★".repeat(starCount)}{"☆".repeat(5 - starCount)}</div>
                <div style={{ fontSize: 10.5, color: "#888" }}>{p.reviews > 0 ? `Based on ${p.reviews} review${p.reviews === 1 ? "" : "s"}` : "No reviews yet"}</div>
              </div>

              {/* Star Progress Bars */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {starRows.map((row) => (
                  <div key={row.stars} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#666" }}>
                    <span style={{ width: 18 }}>{row.stars}</span>
                    <div style={{ flex: 1, height: 6, background: "#eee", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${row.pct}%`, height: "100%", background: "#a67c37" }} />
                    </div>
                    <span style={{ width: 20, textAlign: "right", color: "#888" }}>{row.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowReviewModal(true)}
              style={{
                width: "100%",
                background: "#1c1917",
                color: "#c5a028",
                border: "1px solid #c5a028",
                padding: "12px",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "1px",
                textTransform: "uppercase",
                borderRadius: 4,
                cursor: "pointer",
                marginBottom: 24,
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#c5a028";
                e.currentTarget.style.color = "#1c1917";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#1c1917";
                e.currentTarget.style.color = "#c5a028";
              }}
            >
              ★ WRITE A REVIEW
            </button>

            {/* Write a Review Modal */}
            {showReviewModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                <div className="bg-[#fcfbfa] border border-[#e8e2d8] w-full max-w-lg rounded-sm shadow-2xl overflow-hidden p-6 relative animate-in fade-in zoom-in-95 duration-200">
                  <button
                    onClick={() => setShowReviewModal(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-[#12192c] text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
                  >
                    ✕
                  </button>

                  <div className="mb-4">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#c5a028] font-bold block mb-1">
                      Share Your Experience
                    </span>
                    <h3 className="font-serif text-xl font-bold text-[#12192c] uppercase tracking-wide">
                      Write a Review for {p.name}
                    </h3>
                  </div>

                  {reviewSuccessMsg ? (
                    <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-sm text-center text-emerald-800 font-medium">
                      ✓ {reviewSuccessMsg}
                    </div>
                  ) : (
                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                      {/* Rating Stars */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Overall Rating *
                        </label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="text-2xl transition-transform hover:scale-125 focus:outline-hidden"
                            >
                              <span className={(hoverRating || reviewRating) >= star ? "text-[#c5a028]" : "text-slate-300"}>
                                ★
                              </span>
                            </button>
                          ))}
                          <span className="text-xs font-mono text-slate-500 ml-2">
                            ({reviewRating} / 5 Stars)
                          </span>
                        </div>
                      </div>

                      {/* Name & Email */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Your Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Ananya Sharma"
                            value={reviewName}
                            onChange={(e) => setReviewName(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xs focus:border-[#c5a028] focus:outline-hidden bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Your Email
                          </label>
                          <input
                            type="email"
                            placeholder="ananya@example.com"
                            value={reviewEmail}
                            onChange={(e) => setReviewEmail(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xs focus:border-[#c5a028] focus:outline-hidden bg-white"
                          />
                        </div>
                      </div>

                      {/* Title */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Review Title
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Stunning Handblock Print & Super Soft Cotton!"
                          value={reviewTitle}
                          onChange={(e) => setReviewTitle(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xs focus:border-[#c5a028] focus:outline-hidden bg-white"
                        />
                      </div>

                      {/* Review Text */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Detailed Review *
                        </label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Tell us about the fabric quality, color fastness, stitch detail..."
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xs focus:border-[#c5a028] focus:outline-hidden bg-white resize-none"
                        />
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={reviewSubmitting}
                        className="w-full py-3 bg-[#12192c] hover:bg-[#1a2544] text-[#c5a028] font-bold text-xs uppercase tracking-widest border border-[#c5a028]/40 transition-all rounded-xs shadow-md"
                      >
                        {reviewSubmitting ? "Submitting review…" : "Submit review"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Dynamic Customer Reviews List */}
            <div className="space-y-4">
              {reviewsList.length === 0 && (
                <p style={{ fontSize: 12.5, color: "#777", margin: 0 }}>No reviews yet. Bought this piece? Be the first to review it.</p>
              )}
              {(showAllReviews ? reviewsList : reviewsList.slice(0, 3)).map((rev, idx) => {
                const initial = rev.customerName ? rev.customerName.charAt(0).toUpperCase() : "C";
                const starRating = Math.round(rev.rating || 5);

                return (
                  <div key={rev.id || idx} style={{ background: "#faf8f5", border: "1px solid #e7e1d6", borderRadius: 6, padding: "18px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#12192c", color: "#c5a028", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #c5a028" }}>
                          {initial}
                        </div>
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1c1917" }}>
                            {rev.customerName}{rev.verified && <span style={{ fontSize: 10, color: "#2e7d32", fontWeight: 600, marginLeft: 4 }}>✓ Verified Buyer</span>}
                          </div>
                          <div style={{ color: "#c5a028", fontSize: 11 }}>{"★".repeat(starRating)}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 10.5, color: "#888" }}>
                        {rev.createdAt ? (rev.createdAt.includes("T") ? new Date(rev.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : rev.createdAt) : "Just now"}
                      </span>
                    </div>

                    {rev.title && (
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: "#12192c", margin: "0 0 4px" }}>
                        {rev.title}
                      </h4>
                    )}

                    <p style={{ fontSize: 12.5, color: "#444", lineHeight: 1.5, margin: "0 0 12px" }}>
                      {rev.review}
                    </p>

                    {rev.photoUrl && (
                      <div style={{ width: 70, height: 70, borderRadius: 6, overflow: "hidden", border: "1px solid #c5a028", marginTop: 8 }}>
                        <img src={rev.photoUrl} alt="Customer review photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── YOU MAY ALSO LIKE ───────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 className="serif" style={{ fontSize: 24, fontWeight: 600, color: "#1c1917", margin: 0 }}>
              YOU MAY ALSO LIKE
            </h2>
            <Link href="/shop" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#a67c37", textDecoration: "none" }}>
              VIEW ALL
            </Link>
          </div>

          <div className="pdp-related">
            {youMayLike.map((x) => (
              <ProductCard key={x.slug} p={x} />
            ))}
          </div>
        </section>

        {/* ── PROMO COUPON BANNER ───────────────────────────── */}
        <div
          style={{
            background: "#faf5ed",
            border: "1px solid #e7dfd2",
            borderRadius: 8,
            padding: "24px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#ffffff", border: "1px solid #e2d7c5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Gift size={24} color="#a67c37" />
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 14, fontWeight: 800, color: "#1c1917", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                10% OFF ON YOUR FIRST ORDER
              </strong>
              <span style={{ fontSize: 12, color: "#666" }}>
                Use code: <strong style={{ color: "#a67c37" }}>WELCOME10</strong>
              </span>
            </div>
          </div>

          <Link
            href="/shop"
            style={{
              background: "#a67c37",
              color: "#ffffff",
              padding: "12px 24px",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "1px",
              textTransform: "uppercase",
              borderRadius: 4,
              textDecoration: "none"
            }}
          >
            SHOP NOW
          </Link>
        </div>
      </div>
    </main>
  );
}
