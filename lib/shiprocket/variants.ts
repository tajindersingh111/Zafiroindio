import { prisma } from "@/lib/db/prisma";
import { nextSequence } from "@/lib/db/store";

/**
 * Shiprocket Checkout identifies products, variants and collections by NUMERIC ids (Shopify style).
 * Our catalogue uses string ids / slugs, so every sellable unit, product and collection gets a
 * permanent numeric id the first time it is needed. Mappings live in Postgres:
 *   keys collection: "<our key>"     -> { value: "<number>" }
 *   map collection:  "<number>"      -> { ...what it points to }
 * Variant ids keep their original collections/sequence so ids already synced to Shiprocket stay valid.
 */
type Space = { keys: string; map: string; seq: string; start: number };
const VARIANT: Space = { keys: "sr-variant-keys", map: "sr-variants", seq: "sr-variant", start: 1_000_000 };
const PRODUCT: Space = { keys: "sr-product-keys", map: "sr-products", seq: "sr-product", start: 5_000_000 };
const COLLECTION: Space = { keys: "sr-collection-keys", map: "sr-collections", seq: "sr-collection", start: 7_000_000 };

export interface VariantRef {
  variantId: string;
  productId: string;
  variationId?: string;
}

const variantKey = (productId: string, variationId?: string) => `${productId}|${variationId ?? ""}`;
const numberOf = (data: unknown) => String((data as { variantId?: string; value?: string }).variantId ?? (data as { value?: string }).value);

async function allocate(space: Space, key: string, target: Record<string, unknown>): Promise<string> {
  const value = String(await nextSequence(space.seq, space.start));
  try {
    // Variant rows keep their historical shape ({ variantId }).
    await prisma.document.create({ data: { collection: space.keys, id: key, data: space === VARIANT ? { variantId: value } : { value } } });
  } catch {
    // Lost a race with a concurrent request: use the winner's number.
    const winner = await prisma.document.findUnique({ where: { collection_id: { collection: space.keys, id: key } } });
    if (winner) return numberOf(winner.data);
    throw new Error("Could not allocate a Shiprocket id.");
  }
  await prisma.document.upsert({
    where: { collection_id: { collection: space.map, id: value } },
    create: { collection: space.map, id: value, data: { ...target, ...(space === VARIANT ? { variantId: value } : { value }) } },
    update: {},
  });
  return value;
}

/** Numeric ids for many keys at once (one query for the ones that exist already). */
async function numbersFor(space: Space, entries: { key: string; target: Record<string, unknown> }[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!entries.length) return out;
  const rows = await prisma.document.findMany({ where: { collection: space.keys, id: { in: entries.map((e) => e.key) } }, select: { id: true, data: true } });
  for (const r of rows) out.set(r.id, numberOf(r.data));
  for (const e of entries) if (!out.has(e.key)) out.set(e.key, await allocate(space, e.key, e.target));
  return out;
}

export async function getOrCreateVariantId(productId: string, variationId?: string): Promise<string> {
  const key = variantKey(productId, variationId);
  return (await numbersFor(VARIANT, [{ key, target: { productId, variationId } }])).get(key)!;
}

/** Variant ids for a whole catalogue page: key is `productId|variationId`. */
export function variantIdsFor(refs: { productId: string; variationId?: string }[]): Promise<Map<string, string>> {
  return numbersFor(VARIANT, refs.map((r) => ({ key: variantKey(r.productId, r.variationId), target: { productId: r.productId, variationId: r.variationId } })));
}
export { variantKey };

export function productNumbersFor(productIds: string[]): Promise<Map<string, string>> {
  return numbersFor(PRODUCT, productIds.map((id) => ({ key: id, target: { productId: id } })));
}

export function collectionNumbersFor(slugs: string[]): Promise<Map<string, string>> {
  return numbersFor(COLLECTION, slugs.map((slug) => ({ key: slug, target: { slug } })));
}

export async function resolveVariantId(variantId: string | number): Promise<VariantRef | null> {
  const row = await prisma.document.findUnique({ where: { collection_id: { collection: VARIANT.map, id: String(variantId) } } });
  return row ? (row.data as unknown as VariantRef) : null;
}

/** Our product id for a numeric Shiprocket product id. */
export async function resolveProductNumber(value: string | number): Promise<string | null> {
  const row = await prisma.document.findUnique({ where: { collection_id: { collection: PRODUCT.map, id: String(value) } } });
  return row ? String((row.data as { productId: string }).productId) : null;
}

/** Our collection slug for a numeric Shiprocket collection id. */
export async function resolveCollectionNumber(value: string | number): Promise<string | null> {
  const row = await prisma.document.findUnique({ where: { collection_id: { collection: COLLECTION.map, id: String(value) } } });
  return row ? String((row.data as { slug: string }).slug) : null;
}
