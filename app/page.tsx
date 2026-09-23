import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Leaf, Sparkles, RotateCcw, ShieldCheck, HeartHandshake } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { getStorefrontProducts, collections } from "@/lib/data";
import SmartRecommendations from "@/components/site/SmartRecommendations";

const BASE_URL = "https://zafiroindio.com";

export const metadata: Metadata = {
  title: "Zafiro Indio | Handblock Cotton Bedsheets from Jaipur",
  description:
    "Shop authentic hand-block printed 100% cotton bedsheets by Zafiro Indio — crafted by traditional artisans in Jaipur, Rajasthan. Floral, minimal, luxury & printed bedsheets. Free shipping above ₹999.",
  keywords: [
    "handblock bedsheets India",
    "cotton bedsheets Jaipur",
    "block print bedsheets online",
    "Rajasthani bedsheets",
    "buy bedsheets online India",
    "premium cotton bedsheets",
    "Zafiro Indio",
  ],
  metadataBase: new URL(BASE_URL),
  alternates: { canonical: BASE_URL },
  openGraph: {
    title: "Zafiro Indio | Handblock Cotton Bedsheets from Jaipur",
    description:
      "Authentic hand-block printed cotton bedsheets from Jaipur artisans. Shop floral, minimal, luxury & printed collections.",
    type: "website",
    url: BASE_URL,
    images: [
      {
        url: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85",
        width: 1200,
        height: 800,
        alt: "Zafiro Indio hand-block printed floral cotton bedsheet",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zafiro Indio | Handblock Cotton Bedsheets from Jaipur",
    description: "Authentic hand-block printed cotton bedsheets from Jaipur artisans.",
  },
  robots: { index: true, follow: true },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Zafiro Indio",
  url: BASE_URL,
  logo: `${BASE_URL}/zafiro-logo-dark.png`,
  description:
    "Jaipur-based home textile brand specialising in hand-block printed 100% cotton bedsheets crafted by traditional Rajasthani artisans.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Jaipur",
    addressRegion: "Rajasthan",
    addressCountry: "IN",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "support@zafiroindio.com",
    availableLanguage: ["English", "Hindi"],
  },
  sameAs: [],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Zafiro Indio",
  url: BASE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function Home() {
  const products = getStorefrontProducts();
  const featured = products.filter(p => p.badge === "BESTSELLER" || !p.badge).slice(0, 8);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
    <main>
      {/* ── 1. HERO SECTION ──────────────────────────────────── */}
      <section className="hero">
        <img
          src="https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=2000&q=85"
          alt="Zafiro luxury bedsheet bedroom sanctuary"
          className="heroImg"
        />
        <div className="container">
          <div className="heroContent">
            <p className="eyebrow">The Art of Fine Living</p>
            <h1 className="serif">
              Make Your Bedroom Feel Like Sanctuary.
            </h1>
            <p>
              Handcrafted 100% pure cotton bedsheets designed for everyday comfort and timeless Indian heritage.
            </p>
            <div className="heroBtns">
              <Link href="/shop" className="btn gold">
                Shop Collection <ArrowRight size={14} />
              </Link>
              <Link href="/collections" className="btn outline">
                Explore Edits
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
            <strong>100% Pure Cotton</strong>
            <span>Breathable &amp; hypoallergenic weaves.</span>
          </div>
        </div>
        <div className="value">
          <span className="valueIcon"><Sparkles size={18} /></span>
          <div>
            <strong>Artisanal Prints</strong>
            <span>Hand-printed by master Karigars.</span>
          </div>
        </div>
        <div className="value">
          <span className="valueIcon"><RotateCcw size={18} /></span>
          <div>
            <strong>7-Day Easy Returns</strong>
            <span>Hassle-free return policy.</span>
          </div>
        </div>
        <div className="value">
          <span className="valueIcon"><ShieldCheck size={18} /></span>
          <div>
            <strong>Safe &amp; Encrypted</strong>
            <span>UPI, COD &amp; Card checkout.</span>
          </div>
        </div>
      </div>

      {/* ── 3. SHOP BY COLLECTION ────────────────────────────── */}
      <section className="section" style={{ background: "var(--paper)" }}>
        <div className="container">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">Curated Collections</p>
              <h2 className="serif">Shop by Aesthetic</h2>
            </div>
            <Link className="link" href="/collections">
              View All Edits <ArrowRight size={13} style={{ display: "inline", verticalAlign: "middle" }} />
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
                  <small>{c.desc.substring(0, 42)}…</small>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. FOUNDER & BRAND STORY SECTION ─────────────────── */}
      <section className="section" style={{ background: "var(--cream)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <img
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85"
                alt="Zafiro Karigar craftsmanship"
                style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", borderRadius: 2 }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: -20,
                  right: -20,
                  background: "#0f172a",
                  color: "#fff",
                  padding: "24px 28px",
                  maxWidth: 240,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
                }}
              >
                <HeartHandshake size={28} style={{ color: "#c5a028", marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, fontWeight: 600 }}>
                  Crafted by traditional Karigars in Jaipur, India.
                </p>
              </div>
            </div>

            <div>
              <p className="eyebrow">Our Philosophy</p>
              <h2 className="serif" style={{ fontSize: 38, lineHeight: 1.15, margin: "12px 0 20px" }}>
                "We believe restful sleep begins with textiles made with soul and integrity."
              </h2>
              <p style={{ color: "var(--ink-soft)", lineHeight: 1.8, fontSize: 14.5, marginBottom: 20 }}>
                Zafiro Indio was born out of a passion for authentic Indian textile craftsmanship. Every sheet is woven from high-thread-count long-staple cotton, hand-printed with non-toxic dyes, and finished to bring a soothing tactile elegance into your personal home sanctuary.
              </p>
              <Link href="/about" className="btn dark">
                Read Our Story <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. FEATURED PRODUCTS ─────────────────────────────── */}
      <section className="section" style={{ background: "var(--paper)" }}>
        <div className="container">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">Handpicked Masterpieces</p>
              <h2 className="serif">Loved by Zafiro Homes</h2>
            </div>
            <Link className="link" href="/shop">
              Explore All ({products.length}) <ArrowRight size={13} style={{ display: "inline", verticalAlign: "middle" }} />
            </Link>
          </div>

          <div className="products">
            {featured.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 5.5 SMART RECOMMENDATIONS (personalised) ──────── */}
      <SmartRecommendations
        mode="interest"
        title="Picked For You"
        subtitle="Products you've shown the most interest in — based on your browsing."
        maxItems={4}
      />

      {/* ── 6. EDITORIAL BANNER ──────────────────────────────── */}
      <section
        style={{
          background: "#0f172a",
          color: "#fff",
          padding: "80px 0",
          textAlign: "center"
        }}
      >
        <div className="container" style={{ maxWidth: 680 }}>
          <p className="eyebrow" style={{ color: "#c5a028", marginBottom: 14 }}>Tactile Perfection</p>
          <h2 className="serif" style={{ fontSize: 40, margin: "0 0 18px", color: "#fff" }}>
            Crafted for Beauty. Built for Every Night.
          </h2>
          <p style={{ color: "#94a3b8", lineHeight: 1.8, marginBottom: 28, fontSize: 15 }}>
            Every Zafiro bedsheet is breathable, pre-washed for extra softness, and designed to age gracefully through every wash.
          </p>
          <Link href="/shop" className="btn gold" style={{ background: "#c5a028", borderColor: "#c5a028", color: "#0f172a" }}>
            Shop New Arrivals <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </main>
    </>
  );
}
