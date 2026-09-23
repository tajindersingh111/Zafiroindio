import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { getStorefrontProducts, collections } from "@/lib/data";
import { ArrowRight } from "lucide-react";

const BASE_URL = "https://zafiroindio.com";

// Rich editorial content per collection — real content for real customers
const collectionContent: Record<
  string,
  {
    headline: string;
    subheadline: string;
    heroDesc: string;
    bodyTitle: string;
    bodyPara1: string;
    bodyPara2: string;
    faqs: { q: string; a: string }[];
    metaTitle: string;
    metaDesc: string;
    keywords: string[];
    categoryFilter: string;
  }
> = {
  floral: {
    metaTitle: "Floral Bedsheets | Hand-Block Printed Cotton | Zafiro Indio",
    metaDesc:
      "Shop Zafiro Indio's floral bedsheet collection — hand-block printed 100% cotton bedsheets from Jaipur artisans. Sage green, blush, ivory & more. Free shipping above ₹999.",
    keywords: [
      "floral bedsheets",
      "floral cotton bedsheets India",
      "hand block print floral bedsheet",
      "Jaipur floral bedsheet",
      "printed floral bedsheet online",
      "buy floral bedsheet",
    ],
    headline: "Floral Bedsheets",
    subheadline: "Hand-Block Printed · 100% Pure Cotton · Jaipur Artisans",
    heroDesc:
      "Bring the eternal beauty of Indian flora into your bedroom. Each Zafiro floral bedsheet is hand-printed by skilled Karigars using traditional block-print techniques from Jaipur, Rajasthan — resulting in patterns that are naturally imperfect, uniquely yours.",
    bodyTitle: "The Art of Hand-Block Floral Printing",
    bodyPara1:
      "Our floral bedsheets are woven from 200-thread-count long-staple cotton, pre-washed for extra softness, and printed with non-toxic, AZO-free dyes. The botanical motifs — from jasmine and lotus to marigold — are drawn directly from the centuries-old Bagru and Sanganer textile traditions of Rajasthan.",
    bodyPara2:
      "Whether you prefer the soft romance of blush petals, the grounded richness of sage green botanicals, or the clean freshness of ivory gardens, Zafiro's floral range is designed to age beautifully with every wash and complement any bedroom aesthetic — modern, bohemian or traditional.",
    faqs: [
      {
        q: "Are Zafiro floral bedsheets 100% cotton?",
        a: "Yes. Our floral collection is woven from 100% pure long-staple cotton — breathable, hypoallergenic, and soft to the touch.",
      },
      {
        q: "How are the floral patterns applied?",
        a: "Each design is hand-stamped using carved wooden blocks (block printing) by artisans in Jaipur, giving every bedsheet a unique, artisanal character.",
      },
      {
        q: "What sizes are available in the floral collection?",
        a: "We offer Single, Double, Queen, and King sizes across most floral designs.",
      },
      {
        q: "Do the floral colours fade after washing?",
        a: "We use non-toxic, AZO-free reactive dyes that are wash-fast. We recommend cold wash on a gentle cycle to preserve colour vibrancy.",
      },
    ],
    categoryFilter: "Floral",
  },
  minimal: {
    metaTitle: "Minimal Bedsheets | Solid & Neutral Cotton | Zafiro Indio",
    metaDesc:
      "Discover Zafiro Indio's minimal bedsheet collection — clean, neutral cotton bedsheets for modern bedrooms. Sage, ivory, sand & muted tones. Soft, breathable, everyday comfort.",
    keywords: [
      "minimal bedsheets",
      "solid colour cotton bedsheets India",
      "neutral bedsheets online",
      "plain cotton bedsheets Jaipur",
      "minimalist bedroom bedsheets",
      "buy plain bedsheets India",
    ],
    headline: "Minimal Bedsheets",
    subheadline: "Clean Aesthetics · Solid Cotton · Modern Living",
    heroDesc:
      "For those who believe that beauty lives in restraint. Zafiro's minimal collection strips away excess to deliver pure comfort — soft, breathable cotton in a curated palette of neutrals and earth tones that pair effortlessly with any interior.",
    bodyTitle: "Less Is More — The Zafiro Minimal Philosophy",
    bodyPara1:
      "Our minimal bedsheets are woven from 100% pure cotton in structured percale and sateen weaves that get softer with every wash. The palette — warm sand, sage whisper, ivory cream and cool dove — is drawn from natural, calming tones proven to promote restful sleep.",
    bodyPara2:
      "Perfect for Scandinavian, Japanese-inspired, or contemporary Indian interiors, these bedsheets are the canvas upon which you build your bedroom sanctuary. Available in all standard Indian bed sizes with a generous tuck-in depth.",
    faqs: [
      {
        q: "Are the minimal bedsheets pre-washed?",
        a: "Yes. All Zafiro bedsheets are pre-washed for softness and dimensional stability — no shrinkage surprises after the first wash.",
      },
      {
        q: "Do the neutral tones look different in person vs photos?",
        a: "We calibrate our product photography to closely match real colours. Our ivory, sand, and sage tones are warm and natural — not stark white or neon.",
      },
      {
        q: "Are these suitable for hot Indian summers?",
        a: "Absolutely. Percale and lightweight cotton weaves are highly breathable and ideal for Indian summers — much cooler than polyester blends.",
      },
    ],
    categoryFilter: "Minimal",
  },
  printed: {
    metaTitle: "Printed Bedsheets | Rajasthan Block Print Cotton | Zafiro Indio",
    metaDesc:
      "Explore Zafiro Indio's printed bedsheet collection — bold Rajasthani block prints on 100% cotton. Indigo, terracotta, olive. Traditional Indian textile craft meets modern comfort.",
    keywords: [
      "printed bedsheets India",
      "Rajasthani block print bedsheets",
      "indigo print bedsheet",
      "terracotta print bedsheet",
      "cotton printed bedsheets online",
      "Indian print bedsheets",
    ],
    headline: "Printed Bedsheets",
    subheadline: "Rajasthani Block Print · Bold Patterns · 100% Cotton",
    heroDesc:
      "Bold, expressive, and deeply rooted in Indian artisanal tradition. Zafiro's printed collection features indigo geometrics, terracotta florals, and olive botanicals — all block-printed on soft cotton by Jaipur's most skilled Karigars.",
    bodyTitle: "Rajasthan's Living Textile Tradition",
    bodyPara1:
      "Block printing is one of India's oldest textile arts, practiced for over 500 years in the workshops (kattas) of Sanganer and Bagru near Jaipur. Zafiro partners directly with these artisan communities to bring authentic, fairly-traded printed bedsheets to modern homes across India.",
    bodyPara2:
      "Each print in this collection is designed by our in-house team in collaboration with master block-carvers, then hand-stamped onto 200TC cotton fabric. The result is rich, character-filled bedding that gets better with age — imperfections included.",
    faqs: [
      {
        q: "What is block printing?",
        a: "Block printing is a traditional Indian textile technique where hand-carved wooden blocks are dipped in natural dye and stamped onto fabric to create repeating patterns. Each impression is unique.",
      },
      {
        q: "Are the printed bedsheets colour-fast?",
        a: "Yes. We use reactive dyes that bond with the cotton fibres for long-lasting colour. Some slight softening of colour after multiple washes is a natural characteristic of handmade textiles.",
      },
      {
        q: "Do you sell pillow covers and bolster covers to match?",
        a: "Most sets include matching pillow covers. We are expanding our accessories range — join our newsletter to be notified first.",
      },
    ],
    categoryFilter: "Printed",
  },
  luxury: {
    metaTitle: "Luxury Bedsheets | Premium Cotton | Zafiro Indio India",
    metaDesc:
      "Shop Zafiro Indio's luxury bedsheet collection — high thread-count premium cotton, midnight florals, and beige elegance. Hotel-quality comfort. Free delivery above ₹999.",
    keywords: [
      "luxury bedsheets India",
      "premium cotton bedsheets",
      "high thread count bedsheets",
      "hotel quality bedsheets India",
      "luxury bedding online India",
      "premium bedsheets Jaipur",
    ],
    headline: "Luxury Bedsheets",
    subheadline: "Premium Thread Count · Hotel Quality · Pure Cotton",
    heroDesc:
      "Sleep like you're staying in a five-star hotel — every night. Zafiro's luxury collection is woven from premium long-staple cotton with a higher thread count for an exceptionally smooth, cool hand-feel and a quietly refined look.",
    bodyTitle: "Crafted for Discerning Tastes",
    bodyPara1:
      "Our luxury bedsheets start with the finest grade long-staple cotton harvested from the cotton belts of Gujarat and Maharashtra. The longer fibre length produces a finer, stronger, more lustrous yarn that translates into a bedsheet with a silky drape and superior durability.",
    bodyPara2:
      "Midnight Floral and Luxe Beige — the twin pillars of this collection — are designed to anchor a sophisticated bedroom. Pair with Zafiro's velvet cushion covers and quilted throws (coming soon) for a fully curated luxury bedroom aesthetic.",
    faqs: [
      {
        q: "What makes a bedsheet 'luxury'?",
        a: "Zafiro's luxury bedsheets use a higher thread count (300TC+), longer-staple cotton fibres, a denser weave, and premium finishing for a noticeably smoother, more durable, and more luxurious feel.",
      },
      {
        q: "Are luxury bedsheets worth the extra cost?",
        a: "For daily use, quality bedsheets last significantly longer. A premium Zafiro bedsheet can last 5–7 years with proper care, making the cost-per-use highly competitive.",
      },
      {
        q: "Do you offer gift packaging for luxury bedsheets?",
        a: "Yes! Select the gift-wrap option at checkout. Our luxury range comes in a Zafiro-branded kraft box with a cotton ribbon — perfect as a housewarming or wedding gift.",
      },
    ],
    categoryFilter: "Luxury",
  },
  everyday: {
    metaTitle: "Everyday Bedsheets | Comfortable Cotton | Zafiro Indio",
    metaDesc:
      "Zafiro Indio everyday cotton bedsheets — soft, durable, and affordable. Made for daily Indian use. Easy wash, long-lasting comfort. Available in all standard sizes. Shop now.",
    keywords: [
      "everyday bedsheets India",
      "affordable cotton bedsheets",
      "daily use bedsheets",
      "durable cotton bedsheets India",
      "comfortable bedsheets online",
      "budget bedsheets India",
    ],
    headline: "Everyday Comfort Bedsheets",
    subheadline: "Built for Daily Use · Easy Care · Durable Cotton",
    heroDesc:
      "Great sleep doesn't have to cost a fortune. Zafiro's Everyday Comfort collection delivers honest, durable cotton bedsheets at an accessible price — because every bed deserves quality.",
    bodyTitle: "Everyday Excellence",
    bodyPara1:
      "Our Everyday Comfort bedsheets are woven from a robust cotton blend that's engineered for high-frequency washing without pilling, shrinkage, or colour fade. Machine washable at 40°C, quick-dry, and wrinkle-resistant — perfect for busy households.",
    bodyPara2:
      "Designed for student hostels, guest rooms, rental properties, and everyday family use, this range offers the widest size range and most practical colour palette in our catalogue. Affordable, honest, and made to last.",
    faqs: [
      {
        q: "Can I machine wash Zafiro everyday bedsheets?",
        a: "Yes. All our everyday bedsheets are machine washable at 40°C. Avoid bleach; tumble dry on low or line dry in shade for best results.",
      },
      {
        q: "Are everyday bedsheets suitable for children?",
        a: "Yes. The fabric is hypoallergenic and free from harmful chemicals. All dyes are AZO-free and OEKO-TEX safe.",
      },
      {
        q: "What is the return policy?",
        a: "We offer a 7-day easy return policy on all unused, unwashed bedsheets. Initiate your return from your Zafiro account dashboard.",
      },
    ],
    categoryFilter: "Everyday Comfort",
  },
  new: {
    metaTitle: "New Arrivals Bedsheets 2025 | Latest Designs | Zafiro Indio",
    metaDesc:
      "Discover Zafiro Indio's latest bedsheet designs — fresh prints, new colours, and seasonal collections. Be the first to shop new arrivals. Cotton, handblock, and more.",
    keywords: [
      "new bedsheets 2025",
      "new arrival bedsheets India",
      "latest bedsheet designs",
      "new cotton bedsheets online",
      "Zafiro new collection",
      "new handblock bedsheets",
    ],
    headline: "New Arrivals",
    subheadline: "Fresh Designs · New Season Prints · Just Landed",
    heroDesc:
      "Our artisans are always creating. Zafiro's New Arrivals section is refreshed each season with the latest prints, colourways, and fabric innovations — giving you first access to designs before they sell out.",
    bodyTitle: "Always Something New from Jaipur",
    bodyPara1:
      "Each new collection begins with a mood board developed by our in-house design team in Jaipur, inspired by nature, architecture, folk art, and global textile trends. From mood board to carved block to finished bedsheet, each new design takes 6–8 weeks to produce.",
    bodyPara2:
      "New arrivals are added in limited quantities. Once they sell out, they may not return — so if you see a design you love, we recommend ordering sooner rather than later.",
    faqs: [
      {
        q: "How often does Zafiro add new bedsheet designs?",
        a: "We launch new collections seasonally — typically aligned with major Indian seasons (Summer, Monsoon, Festive, Winter). Sign up to our newsletter to be notified first.",
      },
      {
        q: "Are new arrival bedsheets available for pre-order?",
        a: "Occasionally, we offer pre-order on select seasonal designs. Join our mailing list to get early access.",
      },
    ],
    categoryFilter: "New Arrivals",
  },
};

