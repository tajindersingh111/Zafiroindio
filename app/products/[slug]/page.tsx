import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStorefrontProducts } from "@/lib/data";
import ProductClient from "@/components/ProductClient";
import ProductViewTracker from "@/components/site/ProductViewTracker";
import SmartRecommendations from "@/components/site/SmartRecommendations";

export const dynamic = "force-dynamic";

const BASE_URL = "https://zafiroindio.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const allProducts = getStorefrontProducts();
  const p = allProducts.find(
    (x) => x.slug === slug || x.slug.toLowerCase() === slug.toLowerCase()
  );
  if (!p) return {};

  const title = `${p.name} | Handblock Cotton Bedsheet | Zafiro Indio`;
  const description = `Buy ${p.name} – ${p.description} Available in ${p.sizes.join(", ")} sizes. ${p.fabric}. Free shipping above ₹999. Easy 7-day returns.`;

  return {
    title,
    description,
    keywords: [
      p.name,
      p.category,
      p.fabric,
      "bedsheet online India",
      "Jaipur cotton bedsheet",
      "handblock print bedsheet",
      "buy bedsheet online",
      ...p.colors.map((c) => `${c} bedsheet`),
    ],
    openGraph: {
      title,
      description,
      type: "website",
      url: `${BASE_URL}/products/${p.slug}`,
      images: [
        {
          url: p.images[0],
          width: 1200,
          height: 900,
          alt: `${p.name} – ${p.category} cotton bedsheet by Zafiro Indio`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [p.images[0]],
    },
    alternates: {
      canonical: `${BASE_URL}/products/${p.slug}`,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const allProducts = getStorefrontProducts();
  const p = allProducts.find(
    (x) => x.slug === slug || x.slug.toLowerCase() === slug.toLowerCase()
  );
  if (!p) notFound();

  // JSON-LD Product structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.images,
    sku: p.slug,
    brand: {
      "@type": "Brand",
      name: "Zafiro Indio",
    },
    offers: {
      "@type": "Offer",
      url: `${BASE_URL}/products/${p.slug}`,
      priceCurrency: "INR",
      price: p.price,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "Zafiro Indio",
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: p.rating,
      reviewCount: p.reviews,
      bestRating: 5,
      worstRating: 1,
    },
    material: p.fabric,
    category: p.category,
    additionalProperty: [
      ...p.sizes.map((s) => ({
        "@type": "PropertyValue",
        name: "Size",
        value: s,
      })),
      ...p.colors.map((c) => ({
        "@type": "PropertyValue",
        name: "Color",
        value: c,
      })),
    ],
  };

  // BreadcrumbList JSON-LD
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${BASE_URL}/shop` },
      {
        "@type": "ListItem",
        position: 3,
        name: p.category,
        item: `${BASE_URL}/shop?collection=${p.category.toLowerCase()}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: p.name,
        item: `${BASE_URL}/products/${p.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Track dwell time — invisible, saves to localStorage on unmount */}
      <ProductViewTracker slug={p.slug} />
      <ProductClient p={p} />
      {/* Personalised recommendations — only shows after user has browsed */}
      <SmartRecommendations
        excludeSlug={p.slug}
        mode="interest"
        title="You Might Also Love"
        subtitle="Based on the products you've spent the most time with."
        maxItems={4}
      />
      <SmartRecommendations
        excludeSlug={p.slug}
        mode="recent"
        title="Recently Viewed"
        subtitle="Pick up where you left off."
        maxItems={4}
      />
    </>
  );
}
