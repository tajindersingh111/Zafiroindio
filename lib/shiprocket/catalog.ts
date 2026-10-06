import { readCollection } from "@/lib/db/store";
import { getOrCreateVariantId } from "@/lib/shiprocket/variants";
import type { Product } from "@/lib/db/types";

/**
 * Catalogue in the Shopify-style shape Shiprocket Checkout pulls from a custom platform
 * (products, collections, products-by-collection). Prices are always the live database prices,
 * which is what makes the hosted checkout trustworthy: the browser can never change a price.
 */
export interface SrVariant {
  id: string;
  title: string;
  price: string;
  compare_at_price: string | null;
  sku: string;
  quantity: number;
  taxable: boolean;
  option_values: { name: string; value: string }[];
  grams: number;
  weight: number;
  image: { src: string } | null;
  created_at: string;
  updated_at: string;
}

export interface SrProduct {
  id: string;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  handle: string;
  tags: string;
  status: string;
  image: { src: string } | null;
  images: { src: string }[];
  variants: SrVariant[];
  created_at: string;
  updated_at: string;
}

const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

function absoluteUrl(src: string | undefined, origin: string): string | null {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return `${origin}${src.startsWith("/") ? "" : "/"}${src}`;
}

export async function toSrProduct(p: Product, origin: string): Promise<SrProduct> {
  const images = (p.images || []).map((i) => absoluteUrl(i, origin)).filter(Boolean).map((src) => ({ src: src as string }));
  const mrp = p.mrp ?? p.price;
  const variants: SrVariant[] = [];

  if (p.variations?.length) {
    for (const v of p.variations) {
      variants.push({
        id: await getOrCreateVariantId(p.id, v.id),
        title: v.attributes.map((a) => a.value).join(" / ") || p.name,
        price: money(v.salePrice ?? v.price),
        compare_at_price: v.salePrice && v.price > v.salePrice ? money(v.price) : null,
        sku: v.sku || p.sku,
        quantity: p.manageStock === false ? 9999 : Math.max(0, v.stock),
        taxable: p.taxClass !== "none" && p.taxClass !== "zero",
        option_values: v.attributes,
        grams: Math.round((v.weight ?? p.weight ?? 0.5) * 1000),
        weight: v.weight ?? p.weight ?? 0.5,
        image: absoluteUrl(v.image, origin) ? { src: absoluteUrl(v.image, origin) as string } : images[0] ?? null,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      });
    }
  } else {
    const price = p.salePrice ?? p.price;
    variants.push({
      id: await getOrCreateVariantId(p.id),
      title: "Default",
      price: money(price),
      compare_at_price: mrp > price ? money(mrp) : null,
      sku: p.sku,
      quantity: p.manageStock === false ? 9999 : Math.max(0, p.stock),
      taxable: p.taxClass !== "none" && p.taxClass !== "zero",
      option_values: [],
      grams: Math.round((p.weight ?? 0.5) * 1000),
      weight: p.weight ?? 0.5,
      image: images[0] ?? null,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    });
  }

  return {
    id: p.id,
    title: p.name,
    body_html: p.description || p.shortDescription || "",
    vendor: "Zafiro Indio",
    product_type: p.categoryId || "Bedding",
    handle: p.slug,
    tags: (p.tags || []).join(", "),
    status: p.status === "active" ? "active" : "draft",
    image: images[0] ?? null,
    images,
    variants,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

export async function loadActiveProducts(): Promise<Product[]> {
  const all = await readCollection<Product>("products");
  return all.filter((p) => !p.status || p.status === "active");
}
