import { prisma } from "@/lib/db/prisma";
import { listPrice, sellingPrice } from "@/lib/price-rules";
import { getOrCreateVariantId } from "@/lib/shiprocket/variants";
import type { Product } from "@/lib/db/types";

export interface PricingInputItem {
  productId: string; // product id or slug
  qty: number;
  size?: string;
  color?: string;
}

export interface PricedLine {
  productId: string;
  variationId?: string;
  variantId: string; // numeric Shiprocket variant id
  slug: string;
  name: string;
  sku: string;
  image?: string;
  quantity: number;
  price: number; // unit price actually charged
  mrp: number;
  total: number;
  size?: string;
  color?: string;
}

export interface PricingResult {
  items: PricedLine[];
  subtotal: number;
  savings: number;
}

export class CartError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const MAX_QTY = 20;

/** Prices a cart from the DATABASE only. Client-supplied prices are never read. */
export async function priceCart(inputItems: PricingInputItem[]): Promise<PricingResult> {
  if (!Array.isArray(inputItems) || inputItems.length === 0) throw new CartError("Your cart is empty.");

  // Only the products in this cart (by id or slug) - never the whole catalogue.
  const keys = Array.from(new Set(inputItems.map((i) => String(i.productId))));
  const rows = await prisma.$queryRaw<{ data: Product }[]>`
    SELECT data FROM documents
    WHERE collection = 'products' AND (id = ANY(${keys}::text[]) OR data->>'slug' = ANY(${keys}::text[]))`;
  const byKey = new Map<string, Product>();
  for (const { data: p } of rows) {
    if (p.status && p.status !== "active") continue;
    byKey.set(p.id, p);
    byKey.set(p.slug, p);
  }

  const lines: PricedLine[] = [];
  for (const input of inputItems) {
    const product = byKey.get(input.productId);
    if (!product) throw new CartError(`"${input.productId}" is no longer available.`, 404);

    const quantity = Math.floor(Number(input.qty));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QTY) throw new CartError(`Quantity for ${product.name} must be between 1 and ${MAX_QTY}.`);

    // Variable products: match the selected options to a variation.
    let variationId: string | undefined;
    let unitPrice = sellingPrice(product);
    let mrp = listPrice(product);
    let sku = product.sku;
    let available = product.stock;
    let image = product.images?.[0];

    if (product.variations?.length) {
      const wanted = [input.size, input.color].filter(Boolean).map((v) => String(v).toLowerCase());
      const variation = product.variations.find((v) => wanted.every((w) => v.attributes.some((a) => a.value.toLowerCase() === w))) ?? (wanted.length ? undefined : product.variations[0]);
      if (!variation) throw new CartError(`Please choose a valid size/colour for ${product.name}.`);
      variationId = variation.id;
      unitPrice = sellingPrice(variation);
      mrp = listPrice(variation);
      sku = variation.sku || sku;
      available = variation.stock;
      image = variation.image ?? image;
    }

    if (product.manageStock !== false && available < quantity) {
      throw new CartError(available > 0 ? `Only ${available} of ${product.name} left in stock.` : `${product.name} is out of stock.`, 409);
    }

    lines.push({
      productId: product.id,
      variationId,
      variantId: await getOrCreateVariantId(product.id, variationId),
      slug: product.slug,
      name: product.name,
      sku,
      image,
      quantity,
      price: unitPrice,
      mrp: Math.max(mrp, unitPrice),
      total: unitPrice * quantity,
      size: input.size,
      color: input.color,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const savings = lines.reduce((s, l) => s + (l.mrp - l.price) * l.quantity, 0);
  return { items: lines, subtotal, savings };
}
