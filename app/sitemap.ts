import type { MetadataRoute } from "next";
import { getCatalogProducts, getCatalogCollections } from "@/lib/storefront/catalog";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://zafiroindio.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections] = await Promise.all([getCatalogProducts().catch(() => []), getCatalogCollections().catch(() => [])]);
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/collections`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/search`, changeFrequency: "weekly", priority: 0.6 },
  ];
  return [
    ...staticPages,
    ...collections.map((c) => ({ url: `${BASE}/collections/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.85 })),
    ...products.map((p) => ({ url: `${BASE}/products/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
