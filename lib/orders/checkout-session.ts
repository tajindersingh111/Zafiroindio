import crypto from "node:crypto";
import { getDoc, upsertDoc } from "@/lib/db/store";

/**
 * A checkout session ties the browser that started a Shiprocket checkout to the order that the
 * webhook later creates. `ref` is 192 bits of randomness known only to that browser, so it can be
 * used as a capability to view the order confirmation / download the invoice without a login.
 */
export interface CheckoutSession {
  id: string; // = ref
  srOrderId?: string;
  status: "pending" | "completed";
  orderId?: string;
  orderNumber?: string;
  items: { productId: string; variationId?: string; variantId: string; quantity: number }[];
  createdAt: string;
}

export function newCheckoutRef(): string {
  return crypto.randomBytes(24).toString("hex");
}

export async function createCheckoutSession(ref: string, items: CheckoutSession["items"]): Promise<CheckoutSession> {
  const session: CheckoutSession = { id: ref, status: "pending", items, createdAt: new Date().toISOString() };
  await upsertDoc("checkout-sessions", session);
  return session;
}

export async function linkShiprocketOrder(ref: string, srOrderId: string): Promise<void> {
  const session = await getDoc<CheckoutSession>("checkout-sessions", ref);
  if (!session) return;
  await upsertDoc("checkout-sessions", { ...session, srOrderId });
  await upsertDoc("checkout-sessions-by-sr", { id: srOrderId, ref });
}

export async function getCheckoutSession(ref: string): Promise<CheckoutSession | null> {
  if (!/^[a-f0-9]{48}$/.test(ref)) return null;
  return getDoc<CheckoutSession>("checkout-sessions", ref);
}

export async function findCheckoutSessionBySrOrder(srOrderId: string): Promise<CheckoutSession | null> {
  const link = await getDoc<{ id: string; ref: string }>("checkout-sessions-by-sr", srOrderId);
  return link ? getCheckoutSession(link.ref) : null;
}

export async function completeCheckoutSession(session: CheckoutSession, orderId: string, orderNumber: string): Promise<void> {
  await upsertDoc("checkout-sessions", { ...session, status: "completed" as const, orderId, orderNumber });
}
