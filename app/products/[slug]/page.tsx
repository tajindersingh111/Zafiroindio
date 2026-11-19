import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductClient from "@/components/ProductClient";
import ProductViewTracker from "@/components/site/ProductViewTracker";
import ProductStory from "@/components/product/ProductStory";
import MeetTheMakers from "@/components/product/MeetTheMakers";
import { getActiveDbProducts, getProductBySlug } from "@/lib/storefront/catalog";
import { getArtisans } from "@/lib/storefront/artisans";
import { productStory } from "@/lib/storefront/description";
import { plainText } from "@/lib/seo/text";
import { sellingPrice } from "@/lib/price-rules";

// Cached page (ISR): rebuilt in the background at most once a minute, and right after admin edits.
export const revalidate = 60;

/** No pages at build time: each product is rendered on its first visit, then served from cache. */
export async function generateStaticParams() {
  return [];
}

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://zafiroindio.com";

/** Structured data needs absolute URLs; the catalogue stores its own photos as /products/<file>. */
const abs = (u: string) => (/^https?:\/\//i.test(u) ? u : `${BASE}${u.startsWith("/") ? "" : "/"}${u}`);

/** Orders above this ship free (the cart and the product page both say so); below it shipping is a flat 99. */
const FREE_SHIPPING_FROM = 2000;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found" };
  // The stored description is WordPress page-builder HTML; a search snippet has to be a sentence.
  const description = plainText(p.description, 155) || `${p.name} — hand-block printed cotton from Jaipur. Easy 7-day exchanges.`;
  const image = p.images[0] ? abs(p.images[0]) : undefined;
  return {
    title: p.name,
    description,
    alternates: { canonical: `${BASE}/products/${p.slug}` },
    openGraph: { title: p.name, description, type: "website", url: `${BASE}/products/${p.slug}`, images: image ? [{ url: image, alt: p.name }] : undefined },
    twitter: { card: "summary_large_image", title: p.name, description, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();

  const [rows, artisans] = await Promise.all([getActiveDbProducts().catch(() => []), getArtisans()]);
  const raw = rows.find((r: any) => (r.slug || r.id) === p.slug) as any;
  const story = productStory(raw?.description ?? p.description, raw?.shortDescription ?? "");
  const handBlock = (p.specs ?? []).some((s) => s.key === "craft" && /hand-block/i.test(s.value));

  // ── Structured data ────────────────────────────────────────────────
  // A product with sizes is one AggregateOffer from its cheapest to its dearest size; one without is a plain Offer.
  const sizes: any[] = Array.isArray(raw?.variations) ? raw.variations : [];
  const prices = (sizes.length ? sizes.map((v) => sellingPrice(v)) : [p.price]).filter((n) => n > 0);
  const low = prices.length ? Math.min(...prices) : p.price;
  const high = prices.length ? Math.max(...prices) : p.price;
  const inStock = sizes.length
    ? sizes.some((v) => Number(v.stock) > 0 && v.stockStatus !== "out_of_stock")
    : raw
      ? raw.stockStatus !== "out_of_stock" && (raw.manageStock === false || Number(raw.stock) > 0)
      : p.badge !== "SOLD OUT";

  const offerCommon = {
    priceCurrency: "INR",
    url: `${BASE}/products/${p.slug}`,
    itemCondition: "https://schema.org/NewCondition",
    availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    seller: { "@type": "Organization", name: "Zafiro Indio" },
    // What Google shows beside the price in Shopping results: delivery time and the return terms.
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: { "@type": "MonetaryAmount", value: low >= FREE_SHIPPING_FROM ? 0 : 99, currency: "INR" },
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
        transitTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 7, unitCode: "DAY" },
      },
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "IN",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 7,
      returnMethod: "https://schema.org/ReturnByMail",
      refundType: "https://schema.org/ExchangeRefund",
      merchantReturnLink: `${BASE}/return-policy`,
    },
  };

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${BASE}/products/${p.slug}#product`,
    name: p.name,
    image: p.images.map(abs),
    description: plainText(p.description, 5000) || p.name,
    sku: raw?.sku || p.slug,
    ...(p.categoryName ? { category: p.categoryName } : {}),
    ...(p.fabric ? { material: p.fabric } : {}),
    brand: { "@type": "Brand", name: "Zafiro Indio" },
    offers:
      prices.length > 1 && low !== high
        ? { "@type": "AggregateOffer", lowPrice: low, highPrice: high, offerCount: sizes.length || prices.length, ...offerCommon }
        : { "@type": "Offer", price: low, ...offerCommon },
    ...(p.reviews > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviews } } : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      ...(p.categorySlug && p.categoryName ? [{ "@type": "ListItem", position: 2, name: p.categoryName, item: `${BASE}/collections/${p.categorySlug}` }] : []),
      { "@type": "ListItem", position: p.categorySlug && p.categoryName ? 3 : 2, name: p.name, item: `${BASE}/products/${p.slug}` },
    ],
  };
  const ld = (o: unknown) => JSON.stringify(o).replace(/</g, "\\u003c");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(productLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(breadcrumbLd) }} />
      <ProductViewTracker slug={p.slug} />
      <ProductClient
        p={p}
        story={<ProductStory story={story} fallbackTitle={handBlock ? "Printed by Hand, Made to Last" : "The Details"} />}
        makers={<MeetTheMakers artisans={artisans} handBlock={handBlock} />}
      />
    </>
  );
}
