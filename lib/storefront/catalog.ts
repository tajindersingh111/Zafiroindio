import fs from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import { listPrice, sellingPrice } from "@/lib/price-rules";
import { prisma } from "@/lib/db/prisma";
import { readCollection } from "@/lib/db/store";
import { cached } from "@/lib/cache";
import { products as demoProducts, collections as demoCollections, type Product, type Banner } from "@/lib/data";
import type { Product as DbProduct } from "@/lib/db/types";

const PLACEHOLDER = "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85";
/** Storefront data is at most this old on any one server (admin edits also clear it instantly). */
const TTL = 60_000;

export type StoreCollection = { id?: string; name: string; slug: string; desc: string; image: string };

/**
 * Database errors: at build time the page is switched to request-time rendering instead of failing the
 * build; in development the demo catalogue keeps the UI usable; in production the error surfaces
 * (the cache keeps serving the last good catalogue whenever it has one).
 */
async function guard<T>(load: () => Promise<T>, devFallback: T): Promise<T> {
  try {
    return await load();
  } catch (e) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      console.warn("[catalog] database unreachable during build; rendering this page on request instead.");
      await connection();
    }
    if (process.env.NODE_ENV === "production") throw e;
    console.warn("[catalog] database unavailable, using demo catalogue (dev only)");
    return devFallback;
  }
}

/** Active catalogue rows exactly as stored (shared by the storefront and the Shiprocket catalogue feed). */
export function getActiveDbProducts(): Promise<DbProduct[]> {
  return cached("catalog:db-products", TTL, async () => {
    const all = await readCollection<DbProduct & { status?: string }>("products");
    return all.filter((p) => !p.status || p.status === "active" || p.status === ("published" as string));
  });
}

/** Approved-review count and average per product, computed in SQL (review bodies/photos never leave the DB). */
async function reviewStats(): Promise<Map<string, { avg: number; n: number }>> {
  const rows = await prisma.$queryRaw<{ pid: string; n: number; avg: number | null }[]>`
    SELECT data->>'productId' AS pid,
           COUNT(*)::int AS n,
           AVG(CASE WHEN jsonb_typeof(data->'rating') = 'number' THEN (data->>'rating')::float END) AS avg
    FROM documents
    WHERE collection = 'reviews' AND data->>'status' = 'approved'
    GROUP BY 1`;
  return new Map(rows.filter((r) => r.pid).map((r) => [r.pid, { avg: Number(r.avg) || 0, n: r.n }]));
}

/**
 * Units sold per product id from real orders (cancelled / failed / refunded ones excluded). Orders
 * imported from WooCommerce reference products as "prod-<id>", so that prefix is stripped.
 */
async function salesStats(): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ pid: string; units: number }[]>`
    SELECT regexp_replace(item->>'productId', '^prod-', '') AS pid,
           SUM(GREATEST(COALESCE((item->>'quantity')::int, 0), 0))::int AS units
    FROM documents, jsonb_array_elements(CASE WHEN jsonb_typeof(data->'items') = 'array' THEN data->'items' ELSE '[]'::jsonb END) AS item
    WHERE collection = 'orders'
      AND COALESCE(data->>'status', '') NOT IN ('cancelled', 'refunded', 'payment_failed', 'failed', 'payment_pending', 'pending_payment')
      AND item->>'productId' IS NOT NULL
    GROUP BY 1`;
  return new Map(rows.map((r) => [r.pid, Number(r.units) || 0]));
}

/** A product counts as a bestseller when it is among the top sellers and has sold at least this many units. */
const BESTSELLER_TOP = 8;
const BESTSELLER_MIN_UNITS = 5;

type CategoryInfo = { name: string; slug: string };

