import { prisma } from "@/lib/db/prisma";
import { nextSequence } from "@/lib/db/store";

/**
 * Shiprocket Checkout identifies cart lines by a NUMERIC `variant_id`. Our catalogue uses string
 * ids / slugs, so every sellable unit (a product, or one variation of a variable product) gets a
 * permanent numeric id the first time it is needed. Mappings live in Postgres.
 */
const KEYS = "sr-variant-keys"; // id = "<productId>|<variationId?>"  -> { variantId }
const MAP = "sr-variants"; //      id = "<variantId>"                 -> { productId, variationId? }

export interface VariantRef {
  variantId: string;
  productId: string;
  variationId?: string;
}

const key = (productId: string, variationId?: string) => `${productId}|${variationId ?? ""}`;

export async function getOrCreateVariantId(productId: string, variationId?: string): Promise<string> {
  const k = key(productId, variationId);
  const existing = await prisma.document.findUnique({ where: { collection_id: { collection: KEYS, id: k } } });
  if (existing) return String((existing.data as { variantId: string }).variantId);

  const variantId = String(await nextSequence("sr-variant", 1_000_000));
  try {
    await prisma.document.create({ data: { collection: KEYS, id: k, data: { variantId } } });
  } catch {
    // lost a race with a concurrent request: use the winner's id
    const winner = await prisma.document.findUnique({ where: { collection_id: { collection: KEYS, id: k } } });
    if (winner) return String((winner.data as { variantId: string }).variantId);
    throw new Error("Could not allocate a Shiprocket variant id.");
  }
  await prisma.document.upsert({
    where: { collection_id: { collection: MAP, id: variantId } },
    create: { collection: MAP, id: variantId, data: { variantId, productId, variationId } },
    update: {},
  });
  return variantId;
}

export async function resolveVariantId(variantId: string | number): Promise<VariantRef | null> {
  const row = await prisma.document.findUnique({ where: { collection_id: { collection: MAP, id: String(variantId) } } });
  return row ? (row.data as unknown as VariantRef) : null;
}
