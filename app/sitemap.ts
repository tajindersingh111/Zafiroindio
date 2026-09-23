import type { MetadataRoute } from "next";
import { products, collections } from "@/lib/data";

const BASE = "https://zafiroindio.com";

export default function sitemap(): MetadataRoute.Sitemap {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/collections`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/search`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/cart`, changeFrequency: "monthly", priority: 0.3 },
  ];

  // Collection landing pages (SEO pillar pages)
  const collectionPages: MetadataRoute.Sitemap = collections.map((c) => ({
    url: `${BASE}/collections/${c.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  // Individual product pages
  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE}/products/${p.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...collectionPages, ...productPages];
}