/** "Runner &amp; Table Mats." -> "Runner & Table Mats" (names came from a WordPress export). */
const cleanName = (s: string) => s.replace(/&amp;/g, "&").replace(/&#0?39;|&rsquo;/g, "'").replace(/\s*\.\s*$/, "").trim();
const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function getCategories(): Promise<Map<string, CategoryInfo>> {
  return cached("catalog:categories", TTL, async () => {
    const rows = await readCollection<{ id: string; name: string; slug?: string }>("categories");
    return new Map(rows.map((c) => [c.id, { name: cleanName(c.name || c.id), slug: slugify(c.slug || c.name || c.id) || c.id }]));
  });
}

function toStorefront(p: any, stats: Map<string, { avg: number; n: number }>, cats: Map<string, CategoryInfo>, popularity: Map<string, number>, topSellers: Set<string>): Product {
  const images: string[] =
    Array.isArray(p.images) && p.images.length > 0
      ? p.images.map((img: any) => (typeof img === "string" ? img : img?.url)).filter(Boolean)
      : [PLACEHOLDER];
  const price = sellingPrice(p);
  const oldPrice = Math.max(listPrice(p), price);
  const discount = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
  const a = stats.get(p.id) ?? stats.get(p.slug);
  const tags: string[] = Array.isArray(p.tags) ? p.tags : [];

  let badge: string | undefined;
  if (p.manageStock !== false && Number(p.stock) <= 0) badge = "SOLD OUT";
  else if (tags.includes("bestseller") || topSellers.has(p.id)) badge = "BESTSELLER";
  else if (tags.includes("new")) badge = "NEW";

  return {
    slug: p.slug || p.id,
    name: p.name,
    price,
    oldPrice,
    discount,
    rating: a?.n ? Math.round(a.avg * 10) / 10 : 0,
    reviews: a?.n ?? 0,
    badge,
    fabric: p.fabric || "",
    category: p.categoryId || p.category || "",
    categoryName: cats.get(p.categoryId)?.name ?? (p.categoryName ? cleanName(String(p.categoryName)) : undefined),
    categorySlug: cats.get(p.categoryId)?.slug ?? (p.categoryName ? slugify(cleanName(String(p.categoryName))) : undefined),
    collections: Array.isArray(p.collections) ? p.collections : undefined,
    colors: p.attributes?.Color || [],
    sizes: p.attributes?.Size || [],
    description: p.description || p.shortDescription || "",
    images,
    popularity: popularity.get(p.id) ?? 0,
    createdAt: typeof p.createdAt === "string" ? p.createdAt : undefined,
  };
}

type Catalog = { products: Product[]; bySlug: Map<string, Product> };

function getCatalog(): Promise<Catalog> {
  return cached("catalog:storefront", TTL, async () => {
    const [rows, stats, cats, sold] = await Promise.all([
      getActiveDbProducts(),
      reviewStats(),
      getCategories().catch(() => new Map<string, CategoryInfo>()),
      salesStats().catch((e) => {
        console.error("[catalog] sales stats unavailable:", e);
        return new Map<string, number>();
      }),
    ]);
    const ranked = rows
      .map((p) => ({ id: p.id as string, units: sold.get(p.id) ?? 0 }))
      .filter((x) => x.units > 0)
      .sort((a, b) => b.units - a.units);
    const popularity = new Map(ranked.map((x, i) => [x.id, ranked.length - i]));
    const topSellers = new Set(ranked.filter((x) => x.units >= BESTSELLER_MIN_UNITS).slice(0, BESTSELLER_TOP).map((x) => x.id));
    const products = rows.map((p) => toStorefront(p, stats, cats, popularity, topSellers));
    return { products, bySlug: new Map(products.map((p) => [p.slug, p])) };
  });
}

const DEMO: Catalog = { products: demoProducts, bySlug: new Map(demoProducts.map((p) => [p.slug, p])) };

/** Storefront products from Postgres, with real review aggregates. Demo catalogue only outside production. */
export async function getCatalogProducts(): Promise<Product[]> {
  const c = await guard(getCatalog, DEMO);
  if (!c.products.length && process.env.NODE_ENV !== "production") return demoProducts;
  return c.products;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const c = await guard(getCatalog, DEMO);
  return c.bySlug.get(slug) ?? (process.env.NODE_ENV !== "production" && !c.products.length ? DEMO.bySlug.get(slug) ?? null : null);
}

/** Products that belong to a collection or category slug (admin collections first, then categories). */
export function productsIn(products: Product[], c: { id?: string; slug: string }): Product[] {
  return products.filter((p) => p.collections?.some((x) => x === c.slug || (!!c.id && x === c.id)) || p.categorySlug === c.slug || p.category === c.slug);
}

/**
 * Collections for the storefront: the admin's collections that actually contain products, or, until
 * products are assigned to collections, the real product categories (with a real product photo).
 */
export async function getCatalogCollections(): Promise<StoreCollection[]> {
  const [rows, products] = await Promise.all([guard(() => cached("catalog:collections", TTL, () => readCollection<any>("collections")), null), getCatalogProducts()]);
  const curated = (rows ?? [])
    .filter((c) => productsIn(products, c).length > 0)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, desc: c.desc || "", image: c.image || productsIn(products, c)[0]?.images[0] || PLACEHOLDER }));
  if (curated.length) return curated;

  const byCategory = new Map<string, { name: string; items: Product[] }>();
  for (const p of products) {
    if (!p.categorySlug) continue;
    const g = byCategory.get(p.categorySlug) ?? { name: p.categoryName || p.categorySlug, items: [] };
    g.items.push(p);
    byCategory.set(p.categorySlug, g);
  }
  const categories = Array.from(byCategory, ([slug, g]) => ({
    name: g.name,
    slug,
    desc: `${g.items.length} hand-block printed ${g.items.length === 1 ? "piece" : "pieces"}, made in Jaipur.`,
    image: g.items[0].images[0] || PLACEHOLDER,
    count: g.items.length,
  })).sort((a, b) => b.count - a.count);
  if (categories.length) return categories.map(({ count: _count, ...c }) => c);
  return process.env.NODE_ENV === "production" ? [] : demoCollections;
}

