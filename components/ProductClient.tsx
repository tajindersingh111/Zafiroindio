"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Heart, Share2, Minus, Plus, ChevronDown, ChevronUp,
  Truck, RotateCcw, ShieldCheck, Star
} from "lucide-react";
import ProductCard from "./ProductCard";
import { Product, products } from "@/lib/data";
import { useStore } from "./StoreProvider";

export default function ProductClient({ p }: { p: Product }) {
  const [img, setImg] = useState(0);
  const [size, setSize] = useState(p.sizes[1] || p.sizes[0]);
  const [color, setColor] = useState(p.colors[0]);
  const [qty, setQtyLocal] = useState(1);
  const [pincode, setPincode] = useState("");
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const { add, toggleWish, wishlist } = useStore();
  const wished = wishlist.includes(p.slug);

  const starCount = Math.round(p.rating);

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

  const related = products.filter(x => x.slug !== p.slug && x.category === p.category).slice(0, 4);
  const youMayLike = related.length >= 4 ? related : [...related, ...products.filter(x => x.slug !== p.slug && !related.includes(x))].slice(0, 4);

  return (
    <main className="productPage">
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link href="/">Home</Link> /{" "}
          <Link href="/shop">Shop</Link> /{" "}
          <Link href={`/shop?collection=${p.category.toLowerCase()}`}>{p.category}</Link> /{" "}
          <span>{p.name}</span>
        </div>

        {/* ── Product Top Layout ──────────────────────────── */}
        <div className="productTop">
          {/* Left: Image Gallery */}
          <div className="gallery">
            {/* Thumbnails */}
            <div className="thumbs">
              {p.images.map((x, i) => (
                <button
                  className={`thumb${i === img ? " active" : ""}`}
                  key={x}
                  onClick={() => setImg(i)}
                  aria-label={`View image ${i + 1}`}
                >
                  <img
                    src={x}
                    alt={`${p.name} view ${i + 1}`}
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85";
                    }}
                  />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <div className="mainImage">
              <img
                src={p.images[img] || p.images[0]}
                alt={`${p.name} styled bedroom`}
                key={p.images[img]}
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85";
                }}
              />
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="productInfo">
            <p className="productCat">{p.category}</p>
            <h1 className="serif">{p.name}</h1>

            {/* Rating */}
            <div className="productRating">
              <span className="stars">
                {"★".repeat(starCount)}{"☆".repeat(5 - starCount)}
              </span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{p.rating}</span>
              <span className="rCount">({p.reviews} reviews)</span>
            </div>

            {/* Price */}
            <div className="bigPrice">
              <span className="curr">₹{p.price.toLocaleString("en-IN")}</span>
              <span className="was">₹{p.oldPrice.toLocaleString("en-IN")}</span>
              <span className="off">{p.discount}% OFF</span>
            </div>
            <p className="taxNote">Inclusive of all taxes. Free shipping above ₹999.</p>

            {/* Description */}
            <p className="productDescription">{p.description}</p>

            {/* Size */}
            <div className="optionTitle">
              SELECT SIZE — <em style={{ fontStyle: "normal", fontWeight: 600, color: "var(--gold-dark)" }}>{size}</em>
              <Link href="/about" style={{ fontWeight: 600, textDecoration: "underline", color: "var(--muted)", fontSize: 11, textTransform: "none", letterSpacing: 0 }}>
                Size Guide
              </Link>
            </div>
            <div className="options">
              {p.sizes.map(s => (
                <button
                  className={`option${s === size ? " selected" : ""}`}
                  onClick={() => setSize(s)}
                  key={s}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Color */}
            <div className="optionTitle">
              SELECT COLOR — <em style={{ fontStyle: "normal", fontWeight: 600, color: "var(--gold-dark)" }}>{color}</em>
            </div>
            <div className="swatches">
              {p.colors.map((c, i) => (
                <button
                  className={`swatch${c === color ? " selected" : ""}`}
                  onClick={() => setColor(c)}
                  key={c}
                  title={c}
                  aria-label={c}
                >
                  <img src={p.images[i % p.images.length]} alt={c} />
                </button>
              ))}
            </div>

            {/* Quantity */}
            <div className="optionTitle">QUANTITY</div>
            <div className="qty">
              <button onClick={() => setQtyLocal(Math.max(1, qty - 1))} aria-label="Decrease quantity">
                <Minus size={14} />
              </button>
              <span>{qty}</span>
              <button onClick={() => setQtyLocal(qty + 1)} aria-label="Increase quantity">
                <Plus size={14} />
              </button>
            </div>

            {/* CTA Buttons */}
            <div className="buyStack">
              <button
                className="btn gold full"
                onClick={() => { for (let i = 0; i < qty; i++) add(p, size, color); }}
                style={{ padding: "15px 22px", fontSize: 12 }}
              >
                Add to Cart
              </button>
              <Link
                className="btn dark full"
                href="/checkout"
                onClick={() => add(p, size, color)}
                style={{ padding: "15px 22px", fontSize: 12 }}
              >
                Buy It Now
              </Link>
            </div>

            {/* Secondary Actions */}
            <div className="secondaryActions">
              <button onClick={() => toggleWish(p.slug)}>
                <Heart size={16} fill={wished ? "currentColor" : "none"} />
                {wished ? "Saved to Wishlist" : "Add to Wishlist"}
              </button>
              <button>
                <Share2 size={16} /> Share
              </button>
            </div>

            {/* Delivery Check */}
            <div className="delivery">
              <strong>Check Delivery Availability</strong>
              <form onSubmit={e => e.preventDefault()}>
                <input
                  placeholder="Enter PIN code"
                  inputMode="numeric"
                  maxLength={6}
                  value={pincode}
                  onChange={e => setPincode(e.target.value.replace(/\D/g, ""))}
                />
                <button type="button">CHECK</button>
              </form>
              <small>Usually delivered in 3–5 business days</small>
            </div>

            {/* Benefits */}
            <div className="productBenefits">
              <div className="productBenefit">
                <Truck size={18} className="icon" />
                <strong>Free Shipping</strong>
                <span>Orders above ₹999</span>
              </div>
              <div className="productBenefit">
                <RotateCcw size={18} className="icon" />
                <strong>Easy Returns</strong>
                <span>Within 7 days</span>
              </div>
              <div className="productBenefit">
                <ShieldCheck size={18} className="icon" />
                <strong>Premium Fabric</strong>
                <span>Quality guaranteed</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Accordion + Reviews ─────────────────────────── */}
        <div className="infoReviews">
          {/* Accordion */}
          <div className="accordion">
            {accordionItems.map(item => (
              <div key={item.title}>
                <div
                  className="acc"
                  onClick={() => setOpenAccordion(openAccordion === item.title ? null : item.title)}
                >
                  {item.title}
                  {openAccordion === item.title
                    ? <ChevronUp size={15} />
                    : <ChevronDown size={15} />
                  }
                </div>
                {openAccordion === item.title && (
                  <div style={{ padding: "12px 0 18px", fontSize: 13, color: "var(--muted)", lineHeight: 1.75, borderBottom: "1px solid var(--line)" }}>
                    {item.content}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Reviews */}
          <div className="reviewBox">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Customer Reviews</div>
            <div className="reviewScore">{p.rating}</div>
            <div className="stars">{"★".repeat(starCount)}{"☆".repeat(5 - starCount)}</div>
            <p style={{ color: "var(--muted)", fontSize: 12, margin: "6px 0 16px" }}>
              Based on {p.reviews} verified reviews
            </p>

            <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
              <button className="btn gold" style={{ fontSize: 10, padding: "10px 16px" }}>
                Write a Review
              </button>
            </div>

            {/* Star distribution */}
            {[5, 4, 3, 2, 1].map(n => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "var(--gold)", width: 14 }}>{n}★</span>
                <div style={{ flex: 1, height: 6, background: "#eee", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      background: "var(--gold)",
                      borderRadius: 3,
                      width: `${n === 5 ? 70 : n === 4 ? 20 : n === 3 ? 7 : 2}%`
                    }}
                  />
                </div>
                <span style={{ fontSize: 10, color: "var(--muted)", width: 28, textAlign: "right" }}>
                  {n === 5 ? "70%" : n === 4 ? "20%" : n === 3 ? "7%" : n === 2 ? "2%" : "1%"}
                </span>
              </div>
            ))}

            <div className="reviewCard">
              <strong style={{ color: "var(--gold)" }}>★★★★★</strong>
              <strong style={{ display: "block", marginTop: 6 }}>"Beautiful quality and so soft."</strong>
              <p>The print looks even better in person. Totally worth it. The fabric is smooth and breathable — perfect for Indian summers.</p>
              <p className="meta">Priya M. · Verified Purchase · 2 weeks ago</p>
            </div>

            <div className="reviewCard">
              <strong style={{ color: "var(--gold)" }}>★★★★★</strong>
              <strong style={{ display: "block", marginTop: 6 }}>"Love the design!"</strong>
              <p>Exactly as shown in the photos. Great packaging, fast delivery. Will definitely order again.</p>
              <p className="meta">Rahul S. · Verified Purchase · 1 month ago</p>
            </div>
          </div>
        </div>

        {/* ── You May Also Like ───────────────────────────── */}
        <section className="section" style={{ paddingBottom: 0 }}>
          <div className="sectionHead">
            <h2 className="serif">You May Also Like</h2>
            <Link href="/shop" className="link">View All</Link>
          </div>
          <div className="products">
            {youMayLike.map(x => (
              <ProductCard key={x.slug} p={x} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