export async function generateStaticParams() {
  return Object.keys(collectionContent).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const content = collectionContent[slug];
  if (!content) return {};

  return {
    title: content.metaTitle,
    description: content.metaDesc,
    keywords: content.keywords,
    alternates: { canonical: `${BASE_URL}/collections/${slug}` },
    openGraph: {
      title: content.metaTitle,
      description: content.metaDesc,
      type: "website",
      url: `${BASE_URL}/collections/${slug}`,
    },
  };
}

export default async function CollectionLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const content = collectionContent[slug];
  if (!content) notFound();

  const collectionMeta = collections.find((c) => c.slug === slug);
  const allProducts = getStorefrontProducts();
  const collectionProducts = allProducts.filter(
    (p) => p.category === content.categoryFilter
  );

  // JSON-LD: CollectionPage + BreadcrumbList
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Collections",
        item: `${BASE_URL}/collections`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: content.headline,
        item: `${BASE_URL}/collections/${slug}`,
      },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main style={{ background: "#faf8f5", minHeight: "100vh" }}>
        {/* ── Hero ── */}
        <section
          style={{
            position: "relative",
            background: `linear-gradient(rgba(247,243,237,0.88), rgba(247,243,237,0.96)), url('${collectionMeta?.image || ""}') center/cover no-repeat`,
            padding: "72px 20px 64px",
            textAlign: "center",
            borderBottom: "1px solid #eae4d9",
          }}
        >
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            style={{
              fontSize: 12,
              color: "#999",
              marginBottom: 24,
              display: "flex",
              gap: 6,
              justifyContent: "center",
            }}
          >
            <Link href="/" style={{ color: "#999", textDecoration: "none" }}>
              Home
            </Link>
            <span>/</span>
            <Link
              href="/collections"
              style={{ color: "#999", textDecoration: "none" }}
            >
              Collections
            </Link>
            <span>/</span>
            <span style={{ color: "#555", fontWeight: 500 }}>
              {content.headline}
            </span>
          </nav>

          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "#a67c37",
              marginBottom: 12,
            }}
          >
            {content.subheadline}
          </p>
          <h1
            className="serif"
            style={{
              fontSize: 44,
              fontWeight: 500,
              color: "#1c1917",
              margin: "0 0 14px",
              letterSpacing: "-0.5px",
            }}
          >
            {content.headline}
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "#66625d",
              maxWidth: 640,
              margin: "0 auto 28px",
              lineHeight: 1.7,
            }}
          >
            {content.heroDesc}
          </p>
          <Link
            href={`/shop?collection=${slug}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#1c1917",
              color: "#fff",
              padding: "12px 24px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              borderRadius: 4,
              textDecoration: "none",
            }}
          >
            Shop {content.headline} <ArrowRight size={14} />
          </Link>
        </section>

        {/* ── Products Grid ── */}
        {collectionProducts.length > 0 && (
          <section
            className="section"
            style={{ padding: "60px 0 40px", background: "#faf8f5" }}
          >
            <div className="container" style={{ maxWidth: 1240 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 32,
                }}
              >
                <h2
                  className="serif"
                  style={{ fontSize: 26, fontWeight: 500, color: "#1c1917" }}
                >
                  {collectionProducts.length} Designs in {content.headline}
                </h2>
                <Link
                  href={`/shop?collection=${slug}`}
                  style={{
                    fontSize: 12,
                    color: "#a67c37",
                    textDecoration: "none",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  View All <ArrowRight size={13} />
                </Link>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 22,
                }}
              >
                {collectionProducts.map((p) => (
                  <ProductCard key={p.slug} p={p} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Editorial Content ── */}
        <section
          style={{
            background: "#fff",
            borderTop: "1px solid #eae4d9",
            borderBottom: "1px solid #eae4d9",
            padding: "60px 20px",
          }}
        >
          <div
            className="container"
            style={{ maxWidth: 780, margin: "0 auto" }}
          >
            <h2
              className="serif"
              style={{
                fontSize: 30,
                fontWeight: 500,
                color: "#1c1917",
                marginBottom: 20,
              }}
            >
              {content.bodyTitle}
            </h2>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.8,
                color: "#57534e",
                marginBottom: 18,
              }}
            >
              {content.bodyPara1}
            </p>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.8,
                color: "#57534e",
                marginBottom: 0,
              }}
            >
              {content.bodyPara2}
            </p>
          </div>
        </section>

        {/* ── FAQs ── */}
        <section style={{ background: "#faf8f5", padding: "60px 20px 80px" }}>
          <div
            className="container"
            style={{ maxWidth: 780, margin: "0 auto" }}
          >
            <h2
              className="serif"
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: "#1c1917",
                marginBottom: 32,
              }}
            >
              Frequently Asked Questions
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {content.faqs.map((faq, i) => (
                <div
                  key={i}
                  style={{
                    background: "#fff",
                    border: "1px solid #e7e1d6",
                    borderRadius: 8,
                    padding: "20px 24px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#1c1917",
                      margin: "0 0 8px",
                    }}
                  >
                    {faq.q}
                  </h3>
                  <p
                    style={{
                      fontSize: 14,
                      color: "#66625d",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA to All Collections ── */}
        <section
          style={{
            background: "#1c1917",
            color: "#fff",
            padding: "50px 20px",
            textAlign: "center",
          }}
        >
          <div className="container" style={{ maxWidth: 600 }}>
            <p
              style={{
                fontSize: 11,
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "#c5a028",
                marginBottom: 12,
                fontWeight: 700,
              }}
            >
              Explore More
            </p>
            <h2
              className="serif"
              style={{ fontSize: 28, color: "#fff", margin: "0 0 14px" }}
            >
              Discover All Zafiro Collections
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 24 }}>
              From minimal to luxe — find the bedsheet collection that speaks to
              your aesthetic.
            </p>
            <Link
              href="/collections"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#c5a028",
                color: "#1c1917",
                padding: "12px 24px",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                borderRadius: 4,
                textDecoration: "none",
              }}
            >
              All Collections <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