/** Every banner row (hero banners and announcement-bar messages), cached. */
export function getBannerRows(): Promise<any[]> {
  return cached("catalog:banners", TTL, () => readCollection<any>("banners"));
}

const inDate = (b: any, today = new Date().toISOString().slice(0, 10)) =>
  b.isActive !== false && (!b.startDate || b.startDate <= today) && (!b.endDate || b.endDate >= today);

/**
 * A site-relative image must exist in /public, or the hero would render a broken image. Admin
 * uploads (/uploads/…) live in the database and are served by app/uploads/[file].
 */
const imageAvailable = (src: string) =>
  !src.startsWith("/") || src.startsWith("/uploads/") || fs.existsSync(path.join(process.cwd(), "public", decodeURI(src.split("?")[0])));

/** Active, in-date hero banners managed from the admin panel. */
export async function getCatalogBanners(): Promise<Banner[]> {
  // Banners are decorative: never let them take the page down.
  const [rows, collections, products] = await Promise.all([
    getBannerRows().catch(() => [] as any[]),
    getCatalogCollections().catch(() => [] as StoreCollection[]),
    getCatalogProducts().catch(() => [] as Product[]),
  ]);
  // A banner button must lead somewhere real: an unknown collection / product falls back to the shop.
  const collectionSlugs = new Set(collections.map((c) => c.slug));
  const productSlugs = new Set(products.map((p) => p.slug));
  const reachable = (link: string) => {
    const [, kind, slug] = link.split("?")[0].match(/^\/(collections|products)\/([^/]+)\/?$/) ?? [];
    if (kind === "collections") return collectionSlugs.has(decodeURIComponent(slug));
    if (kind === "products") return productSlugs.has(decodeURIComponent(slug));
    return true;
  };
  return rows
    .filter((b) => (b.type ?? "banner") === "banner" && inDate(b)) // admin list order = slide order
    .map((b) => {
      // "/collection/x" (singular) is a common typo for the collections route.
      const link = String(b.ctaUrl || b.ctaLink || "/shop").trim().replace(/^\/collection\//, "/collections/");
      return {
        id: b.id,
        title: b.heading || b.title || "",
        subtitle: b.subheading || b.subtitle || "",
        ctaText: b.ctaText || "Shop Collection",
        ctaLink: reachable(link) ? link : "/shop",
        image: b.image,
        isActive: true,
      };
    })
    .filter((b) => b.title && b.image && imageAvailable(b.image))
    .slice(0, 5);
}

/** Messages for the announcement bar. */
export async function getAnnouncements(): Promise<string[]> {
  const rows = await getBannerRows().catch(() => [] as any[]);
  return rows.filter((b) => b.type === "announcement" && inDate(b)).map((b) => String(b.heading || b.subheading || "").trim()).filter(Boolean);
}
