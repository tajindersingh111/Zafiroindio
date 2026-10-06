import { readCollection } from "@/lib/db/store";
import { products as demoProducts, collections as demoCollections, type Product, type Banner } from "@/lib/data";

const PLACEHOLDER = "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85";

export type StoreCollection = { id?: string; name: string; slug: string; desc: string; image: string };

/** Storefront products from Postgres, with real review aggregates. Demo catalogue only outside production. */
export async function getCatalogProducts(): Promise<Product[]> {
  let dbProducts: any[] = [];
  let reviews: any[] = [];
  try {
    [dbProducts, reviews] = await Promise.all([readCollection<any>("products"), readCollection<any>("reviews")]);
  } catch (e) {
    if (process.env.NODE_ENV === "production") throw e;
    console.warn("[catalog] database unavailable, using demo catalogue (dev only)");
    return demoProducts;
  }

  if (!dbProducts.length) return process.env.NODE_ENV === "production" ? [] : demoProducts;

  const agg = new Map<string, { sum: number; n: number }>();
  for (const r of reviews) {
    if (r.status !== "approved") continue;
    const a = agg.get(r.productId) ?? { sum: 0, n: 0 };
    a.sum += Number(r.rating) || 0;
    a.n += 1;
    agg.set(r.productId, a);
  }

  return dbProducts
    .filter((p) => p.status === "active" || p.status === "published" || p.status === undefined)
    .map((p): Product => {
      const images: string[] =
        Array.isArray(p.images) && p.images.length > 0
          ? p.images.map((img: any) => (typeof img === "string" ? img : img?.url)).filter(Boolean)
          : [PLACEHOLDER];
      const price = Number(p.salePrice ?? p.price) || 0;
      const oldPrice = Math.max(Number(p.mrp) || Number(p.price) || 0, price);
      const discount = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
      const a = agg.get(p.id) ?? agg.get(p.slug);
      const tags: string[] = Array.isArray(p.tags) ? p.tags : [];

      let badge: string | undefined;
      if (p.manageStock !== false && Number(p.stock) <= 0) badge = "SOLD OUT";
      else if (tags.includes("bestseller")) badge = "BESTSELLER";
      else if (tags.includes("new")) badge = "NEW";

      return {
        slug: p.slug || p.id,
        name: p.name,
        price,
        oldPrice,
        discount,
        rating: a ? Math.round((a.sum / a.n) * 10) / 10 : 0,
        reviews: a?.n ?? 0,
        badge,
        fabric: p.fabric || "",
        category: p.categoryId || p.category || "",
        collections: Array.isArray(p.collections) ? p.collections : undefined,
        colors: p.attributes?.Color || [],
        sizes: p.attributes?.Size || [],
        description: p.description || p.shortDescription || "",
        images,
      };
    });
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return (await getCatalogProducts()).find((p) => p.slug === slug) ?? null;
}

export async function getCatalogCollections(): Promise<StoreCollection[]> {
  let rows: any[] = [];
  try {
    rows = await readCollection<any>("collections");
  } catch (e) {
    if (process.env.NODE_ENV === "production") throw e;
    return demoCollections;
  }
  if (rows.length) {
    return rows.map((c) => ({ id: c.id, name: c.name, slug: c.slug, desc: c.desc || "", image: c.image || PLACEHOLDER }));
  }
  return process.env.NODE_ENV === "production" ? [] : demoCollections;
}

/** Active, in-date banners managed from the admin panel. */
export async function getCatalogBanners(): Promise<Banner[]> {
  // Banners are decorative: never let them take the page down.
  const rows = await readCollection<any>("banners").catch(() => [] as any[]);
  const today = new Date().toISOString().slice(0, 10);
  return rows
    .filter((b) => b.isActive !== false && (!b.startDate || b.startDate <= today) && (!b.endDate || b.endDate >= today))
    .map((b) => ({
      id: b.id,
      title: b.heading || b.title || "",
      subtitle: b.subheading || b.subtitle || "",
      ctaText: b.ctaText || "Shop Collection",
      ctaLink: b.ctaUrl || b.ctaLink || "/shop",
      image: b.image,
      isActive: true,
    }))
    .filter((b) => b.title && b.image);
}
