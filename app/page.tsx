import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import SmartImg from "@/components/SmartImg";
import heroEditorial from "@/public/editorial/hero.jpg";
import artisanEditorial from "@/public/editorial/heritage.jpg";
import craftEditorial from "@/public/editorial/craft.jpg";
import { ArrowRight, Leaf, Sparkles, RotateCcw, ShieldCheck, HeartHandshake } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { getCatalogProducts, getCatalogBanners, getCatalogCollections } from "@/lib/storefront/catalog";
import HeroDepth from "@/components/site/HeroDepth";
import HeroSlider from "@/components/site/HeroSlider";
import Carousel3D from "@/components/site/Carousel3D";
import SmartRecommendations from "@/components/site/SmartRecommendations";

// Cached page (ISR): rebuilt in the background at most once a minute, and right after admin edits.
export const revalidate = 60;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zafiroindio.com";

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
        url: `${BASE_URL}/editorial/hero.jpg`,
        width: 1376,
        height: 768,
        alt: "Zafiro Indio hand-block printed cotton bedding in a Jaipur haveli bedroom",
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

export default async function Home() {
  const [products, banners, collectionsList] = await Promise.all([getCatalogProducts(), getCatalogBanners(), getCatalogCollections()]);
  // Shown only when no banner is active in Admin → Marketing → Banners.
  const heroBanner = {
    title: "Make Your Bedroom Feel Like Sanctuary.",
    subtitle: "Handcrafted 100% pure cotton bedsheets designed for everyday comfort and timeless Indian heritage.",
    ctaText: "Shop Collection",
    ctaLink: "/shop",
    image: "",
  };

  // Cards and the carousel only need listing fields: full descriptions would bloat every page view.
  const featured = products.filter((p) => p.badge === "BESTSELLER" || !p.badge).slice(0, 8).map((p) => ({ ...p, description: "" }));
  const carousel = products.slice(0, 8).map((p) => ({ slug: p.slug, name: p.name, price: p.price, image: p.images[0] }));

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
      <HeroDepth>
        {banners.length > 0 ? (
          <HeroSlider slides={banners.map((b) => ({ id: b.id, title: b.title, subtitle: b.subtitle, ctaText: b.ctaText, ctaLink: b.ctaLink, image: b.image }))} />
        ) : (
        <>
        <Image src={heroEditorial} alt="Hand-block printed cotton bedding in a Jaipur haveli bedroom" className="heroImg" fill preload sizes="100vw" placeholder="blur" />
        <div className="container">
          <div className="heroContent">
            <span className="eyebrow">
              <Sparkles size={12} className="text-[#c5a028]" /> Heritage Jaipur Handblock
            </span>
            <h1 className="serif">{heroBanner.title}</h1>
            <p>{heroBanner.subtitle}</p>
            <div className="heroBtns">
              <Link href={heroBanner.ctaLink || "/shop"} className="btn gold">
                {heroBanner.ctaText || "Shop Collection"} <ArrowRight size={14} />
              </Link>
              <Link href="/collections" className="btn outline">
                Explore Edits
              </Link>
            </div>
          </div>
        </div>
        </>
        )}
      </HeroDepth>

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
            <strong>Artisanal Block Prints</strong>
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

      {products.length >= 3 && (
        <section className="section c3d-section">
          <div className="container" style={{ textAlign: "center" }}>
            <p className="eyebrow">Drag to explore</p>
            <h2 className="serif" style={{ fontSize: "clamp(30px,4.5vw,48px)", margin: "10px 0 0" }}>The Zafiro Atelier</h2>
          </div>
          <Carousel3D items={carousel} />
        </section>
      )}

      {/* ── 3. SHOP BY COLLECTION ────────────────────────────── */}
      <section className="section" style={{ background: "var(--paper)" }}>
        <div className="container">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">Shop by Category</p>
              <h2 className="serif">Explore the Collection</h2>
            </div>
            <Link className="link" href="/collections">
              View All Edits <ArrowRight size={13} style={{ display: "inline", verticalAlign: "middle" }} />
            </Link>
          </div>

          <div className="collections">
            {collectionsList.map((c) => (
              <Link
                href={`/collections/${c.slug}`}
                className="collection"
                key={c.slug}
              >
                <SmartImg src={c.image} width={640} widths={[384, 640, 828]} sizes="(max-width: 640px) 50vw, 33vw" alt={c.name} className="collectionImg" loading="lazy" />
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
      <section className="section" style={{ background: "linear-gradient(180deg, var(--cream) 0%, #f1ebd8 100%)", borderTop: "1px solid var(--line-gold)", borderBottom: "1px solid var(--line-gold)" }}>
        <div className="container">
          <div className="home-story">
            <div style={{ position: "relative" }}>
              <Image
                src={artisanEditorial}
                alt="A master block-printer in Jaipur holding a hand-carved wooden block"
                sizes="(max-width: 900px) 100vw, 50vw"
                placeholder="blur"
                style={{ width: "100%", height: "auto", aspectRatio: "4/5", objectFit: "cover", borderRadius: 2, border: "1px solid rgba(197, 160, 40, 0.3)" }}
              />
              <div
                className="home-story-badge"
                style={{
                  position: "absolute",
                  bottom: -20,
                  right: -20,
                  background: "#090d16",
                  color: "#fff",
                  padding: "24px 28px",
                  maxWidth: 260,
                  border: "1px solid #c5a028",
                  boxShadow: "0 14px 40px rgba(0,0,0,0.25)"
                }}
              >
                <HeartHandshake size={28} style={{ color: "#c5a028", marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, fontWeight: 600, color: "#f1ebd8" }}>
                  Hand-block printed by traditional 5th generation Karigars in Sanganer &amp; Bagru, Jaipur.
                </p>
              </div>
            </div>

            <div>
              <p className="eyebrow">Our Philosophy</p>
              <h2 className="serif" style={{ fontSize: 42, lineHeight: 1.12, margin: "14px 0 22px", color: "var(--ink)" }}>
                "We believe restful sleep begins with textiles made with soul, patience, and integrity."
              </h2>
              <p style={{ color: "var(--ink-soft)", lineHeight: 1.85, fontSize: 15, marginBottom: 24 }}>
                Zafiro Indio was born out of a passion for authentic Indian textile craftsmanship. Every sheet is woven from 100% long-staple combed cotton, printed using wooden block stamps carved by hand, and pre-washed for velvety softness that endures for years.
              </p>
              <Link href="/about" className="btn dark">
                Read Our Heritage Story <ArrowRight size={14} />
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
      <section className="home-editorial">
        <Image src={craftEditorial} alt="" fill sizes="100vw" placeholder="blur" className="home-editorial-bg" />
        <div className="container" style={{ maxWidth: 680, position: "relative", zIndex: 1 }}>
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
