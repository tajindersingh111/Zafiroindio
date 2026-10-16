"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Share2, Minus, Plus, ChevronDown, ChevronUp, RotateCcw, Search, ShoppingCart, Gift, ShieldCheck, X, Layers, Hash, Stamp, Ruler, Package, Leaf, Droplets, Lock, HandHeart, type LucideIcon } from "lucide-react";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/data";
import { useCatalog } from "@/lib/storefront/useCatalog";
import { useStore } from "./StoreProvider";
import ShiprocketCheckoutButton from "./ShiprocketCheckoutButton";
import { img as optimizedImg, imgSrcSet, fallbackToOriginal } from "@/lib/img";

const SPEC_ICONS: Record<string, LucideIcon> = {
  fabric: Layers,
  weight: Hash,
  craft: Stamp,
  size: Ruler,
  includes: Package,
  dye: Leaf,
  care: Droplets,
};

/** `story` / `makers`: server-rendered sections; the story follows the buy box, the makers follow the reviews. */
export default function ProductClient({ p, story, makers }: { p: Product; story?: React.ReactNode; makers?: React.ReactNode }) {
  const [img, setImg] = useState(0);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Extract all variation attributes safely across variations
  const variationAttributeMap = useMemo(() => {
    if (!p.variations || !Array.isArray(p.variations) || p.variations.length === 0) return {};
    const map: Record<string, string[]> = {};
    for (const v of p.variations) {
      if (Array.isArray(v.attributes)) {
        for (const a of v.attributes) {
          if (a?.name && a?.value) {
            const k = a.name.trim();
            const val = String(a.value).trim();
            if (!map[k]) map[k] = [];
            if (!map[k].includes(val)) map[k].push(val);
          }
        }
      } else if (typeof v.attributes === "object" && v.attributes !== null) {
        for (const [k, val] of Object.entries(v.attributes)) {
          if (k && val) {
            const key = k.trim();
            const strVal = String(val).trim();
            if (!map[key]) map[key] = [];
            if (!map[key].includes(strVal)) map[key].push(strVal);
          }
        }
      }
    }
    return map;
  }, [p.variations]);

  const sizeKey = useMemo(() => Object.keys(variationAttributeMap).find((k) => k.toLowerCase().includes("size")), [variationAttributeMap]);
  const colorKey = useMemo(() => Object.keys(variationAttributeMap).find((k) => k.toLowerCase().includes("color")), [variationAttributeMap]);

  const allSizes = useMemo(() => {
    if (p.sizes && p.sizes.length > 0) return p.sizes;
    if (sizeKey && variationAttributeMap[sizeKey]?.length > 0) return variationAttributeMap[sizeKey];
    return [];
  }, [p.sizes, sizeKey, variationAttributeMap]);

  const allColors = useMemo(() => {
    if (p.colors && p.colors.length > 0) return p.colors;
    if (colorKey && variationAttributeMap[colorKey]?.length > 0) return variationAttributeMap[colorKey];
    return [];
  }, [p.colors, colorKey, variationAttributeMap]);

  // Other custom attributes that are neither size nor color
  const otherAttributes = useMemo(() => {
    return Object.entries(variationAttributeMap).filter(([k]) => {
      const lower = k.toLowerCase();
      return !lower.includes("size") && !lower.includes("color");
    });
  }, [variationAttributeMap]);

  const [size, setSize] = useState(() => (allSizes[1] || allSizes[0] || ""));
  const [color, setColor] = useState(() => (allColors[0] || ""));
  const [selectedCustomAttrs, setSelectedCustomAttrs] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const [k, vals] of otherAttributes) {
      if (vals.length > 0) init[k] = vals[0];
    }
    return init;
  });

  // Find matching variation based on size, color, and selected custom attributes
  const matchingVariation = useMemo(() => {
    if (!p.variations || !Array.isArray(p.variations) || p.variations.length === 0) return null;
    return (
      p.variations.find((v) => {
        if (!v.attributes) return false;
        if (Array.isArray(v.attributes)) {
          return v.attributes.every((a) => {
            const nameLower = (a.name || "").toLowerCase();
            if (nameLower.includes("size") && size) return a.value?.toLowerCase() === size.toLowerCase();
            if (nameLower.includes("color") && color) return a.value?.toLowerCase() === color.toLowerCase();
            if (selectedCustomAttrs[a.name]) return a.value?.toLowerCase() === selectedCustomAttrs[a.name].toLowerCase();
            return true;
          });
        } else if (typeof v.attributes === "object" && v.attributes !== null) {
          return Object.entries(v.attributes).every(([k, val]) => {
            const nameLower = k.toLowerCase();
            if (nameLower.includes("size") && size) return String(val).toLowerCase() === size.toLowerCase();
            if (nameLower.includes("color") && color) return String(val).toLowerCase() === color.toLowerCase();
            if (selectedCustomAttrs[k]) return String(val).toLowerCase() === selectedCustomAttrs[k].toLowerCase();
            return true;
          });
        }
        return false;
      }) || p.variations[0]
    );
  }, [p.variations, size, color, selectedCustomAttrs]);

  const currentPrice = matchingVariation ? (matchingVariation.salePrice || matchingVariation.price || p.price) : p.price;
  const currentOldPrice = matchingVariation ? (matchingVariation.salePrice ? matchingVariation.price : (p.oldPrice || p.price)) : p.oldPrice;
  const currentDiscount = currentOldPrice > currentPrice ? Math.round(((currentOldPrice - currentPrice) / currentOldPrice) * 100) : 0;
  const isOutOfStock = matchingVariation ? (matchingVariation.stockStatus === "out_of_stock" || matchingVariation.stock <= 0) : (p.badge === "SOLD OUT");
  const lowStockCount = matchingVariation ? (matchingVariation.stock > 0 && matchingVariation.stock <= 5 ? matchingVariation.stock : undefined) : p.lowStock;

  const [qty, setQtyLocal] = useState(1);
  const [pincode, setPincode] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const { add, toggleWish, wishlist, cartCount, subtotal } = useStore();
  // Confirmation drawer after Add to Cart (the cart badge alone is easy to miss).
  const [addedQty, setAddedQty] = useState(0);
  const [shareMsg, setShareMsg] = useState("");
  const addToCart = () => {
    const productToAdd = matchingVariation ? { ...p, price: currentPrice, oldPrice: currentOldPrice } : p;
    for (let i = 0; i < qty; i++) add(productToAdd, size, color);
    setAddedQty(qty);
  };
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: p.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setShareMsg("Link copied");
        setTimeout(() => setShareMsg(""), 2000);
      }
    } catch {
      // Share sheet dismissed.
    }
  };
  const toReviews = () => document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
  // Sizes live in the specifications list below the buy box.
  const openSizeGuide = () => {
    setOpenAccordion("SPECIFICATIONS");
    requestAnimationFrame(() => document.getElementById("pdp-details")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const wished = wishlist.includes(p.slug);

  const starCount = Math.round(p.rating || 0);

  const scrollToImage = (index: number) => {
    setImg(index);
    const el = document.getElementById(`product-img-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const specs = p.specs ?? [];
  // The grid under the price shows the deciding facts; care goes in the full list below.
  const gridSpecs = specs.filter((s) => s.key !== "care").slice(0, 6);

  // The description itself is shown in the story section below the buy box.
  const accordionItems: { title: string; content: React.ReactNode }[] = [
    ...(specs.length
      ? [{
          title: "SPECIFICATIONS",
          content: (
            <dl className="pdp-spec-list">
              {specs.map((s) => (
                <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>
              ))}
            </dl>
          ),
        }]
      : []),
    { title: "SHIPPING INFORMATION", content: "Orders are dispatched within 1–2 business days. Delivery across India in 3–5 business days, depending on your location." },
    {
      title: "RETURNS & EXCHANGE",
      content: (
        <>
          Damaged products can be returned; everything else is exchange only, within 7 days of delivery. An unboxing video
          is mandatory for every request. <Link href="/return-policy" className="rich-link">Read the full policy</Link>
        </>
      ),
    },
  ];

  // Phones: a slim add-to-cart bar once the main button has scrolled away.
  const buyRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowStickyBar(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const { products: catalogProducts } = useCatalog();
  // Same category first, then the rest of the catalogue.
  const others = catalogProducts.filter((x) => x.slug !== p.slug && x.badge !== "SOLD OUT");
  const youMayLike = [...others.filter((x) => x.category === p.category), ...others.filter((x) => x.category !== p.category)].slice(0, 5);

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
  // The strongest approved review to quote in the buy box: 4★ or more, readable length, with a name.
  const topReview = reviewsList
    .filter((r) => Number(r.rating) >= 4 && typeof r.review === "string" && r.review.trim().length >= 30 && r.customerName)
    .sort((a, b) => Number(b.rating) - Number(a.rating) || Number(!!b.verified) - Number(!!a.verified) || Math.abs(a.review.length - 140) - Math.abs(b.review.length - 140))[0];
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
    if (!lightboxImg && !showReviewModal && !addedQty) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setLightboxImg(null);
      setShowReviewModal(false);
      setAddedQty(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxImg, showReviewModal, addedQty]);

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

      <div className="container" style={{ maxWidth: 1240, margin: "0 auto" }}>
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

              {/* Craft notes fill the column when there are 2 or fewer photos */}
              {(gallery.length <= 2) && (
                <div className="pdp-craft">
                  <h4 style={{ fontSize: 12, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#1c1917", marginBottom: 14 }}>
                    MADE BY HAND IN JAIPUR
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {[
                      ["Printed by artisans", "Each design is stamped by hand with carved wooden blocks."],
                      ["One of a kind", "Small shifts in colour and alignment are the mark of hand printing, not flaws."],
                      ["7-day exchange", "Exchange within 7 days of delivery; damaged pieces are returned. Keep an unboxing video."],
                      ["Secure checkout", "Payments go through an encrypted, secure checkout."],
                    ].map(([t, d]) => (
                      <div key={t} style={{ background: "#faf8f5", padding: "14px 16px", borderRadius: 6, border: "1px solid #eee8dd" }}>
                        <strong style={{ fontSize: 12, color: "#1c1917", display: "block", marginBottom: 4 }}>{t}</strong>
                        <span style={{ fontSize: 11, color: "#666", lineHeight: 1.4, display: "block" }}>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {gallery.length > 1 && <div className="pdp-count" aria-hidden="true">{img + 1} / {gallery.length}</div>}
            {gallery.length > 1 && (
              <div className="pdp-dots" aria-hidden="true">
                {gallery.map((_, i) => <i key={i} className={i === img ? "on" : ""} />)}
              </div>
            )}
          </div>

          {/* Right: Product Details & Controls (Sticky) */}
          <div className="pdp-info">
            <h1 className="serif pdp-title">{p.name}</h1>

            {/* Rating Row (only once there are reviews) */}
            {p.reviews > 0 && <button type="button" onClick={toReviews} className="pdp-rating" aria-label={`Rated ${p.rating} out of 5, ${p.reviews} reviews. Read reviews`}>
              <span style={{ color: "#c5a028", fontSize: 14 }}>
                {"★".repeat(starCount)}{"☆".repeat(5 - starCount)}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{p.rating}</span>
              <span style={{ fontSize: 12, color: "#777", textDecoration: "underline", textUnderlineOffset: 3 }}>{p.reviews} {p.reviews === 1 ? "review" : "reviews"}</span>
            </button>}

            {/* Price Row */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#1c1917" }}>₹{currentPrice.toLocaleString("en-IN")}</span>
              {currentOldPrice > currentPrice && (
                <>
                  <span style={{ fontSize: 14, color: "#888", textDecoration: "line-through" }}>₹{currentOldPrice.toLocaleString("en-IN")}</span>
                  {currentDiscount > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#c83232" }}>{currentDiscount}% OFF</span>
                  )}
                </>
              )}
            </div>
            <div className="pdp-price-note">
              {currentOldPrice > currentPrice && <span className="pdp-save">You save ₹{(currentOldPrice - currentPrice).toLocaleString("en-IN")}</span>}
              <span>Inclusive of all taxes</span>
            </div>
            {isOutOfStock ? (
              <div style={{ color: "#c83232", fontSize: 12, fontWeight: 700, margin: "6px 0 10px" }}>
                Currently Out of Stock
              </div>
            ) : lowStockCount ? (
              <div className="pdp-low">
                <i aria-hidden="true" />
                Only {lowStockCount} left in stock
              </div>
            ) : null}

            {matchingVariation?.sku && (
              <div style={{ fontSize: 11, color: "#888", margin: "4px 0 12px" }}>
                SKU: <span style={{ fontWeight: 600, color: "#444" }}>{matchingVariation.sku}</span>
              </div>
            )}

            {/* Key specs, before any choice is asked of the shopper */}
            {gridSpecs.length > 0 && (
              <div className="pdp-specs">
                {gridSpecs.map((s) => {
                  const Icon = SPEC_ICONS[s.key] ?? Layers;
                  return (
                    <div key={s.label} className="pdp-spec">
                      <i className="pdp-spec-ic" aria-hidden="true"><Icon size={15} strokeWidth={1.7} /></i>
                      <div>
                        <span>{s.label}</span>
                        <strong>{s.value}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Select Size */}
            {allSizes.length > 0 && <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#1c1917" }}>
                  SELECT SIZE
                </span>
                {specs.length > 0 && (
                  <button type="button" onClick={openSizeGuide} style={{ fontSize: 11, color: "#777", textDecoration: "underline", background: "none", border: 0, padding: 0, cursor: "pointer" }}>
                    Size Guide
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {allSizes.map((s) => (
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
            {allColors.length > 0 && <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#1c1917", marginBottom: 10 }}>
                SELECT COLOR: <span style={{ fontWeight: 600, color: "#a67c37", textTransform: "none" }}>{color}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {allColors.map((c, i) => (
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

            {/* Custom Attributes (e.g. Pack, Fabric, Type) */}
            {otherAttributes.map(([attrName, vals]) => (
              <div key={attrName} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#1c1917", marginBottom: 10 }}>
                  SELECT {attrName.toUpperCase()}: <span style={{ fontWeight: 600, color: "#a67c37", textTransform: "none" }}>{selectedCustomAttrs[attrName] || vals[0]}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {vals.map((v) => {
                    const active = (selectedCustomAttrs[attrName] || vals[0]) === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setSelectedCustomAttrs((prev) => ({ ...prev, [attrName]: v }))}
                        style={{
                          padding: "8px 18px",
                          fontSize: 12,
                          fontWeight: 600,
                          border: active ? "1.5px solid #1c1917" : "1px solid #d4cdbf",
                          background: active ? "#faf6f0" : "#ffffff",
                          color: "#1c1917",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Fallback Variation Selector if no individual attributes detected */}
            {allSizes.length === 0 && allColors.length === 0 && otherAttributes.length === 0 && p.variations && p.variations.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#1c1917", marginBottom: 10 }}>
                  SELECT OPTION
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {p.variations.map((v, i) => {
                    const label = Array.isArray(v.attributes)
                      ? v.attributes.map((a) => a.value).filter(Boolean).join(" / ")
                      : v.sku || `Option ${i + 1}`;
                    const active = matchingVariation?.id === v.id;
                    return (
                      <button
                        key={v.id || i}
                        type="button"
                        onClick={() => {
                          if (Array.isArray(v.attributes) && v.attributes[0]) {
                            setSize(v.attributes[0].value);
                          }
                        }}
                        style={{
                          padding: "8px 18px",
                          fontSize: 12,
                          fontWeight: 600,
                          border: active ? "1.5px solid #1c1917" : "1px solid #d4cdbf",
                          background: active ? "#faf6f0" : "#ffffff",
                          color: "#1c1917",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        {label || `Option ${i + 1}`} — ₹{(v.salePrice || v.price).toLocaleString("en-IN")}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
            <div ref={buyRef} style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={addToCart}
                style={{
                  width: "100%",
                  background: isOutOfStock ? "#a8a29e" : "#a67c37",
                  color: "#ffffff",
                  border: 0,
                  padding: "15px 20px",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  borderRadius: 4,
                  cursor: isOutOfStock ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "background 0.2s ease"
                }}
                onMouseEnter={(e) => { if (!isOutOfStock) e.currentTarget.style.background = "#8e682c"; }}
                onMouseLeave={(e) => { if (!isOutOfStock) e.currentTarget.style.background = "#a67c37"; }}
              >
                <ShoppingCart size={16} /> {isOutOfStock ? "OUT OF STOCK" : "ADD TO CART"}
              </button>

              {!isOutOfStock && (
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
                onClick={share}
                style={{ border: 0, background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "#555", fontSize: 12, padding: 0 }}
              >
                <Share2 size={15} color="#555" /> {shareMsg || "Share"}
              </button>
            </div>

            {/* One real customer voice next to the buy button */}
            {topReview && (
              <figure className="pdp-quote">
                <div className="pdp-quote-stars" aria-label={`${Math.round(Number(topReview.rating))} out of 5`}>{"★".repeat(Math.round(Number(topReview.rating)))}</div>
                <blockquote>“{topReview.review.length > 170 ? topReview.review.slice(0, 167).trimEnd() + "…" : topReview.review}”</blockquote>
                <figcaption>
                  <span>{topReview.customerName}{topReview.verified ? " · Verified buyer" : ""}</span>
                  {reviewsList.length > 1 && <button type="button" onClick={toReviews}>Read all {reviewsList.length} reviews</button>}
                </figcaption>
              </figure>
            )}

            {/* Trust row */}
            <div className="pdp-trust">
              <div><Lock size={18} strokeWidth={1.6} /><span>Secure Checkout</span></div>
              <Link href="/return-policy"><RotateCcw size={18} strokeWidth={1.6} /><span>7-Day Exchange</span></Link>
              <div><HandHeart size={18} strokeWidth={1.6} /><span>Handcrafted in Jaipur</span></div>
            </div>

            {/* PIN check */}
            <div className="pdp-delivery">
              <form onSubmit={checkPincode} className="pdp-pin">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter PIN code"
                  aria-label="PIN code"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                />
                <button type="submit" disabled={checkingPincode}>{checkingPincode ? "CHECKING…" : "CHECK"}</button>
              </form>
              {pincodeStatus && <div className="pdp-pin-status">{pincodeStatus}</div>}
            </div>

            {/* Details, under the buy box (content stays in the page for search engines when closed) */}
            <div className="pdp-acc" id="pdp-details">
              {accordionItems.map((item) => {
                const isOpen = openAccordion === item.title;
                return (
                  <div key={item.title} className="pdp-acc-item">
                    <button type="button" aria-expanded={isOpen} onClick={() => setOpenAccordion(isOpen ? null : item.title)}>
                      <span>{item.title}</span>
                      {isOpen ? <ChevronUp size={16} color="#777" /> : <ChevronDown size={16} color="#777" />}
                    </button>
                    <div className="pdp-acc-body" hidden={!isOpen}>{item.content}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {story}

        {/* ── Customer Reviews ─────── */}
        <div className="pdp-lower" id="reviews">
          <div className="pdp-reviews-card">
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

        {makers}

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
        <div className="pdp-promo">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: "50%", background: "#ffffff", border: "1px solid #e2d7c5", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
              textDecoration: "none",
              textAlign: "center"
            }}
          >
            SHOP NOW
          </Link>
        </div>
      </div>

      {/* Added-to-cart confirmation */}
      {addedQty > 0 && (
        <div className="pdp-added-backdrop" onClick={() => setAddedQty(0)}>
          <div className="pdp-added" role="dialog" aria-modal="true" aria-label="Added to cart" onClick={(e) => e.stopPropagation()}>
            <div className="pdp-added-head">
              <span><ShieldCheck size={18} /> Added to your cart</span>
              <button type="button" aria-label="Close" onClick={() => setAddedQty(0)}><X size={18} /></button>
            </div>
            <div className="pdp-added-item">
              <img src={optimizedImg(gallery[0] || p.images[0], 256)} onError={fallbackToOriginal(gallery[0] || p.images[0])} alt="" />
              <div>
                <strong>{p.name}</strong>
                <span>{[size, color].filter(Boolean).join(" · ")}{size || color ? " · " : ""}Qty {addedQty}</span>
                <b>₹{(p.price * addedQty).toLocaleString("en-IN")}</b>
              </div>
            </div>
            <div className="pdp-added-total">
              <span>Cart subtotal ({cartCount} {cartCount === 1 ? "item" : "items"})</span>
              <strong>₹{subtotal.toLocaleString("en-IN")}</strong>
            </div>
            <ShiprocketCheckoutButton label="CHECKOUT NOW" className="btn-buy-now" source="cart" onBeforeStart={() => setAddedQty(0)} />
            <div className="pdp-added-links">
              <Link href="/cart">View cart</Link>
              <button type="button" onClick={() => setAddedQty(0)}>Continue shopping</button>
            </div>
            {youMayLike.length > 0 && (
              <div className="pdp-added-more">
                <span>Pairs well with</span>
                <div>
                  {youMayLike.slice(0, 2).map((x) => (
                    <Link key={x.slug} href={`/products/${x.slug}`} onClick={() => setAddedQty(0)}>
                      <img src={optimizedImg(x.images[0], 256)} onError={fallbackToOriginal(x.images[0])} alt="" loading="lazy" />
                      <em>{x.name}</em>
                      <b>₹{x.price.toLocaleString("en-IN")}</b>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {p.badge !== "SOLD OUT" && (
        <div className={`pdp-sticky${showStickyBar ? " on" : ""}`} aria-hidden={!showStickyBar}>
          <div className="pdp-sticky-price">
            <strong>₹{p.price.toLocaleString("en-IN")}</strong>
            {p.oldPrice > p.price && <span>{p.discount}% off</span>}
          </div>
          <button type="button" className="pdp-sticky-add" tabIndex={showStickyBar ? 0 : -1} onClick={addToCart}>
            ADD TO CART
          </button>
          <ShiprocketCheckoutButton
            label="BUY NOW"
            items={[{ productId: p.slug, qty, size, color }]}
            source="buy-now"
            className="pdp-sticky-buy"
            style={{}}
          />
        </div>
      )}
    </main>
  );
}
