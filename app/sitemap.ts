import type { MetadataRoute } from "next";
import { getCatalogProducts, getCatalogCollections } from "@/lib/storefront/catalog";

export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://zafiroindio.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections] = await Promise.all([getCatalogProducts(), getCatalogCollections()]);
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/collections`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/search`, changeFrequency: "weekly", priority: 0.6 },
    // Policy and help pages (the payment gateway and search engines both look for these).
    { url: `${BASE}/contact`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/shipping-policy`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/return-policy`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/privacy-policy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
  return [
    ...staticPages,
    ...collections.map((c) => ({ url: `${BASE}/collections/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.85 })),
    ...products.map((p) => ({ url: `${BASE}/products/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
