import { prisma } from "./db/prisma";
import { readCollection } from "./db/store";
import type { Product } from "./db/types";

export interface PricingInputItem {
  productId: string;
  qty: number;
  size?: string;
  color?: string;
}

export interface PricingCalculationResult {
  items: Array<{
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    price: number;
    total: number;
    size?: string;
    color?: string;
  }>;
  subtotal: number;
  discount: number;
  couponCode?: string;
  shippingFee: number;
  tax: number;
  total: number;
}

export async function calculateTrustedCartPricing(
  inputItems: PricingInputItem[],
  couponCode?: string
): Promise<PricingCalculationResult> {
  if (!Array.isArray(inputItems) || inputItems.length === 0) {
    throw new Error("Cart items are required for price calculation.");
  }

  let dbProducts: Array<{ id: string; slug: string; name: string; price: number; stock: number; sku?: string | null }> = [];

  try {
    const slugs = inputItems.map((i) => i.productId);
    dbProducts = await prisma.product.findMany({
      where: { OR: [{ slug: { in: slugs } }, { id: { in: slugs } }] },
      select: { id: true, slug: true, name: true, price: true, stock: true, sku: true }
    });
  } catch {
    const jsonProducts = readCollection<Product>("products");
    dbProducts = jsonProducts.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: Number(p.price || 0),
      stock: Number(p.stock || 0),
      sku: p.sku
    }));
  }

  const processedItems = inputItems.map((input) => {
    const product = dbProducts.find((p) => p.slug === input.productId || p.id === input.productId);
    if (!product) {
      throw new Error(`Product not found for ID or slug: ${input.productId}`);
    }
    const quantity = Math.max(1, Math.floor(Number(input.qty || 1)));
    const price = Number(product.price || 0);
    const total = price * quantity;
    const sku = product.sku || `ZI-${product.slug.toUpperCase().slice(0, 8)}`;

    return {
      productId: product.id,
      name: product.name,
      sku,
      quantity,
      price,
      total,
      size: input.size,
      color: input.color
    };
  });

  const subtotal = Math.round(processedItems.reduce((acc, item) => acc + item.total, 0));

  // Evaluate Coupon Discount
  let discount = 0;
  let validCoupon: string | undefined = undefined;

  if (couponCode && couponCode.trim()) {
    const cleanCoupon = couponCode.trim().toUpperCase();
    if (cleanCoupon === "WELCOME10") {
      discount = Math.round((subtotal * 10) / 100);
      validCoupon = "WELCOME10";
    } else if (cleanCoupon === "FESTIVE20") {
      discount = Math.round((subtotal * 20) / 100);
      validCoupon = "FESTIVE20";
    } else if (cleanCoupon === "ZAFIRO15") {
      discount = Math.round((subtotal * 15) / 100);
      validCoupon = "ZAFIRO15";
    }
  }

  // Evaluate Free Shipping Above ₹999
  const shippingFee = subtotal >= 999 || subtotal === 0 ? 0 : 99;
  const tax = 0; // Tax inclusive in price
  const total = Math.max(0, subtotal - discount + shippingFee + tax);

  return {
    items: processedItems,
    subtotal,
    discount,
    couponCode: validCoupon,
    shippingFee,
    tax,
    total
  };
}
