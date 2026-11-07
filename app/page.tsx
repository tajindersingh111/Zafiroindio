import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import SmartImg from "@/components/SmartImg";
import heroEditorial from "@/public/editorial/hero.jpg";
import craftEditorial from "@/public/editorial/craft.jpg";
import { ArrowRight, Factory, Layers, Leaf, PackageCheck, PenTool, Quote, RotateCcw, ShieldCheck, Sparkles, Star } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { getCatalogProducts, getCatalogBanners, getCatalogCollections } from "@/lib/storefront/catalog";
import HeroDepth from "@/components/site/HeroDepth";
import HeroSlider from "@/components/site/HeroSlider";
import SmartRecommendations from "@/components/site/SmartRecommendations";
import { getFounders } from "@/lib/storefront/founders";
import { getFeaturedReviews } from "@/lib/storefront/reviews";

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
  const [products, banners, collectionsList, founders, reviews] = await Promise.all([
    getCatalogProducts(),
    getCatalogBanners(),
    getCatalogCollections(),
    getFounders(),
    getFeaturedReviews(6),
  ]);
  const founder = founders[0];
  // Five tiles make a clean mosaic (one large + four small). Any other count falls back to an even grid.
  const shownCollections = collectionsList.slice(0, 5);
  const mosaic = shownCollections.length === 5;
  // Shown only when no banner is active in Admin → Marketing → Banners.
  const heroBanner = {
    title: "Make Your Bedroom Feel Like Sanctuary.",
    subtitle: "Handcrafted 100% pure cotton bedsheets designed for everyday comfort and timeless Indian heritage.",
    ctaText: "Shop Collection",
    ctaLink: "/shop",
    image: "",
  };

  // Cards only need listing fields: full descriptions would bloat every page view.
  const featured = products.filter((p) => p.badge === "BESTSELLER" || !p.badge).slice(0, 8).map((p) => ({ ...p, description: "" }));

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
            <strong>7-Day Exchange</strong>
            <span>Damaged items returned. <Link href="/return-policy" className="rich-link">Policy</Link></span>
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
      {shownCollections.length > 0 && (
        <section className="hm-section">
          <div className="container">
            <div className="hm-head hm-reveal">
              <p className="eyebrow">Shop by category</p>
              <h2 className="serif">Explore the Collection</h2>
              <p className="hm-lede">From the bedroom to the dining table, every piece is hand block printed in Jaipur.</p>
            </div>

            <div className={mosaic ? "hm-mosaic" : "hm-tiles"}>
              {shownCollections.map((c, i) => (
                <Link href={`/collections/${c.slug}`} className="hm-tile hm-reveal" key={c.slug}>
                  <SmartImg
                    src={c.image}
                    width={mosaic && i === 0 ? 1080 : 640}
                    widths={mosaic && i === 0 ? [640, 1080, 1200] : [384, 640, 828]}
                    sizes={mosaic && i === 0 ? "(max-width: 900px) 100vw, 50vw" : "(max-width: 900px) 50vw, 25vw"}
                    alt={c.name}
                    loading={i < 2 ? "eager" : "lazy"}
                  />
                  <span className="hm-tile-shade" aria-hidden="true" />
                  <span className="hm-tile-text">
                    <strong className="serif">{c.name}</strong>
                    {c.desc && <small>{c.desc}</small>}
                    <span className="hm-tile-cta">
                      Shop now <ArrowRight size={13} aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="hm-more hm-reveal">
              <Link className="btn outline" href="/collections">
                View all collections <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── 4. FEATURED PRODUCTS ─────────────────────────────── */}
      <section className="hm-section hm-section-tint">
        <div className="container">
          <div className="hm-head hm-reveal">
            <p className="eyebrow">Handpicked</p>
            <h2 className="serif">Pieces We Love</h2>
            <p className="hm-lede">Pure cotton, hand block printed, and made to be lived in.</p>
          </div>

          <div className="hm-products">
            {featured.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>

          <div className="hm-more hm-reveal">
            <Link className="btn dark" href="/shop">
              Explore all {products.length} pieces <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. FOUNDER STORY ─────────────────────────────────── */}
      <section className="hm-section hm-founder">
        <div className="container">
          <div className="hm-founder-grid">
            <div className="hm-founder-photo hm-reveal">
              <span className="hm-founder-frame" aria-hidden="true" />
              <img
                src={founder?.photo || "/editorial/neelu.jpg"}
                alt={founder ? `${founder.name}, ${founder.role} of Zafiro Indio` : "Founder of Zafiro Indio"}
                loading="lazy"
                decoding="async"
              />
            </div>

            <div className="hm-founder-copy hm-reveal">
              <p className="eyebrow">The founder&rsquo;s story</p>
              <h2 className="serif">Thirty years of thread. One name of her own.</h2>
              <blockquote>
                <Quote size={22} aria-hidden="true" />
                <p>
                  Thirty years have been spent understanding every thread and design of the fabric. While working in this textile industry, I always had a dream: to create a
                  brand that was completely my own.
                </p>
                <footer>
                  <strong>{founder?.name ?? "Neelu Singh"}</strong>
                  <span>{founder?.role ?? "Founder"}, Zafiro Indio</span>
                </footer>
              </blockquote>
              <p className="hm-founder-text">
                Five years ago she started her own manufacturing, so quality could be decided in-house at every stage by the person whose name is on the label. Zafiro Indio
                is what thirty years of knowing cloth looks like.
              </p>
              <Link href="/about#story" className="btn dark">
                Read our story <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. HOW IT'S MADE ─────────────────────────────────── */}
      <section className="hm-section hm-process">
        <div className="container">
          <div className="hm-head hm-reveal">
            <p className="eyebrow">How we work</p>
            <h2 className="serif">From Idea to Your Bedroom</h2>
          </div>
          <ol className="hm-steps">
            {[
              { Icon: PenTool, title: "Design & innovation", text: "Every product begins with thoughtful design, inspired by global trends and modern living." },
              { Icon: Layers, title: "Fabric & materials", text: "Fabric is chosen with care, because quality starts with what a piece is made from." },
              { Icon: Factory, title: "Craftsmanship & production", text: "Made in our own unit, with the support of JHB Industries, with precision at every stage." },
              { Icon: PackageCheck, title: "Finishing & delivery", text: "Finishing details checked, then packed and sent to you with reliable service." },
            ].map(({ Icon, title, text }, i) => (
              <li key={title} className="hm-step hm-reveal">
                <span className="hm-step-num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="hm-step-icon" aria-hidden="true">
                  <Icon size={22} strokeWidth={1.5} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 7. SMART RECOMMENDATIONS (personalised) ──────────── */}
      <SmartRecommendations mode="interest" title="Picked For You" subtitle="Products you've shown the most interest in — based on your browsing." maxItems={4} />

      {/* ── 8. EDITORIAL BANNER ──────────────────────────────── */}
      <section className="home-editorial">
        <Image src={craftEditorial} alt="" fill sizes="100vw" placeholder="blur" className="home-editorial-bg" />
        <div className="container hm-editorial-inner">
          <p className="eyebrow" style={{ color: "#c5a028", marginBottom: 14 }}>Tactile perfection</p>
          <h2 className="serif">Crafted for Beauty. Built for Every Night.</h2>
          <p>Breathable cotton, hand block printed, and designed to age gracefully through every wash.</p>
          <Link href="/shop?badge=new" className="btn gold hm-gold-solid">
            Shop new arrivals <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── 9. REAL CUSTOMER REVIEWS (hidden until there are enough good ones) ── */}
      {reviews.length > 0 && (
        <section className="hm-section">
          <div className="container">
            <div className="hm-head hm-reveal">
              <p className="eyebrow">In their words</p>
              <h2 className="serif">What Our Customers Say</h2>
            </div>
            <div className="hm-reviews">
              {reviews.slice(0, 3).map((r, i) => (
                <figure key={`${r.name}-${i}`} className="hm-review hm-reveal">
                  <div className="hm-review-stars" role="img" aria-label={`${r.rating} out of 5 stars`}>
                    {Array.from({ length: r.rating }).map((_, k) => (
                      <Star key={k} size={14} fill="currentColor" strokeWidth={0} />
                    ))}
                  </div>
                  {r.title && <h3>{r.title}</h3>}
                  <blockquote>{r.text}</blockquote>
                  <figcaption>
                    <strong>{r.name}</strong>
                    {r.product && <span>on {r.product}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
    </>
  );
}
