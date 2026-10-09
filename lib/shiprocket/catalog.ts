import { readCollection } from "@/lib/db/store";
import { listPrice, sellingPrice } from "@/lib/price-rules";
import { cached } from "@/lib/cache";
import { getActiveDbProducts } from "@/lib/storefront/catalog";
import { collectionNumbersFor, productNumbersFor, variantIdsFor, variantKey } from "@/lib/shiprocket/variants";
import type { Product } from "@/lib/db/types";

/**
 * Catalogue in the Shopify-style shape Shiprocket Checkout pulls from a custom platform
 * (products, collections, products-by-collection). Prices are always the live database prices,
 * which is what makes the hosted checkout trustworthy: the browser can never change a price.
 * All ids are numeric, as Shiprocket expects.
 */
export interface SrVariant {
  id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  sku: string;
  quantity: number;
  taxable: boolean;
  option_values: Record<string, string>;
  grams: number;
  weight: number;
  weight_unit: "kg";
  image: { src: string } | null;
  created_at: string;
  updated_at: string;
}

export interface SrProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  handle: string;
  tags: string;
  status: string;
  image: { src: string } | null;
  images: { src: string }[];
  options: { name: string; values: string[] }[];
  variants: SrVariant[];
  created_at: string;
  updated_at: string;
}

export interface SrCollection {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  image: { src: string } | null;
  created_at: string;
  updated_at: string;
}

type StoreCollectionRow = { id?: string; name: string; slug: string; desc?: string; image?: string; createdAt?: string; updatedAt?: string };

const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

function absoluteUrl(src: string | undefined, origin: string): string | null {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return `${origin}${src.startsWith("/") ? "" : "/"}${src}`;
}

/** Shapes a page of products; numeric ids are looked up (or allocated) in bulk. */
export async function toSrProducts(products: Product[], origin: string): Promise<SrProduct[]> {
  const refs = products.flatMap((p) => (p.variations?.length ? p.variations.map((v) => ({ productId: p.id, variationId: v.id })) : [{ productId: p.id }]));
  const [variantIds, productIds] = await Promise.all([variantIdsFor(refs), productNumbersFor(products.map((p) => p.id))]);

  return products.map((p) => {
    const images = (p.images || []).map((i) => absoluteUrl(i, origin)).filter(Boolean).map((src) => ({ src: src as string }));
    const taxable = p.taxClass !== "none" && p.taxClass !== "zero";
    const variants: SrVariant[] = [];
    const options = new Map<string, Set<string>>();

    if (p.variations?.length) {
      for (const v of p.variations) {
        for (const a of v.attributes) (options.get(a.name) ?? options.set(a.name, new Set()).get(a.name)!).add(a.value);
        const img = absoluteUrl(v.image, origin);
        variants.push({
          id: Number(variantIds.get(variantKey(p.id, v.id))),
          title: v.attributes.map((a) => a.value).join(" / ") || p.name,
          price: money(sellingPrice(v)),
          compare_at_price: listPrice(v) > sellingPrice(v) ? money(listPrice(v)) : null,
          sku: v.sku || p.sku,
          quantity: p.manageStock === false ? 9999 : Math.max(0, v.stock),
          taxable,
          option_values: Object.fromEntries(v.attributes.map((a) => [a.name, a.value])),
          grams: Math.round((v.weight ?? p.weight ?? 0.5) * 1000),
          weight: v.weight ?? p.weight ?? 0.5,
          weight_unit: "kg",
          image: img ? { src: img } : images[0] ?? null,
          created_at: p.createdAt,
          updated_at: p.updatedAt,
        });
      }
    } else {
      const price = sellingPrice(p);
      const mrp = listPrice(p);
      variants.push({
        id: Number(variantIds.get(variantKey(p.id))),
        title: "Default Title",
        price: money(price),
        compare_at_price: mrp > price ? money(mrp) : null,
        sku: p.sku,
        quantity: p.manageStock === false ? 9999 : Math.max(0, p.stock),
        taxable,
        option_values: {},
        grams: Math.round((p.weight ?? 0.5) * 1000),
        weight: p.weight ?? 0.5,
        weight_unit: "kg",
        image: images[0] ?? null,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      });
    }

    return {
      id: Number(productIds.get(p.id)),
      title: p.name,
      body_html: p.description || p.shortDescription || "",
      vendor: "Zafiro Indio",
      product_type: (p as Product & { categoryName?: string }).categoryName || p.categoryId || "Bedding",
      handle: p.slug,
      tags: (p.tags || []).join(", "),
      status: "active",
      image: images[0] ?? null,
      images,
      options: Array.from(options, ([name, values]) => ({ name, values: Array.from(values) })),
      variants,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    };
  });
}

export const loadActiveProducts = getActiveDbProducts;

export function loadCollections(): Promise<StoreCollectionRow[]> {
  return cached("catalog:collections", 60_000, () => readCollection<StoreCollectionRow>("collections"));
}

export async function toSrCollections(rows: StoreCollectionRow[], origin: string): Promise<SrCollection[]> {
  const ids = await collectionNumbersFor(rows.map((c) => c.slug));
  const now = new Date().toISOString();
  return rows.map((c) => {
    const img = absoluteUrl(c.image, origin);
    return {
      id: Number(ids.get(c.slug)),
      title: c.name,
      handle: c.slug,
      body_html: c.desc || "",
      image: img ? { src: img } : null,
      created_at: c.createdAt || now,
      updated_at: c.updatedAt || now,
    };
  });
}

/** Products that belong to a collection (by slug, collection id, or category). */
export function productsInCollection(all: Product[], col: { id?: string; slug: string }): Product[] {
  return all.filter((p) => p.collections?.includes(col.slug) || (!!col.id && p.collections?.includes(col.id)) || p.categoryId === col.slug);
}
