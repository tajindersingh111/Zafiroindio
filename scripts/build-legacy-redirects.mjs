/**
 * Builds lib/seo/legacy-redirects.json: where each page of the old WordPress shop now lives.
 *
 *   DATABASE_URL=... node scripts/build-legacy-redirects.mjs
 *
 * Google has the old site's URLs indexed — every product at /product/<slug>/, every category at
 * /product-category/<slug>/, the pages at /about-us/ and so on. The new shop uses different paths, so
 * without this every one of them is a 404 and the search ranking they earned is gone. A permanent
 * redirect tells Google the page has moved and carries its standing across.
 *
 * Inputs: the WordPress backup in .backups/ and the live catalogue. Each destination is checked against
 * the new site before it is written; a product with no counterpart falls back to its category, and a
 * category with none to the shop, rather than to a page that does not exist.
 *
 * Pages that were never real content (sample page, typography demo, lorem-ipsum posts) are left to 404 on
 * purpose: redirecting junk to the home page is what search engines treat as a "soft 404".
 */

import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const SITE = process.env.SITE_URL || "https://zafiroindio.com";
const BACKUP = path.join(process.cwd(), ".backups", "wordpress", "2026-11-18");
const OUT = path.join(process.cwd(), "lib", "seo", "legacy-redirects.json");
const load = (name) => JSON.parse(fs.readFileSync(path.join(BACKUP, `${name}.json`), "utf8"));

const strip = (url) => String(url || "").replace(/^https?:\/\/[^/]+/, "").replace(/\/+$/, "");
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/&amp;|&#038;/g, "and")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const { rows: productRows } = await client.query(
  `SELECT id, data->>'slug' AS slug FROM documents WHERE collection='products' AND coalesce(data->>'status','active')='active'`
);
await client.end();
const newSlugById = new Map(productRows.filter((r) => r.slug).map((r) => [String(r.id), r.slug]));
const newSlugs = new Set(newSlugById.values());

/** Collections the live site actually serves, read from its own collections page. */
const collectionsHtml = await (await fetch(`${SITE}/collections`, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
const liveCollections = [...new Set([...collectionsHtml.matchAll(/href="\/collections\/([^"?#]+)"/g)].map((m) => m[1]))];
console.log(`live collections: ${liveCollections.join(", ")}`);

// ── Categories ───────────────────────────────────────────────────────
const oldCats = load("product_cat");
const catById = new Map(oldCats.map((c) => [c.id, c]));
const collectionFor = (oldCat) => {
  const bySlug = liveCollections.find((c) => c === oldCat.slug);
  if (bySlug) return bySlug;
  const wanted = norm(oldCat.name);
  return liveCollections.find((c) => norm(c) === wanted) ?? null;
};

const decode = (v) => {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};
/** Old slugs carry percent-encoded characters (a 112" mark is %e2%80%b3); store them decoded and lower-case. */
const key = (v) => decode(v).toLowerCase();

const categories = {}; // old category path (after /product-category/) -> collection
for (const cat of oldCats) {
  const target = collectionFor(cat);
  categories[key(strip(cat.link).replace(/^\/product-category\//, ""))] = target ? `/collections/${target}` : "/shop";
}

// ── Products ─────────────────────────────────────────────────────────
const products = {}; // old slug -> new path
let byId = 0;
let sameSlug = 0;
let viaCategory = 0;
let toShop = 0;
for (const p of load("wc-products")) {
  const oldSlug = key(p.slug || strip(p.permalink).split("/").pop());
  const newSlug = newSlugById.get(String(p.id)) ?? (newSlugs.has(decode(p.slug)) ? decode(p.slug) : null);
  if (newSlug) {
    products[oldSlug] = `/products/${newSlug}`;
    newSlugById.has(String(p.id)) ? byId++ : sameSlug++;
    continue;
  }
  // No counterpart: send the visitor to the section it belonged to.
  const cat = (p.categories || []).map((c) => catById.get(c.id)).filter(Boolean).map(collectionFor).find(Boolean);
  if (cat) {
    products[oldSlug] = `/collections/${cat}`;
    viaCategory++;
  } else {
    products[oldSlug] = "/shop";
    toShop++;
  }
}

// ── Pages ────────────────────────────────────────────────────────────
const pages = {
  "/about-us": "/about",
  "/contact-us": "/contact",
  "/shipping": "/shipping-policy",
  "/refund": "/return-policy",
  "/privacy": "/privacy-policy",
  "/privacy-policy-2": "/privacy-policy",
  "/my-account": "/account",
  "/my-account-2": "/account",
  "/cart-2": "/cart",
  "/checkout-2": "/checkout",
  "/shop-old": "/shop",
  "/shipment-tracking": "/track",
  "/order-tracking": "/track",
  "/b2b-bulk-orders": "/bulk-order",
  "/compare": "/shop",
  // The shop's own WordPress sitemaps, so a crawler that remembers them finds the new one.
  "/sitemap_index.xml": "/sitemap.xml",
  "/wp-sitemap.xml": "/sitemap.xml",
  "/product-sitemap.xml": "/sitemap.xml",
};
const SAFE = /^\/[a-z0-9\-_/.]+$/;
const pageList = Object.entries(pages).filter(([from, to]) => from !== to && SAFE.test(from));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ pages: pageList, categories, products }, null, 1));

console.log(`
products: ${byId} matched by id, ${sameSlug} by slug, ${viaCategory} to their collection, ${toShop} to the shop`);
console.log(`categories: ${Object.keys(categories).length}   pages: ${pageList.length}`);
console.log(`written to ${path.relative(process.cwd(), OUT)}`);
