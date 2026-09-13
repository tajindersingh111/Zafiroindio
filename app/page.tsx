import Link from "next/link";
import { ArrowRight, Leaf, Sparkles, RotateCcw, ShieldCheck } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { getStorefrontProducts, collections } from "@/lib/data";

export default function Home() {
  const products = getStorefrontProducts();
  const featured = products.filter(p => p.badge === "BESTSELLER" || !p.badge).slice(0, 8);

  return (
    <main>
      {/* ── 1. HERO SECTION ──────────────────────────────────── */}
      <section className="hero">
        <img
          src="https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=2000&q=85"
          alt="Zafiro premium bedsheet bedroom lifestyle"
          className="heroImg"
        />
        <div className="container">
          <div className="heroContent">
            <p className="eyebrow">Welcome to Zafiro</p>
            <h1 className="serif">
              Make Your Bedroom Feel Like Home.
            </h1>
            <p>
              Beautiful bedsheets designed for everyday comfort and timeless style.
            </p>
            <div className="heroBtns">
              <Link href="/shop" className="btn gold">
                Shop Bedsheets <ArrowRight size={14} />
              </Link>
              <Link href="/collections" className="btn outline">
                Explore Collections
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. VALUE PROPOSITION BAR ─────────────────────────── */}
      <div className="valuebar">
        <div className="value">
          <span className="valueIcon"><Leaf size={18} /></span>
          <div>
            <strong>Premium Fabrics</strong>
            <span>Thoughtfully selected for comfort.</span>
          </div>
        </div>
        <div className="value">
          <span className="valueIcon"><Sparkles size={18} /></span>
          <div>
            <strong>Beautiful Designs</strong>
            <span>Made to elevate your space.</span>
          </div>
        </div>
        <div className="value">
          <span className="valueIcon"><RotateCcw size={18} /></span>
          <div>
            <strong>Easy Returns</strong>
            <span>Shop with confidence.</span>
          </div>
        </div>
        <div className="value">
          <span className="valueIcon"><ShieldCheck size={18} /></span>
          <div>
            <strong>Secure Payments</strong>
            <span>Safe and seamless checkout.</span>
          </div>
        </div>
      </div>

      {/* ── 3. SHOP BY COLLECTION ────────────────────────────── */}
      <section className="section" style={{ background: "var(--paper)" }}>
        <div className="container">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">Curated for You</p>
              <h2 className="serif">Shop by Collection</h2>
            </div>
            <Link className="link" href="/collections">
              View All <ArrowRight size={13} style={{ display: "inline", verticalAlign: "middle" }} />
            </Link>
          </div>

          <div className="collections">
            {collections.map((c) => (
              <Link
                href={`/shop?collection=${c.slug}`}
                className="collection"
                key={c.slug}
              >
                <img
                  src={c.image}
                  alt={c.name}
                  className="collectionImg"
                  loading="lazy"
                />
                <div className="collectionText">
                  {c.name}
                  <small>{c.desc.substring(0, 38)}…</small>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. FEATURED PRODUCTS ─────────────────────────────── */}
      <section className="section" style={{ background: "var(--cream)", borderTop: "1px solid var(--line)" }}>
        <div className="container">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">Handpicked for You</p>
              <h2 className="serif">Loved by Zafiro Homes</h2>
            </div>
            <Link className="link" href="/shop">
              View All ({products.length}) <ArrowRight size={13} style={{ display: "inline", verticalAlign: "middle" }} />
            </Link>
          </div>

          <div className="products">
            {featured.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. EDITORIAL BANNER ──────────────────────────────── */}
      <section
        style={{
          background: "var(--soft)",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
          padding: "64px 0",
          textAlign: "center"
        }}
      >
        <div className="container" style={{ maxWidth: 640 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>Our Promise</p>
          <h2 className="serif" style={{ fontSize: 36, margin: "0 0 16px" }}>
            Crafted for Beauty. Built for Every Day.
          </h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.75, marginBottom: 24, fontSize: 14 }}>
            Every Zafiro bedsheet is made with premium cotton, beautiful designs, and the care that goes into each detail — so your bedroom can be your sanctuary.
          </p>
          <Link href="/about" className="btn outline">
            Our Story <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </main>
  );
}
