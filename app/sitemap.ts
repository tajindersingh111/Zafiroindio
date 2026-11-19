import type { MetadataRoute } from "next";
import { getActiveDbProducts, getCatalogProducts, getCatalogCollections, productsIn } from "@/lib/storefront/catalog";

export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://zafiroindio.com";
const abs = (u: string) => (/^https?:\/\//i.test(u) ? u : `${BASE}${u.startsWith("/") ? "" : "/"}${u}`);

/**
 * Every page worth indexing, with the date it last changed.
 *
 * `lastModified` is only worth sending when it is true: a crawler learns to ignore a sitemap that claims
 * everything changed today, so the static pages carry none, and a product or collection carries the date
 * it was actually last edited. Each product also lists its photo, so the image shows up in image search.
 * Search results, the wishlist and sign-in are left out on purpose; they are not indexable.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections, rows] = await Promise.all([
    getCatalogProducts(),
    getCatalogCollections(),
    getActiveDbProducts().catch(() => [] as any[]),
  ]);

  const editedAt = new Map<string, Date>();
  for (const r of rows as any[]) {
    const when = r.updatedAt ? new Date(r.updatedAt) : null;
    if (when && !Number.isNaN(when.getTime())) editedAt.set(r.slug || r.id, when);
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/collections`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/bulk-order`, changeFrequency: "monthly", priority: 0.6 },
    // Policy and help pages (the payment gateway and search engines both look for these).
    { url: `${BASE}/contact`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/shipping-policy`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/return-policy`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/privacy-policy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const newest = (dates: (Date | undefined)[]) => {
    const real = dates.filter((d): d is Date => !!d);
    return real.length ? new Date(Math.max(...real.map((d) => d.getTime()))) : undefined;
  };

  return [
    ...staticPages,
    ...collections.map((c) => ({
      url: `${BASE}/collections/${c.slug}`,
      lastModified: newest(productsIn(products, c).map((p) => editedAt.get(p.slug))),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    ...products.map((p) => ({
      url: `${BASE}/products/${p.slug}`,
      lastModified: editedAt.get(p.slug),
      ...(p.images?.[0] ? { images: [abs(p.images[0])] } : {}),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
