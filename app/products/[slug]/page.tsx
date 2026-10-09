import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductClient from "@/components/ProductClient";
import ProductViewTracker from "@/components/site/ProductViewTracker";
import { getProductBySlug } from "@/lib/storefront/catalog";

// Cached page (ISR): rebuilt in the background at most once a minute, and right after admin edits.
export const revalidate = 60;

/** No pages at build time: each product is rendered on its first visit, then served from cache. */
export async function generateStaticParams() {
  return [];
}

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://zafiroindio.com";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found" };
  const description = (p.description || `${p.name} — hand-block printed cotton bedding from Jaipur.`).slice(0, 160);
  return {
    title: p.name,
    description,
    alternates: { canonical: `${BASE}/products/${p.slug}` },
    openGraph: { title: p.name, description, type: "website", images: p.images[0] ? [{ url: p.images[0] }] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: p.images,
    description: p.description,
    sku: p.slug,
    brand: { "@type": "Brand", name: "Zafiro Indio" },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: p.price,
      availability: p.badge === "SOLD OUT" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: `${BASE}/products/${p.slug}`,
    },
    ...(p.reviews > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviews } } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ProductViewTracker slug={p.slug} />
      <ProductClient p={p} />
    </>
  );
}
