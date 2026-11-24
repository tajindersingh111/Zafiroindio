import crypto from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { getDoc, listDocs, upsertDoc } from "@/lib/db/store";
import { normalizeEmail, normalizePhone } from "@/lib/orders/contact";
import type { Order } from "@/lib/db/types";
import type { PaymentSession } from "@/lib/checkout/session";

/**
 * Abandoned carts.
 *
 * A shopper's cart lives in their own browser (localStorage), so it never reaches us — which is why
 * this list used to be permanently empty. We can only record a cart once the shopper has told us who
 * they are, and there are exactly two such moments:
 *
 *  1. the checkout form — as soon as a valid mobile number is typed (`recordAbandonedCart`), and
 *  2. a payment that was started and never completed (`syncAbandonedFromPaymentSessions`).
 *
 * One row per contact, keyed by a hash of the phone number (or e-mail when there is no phone), so a
 * shopper who comes back and abandons again updates their row instead of adding another one.
 */

export const ABANDONED_CARTS = "abandoned-carts";

/** Payment sessions younger than this may simply still be on the Razorpay screen. */
const SETTLE_MINUTES = 30;

export interface AbandonedCartProduct {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export type AbandonedCartStatus = "abandoned" | "reminder_sent" | "recovered" | "expired";

export interface AbandonedCart {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  products: AbandonedCartProduct[];
  cartValue: number;
  status: AbandonedCartStatus;
  reminderSent: boolean;
  reminderCount: number;
  lastReminderAt?: string;
  recoveredOrderId?: string;
  recoveredOrderNumber?: string;
  recoveredAt?: string;
  /** How far the shopper got — a started payment is a much warmer lead than a half-filled form. */
  source: "checkout_form" | "payment_abandoned" | "payment_failed";
  createdAt: string;
  updatedAt: string;
}

/** Stable per-shopper id: the same person abandoning twice keeps one row. */
export function abandonedCartId(phone: string, email: string): string | null {
  const basis = normalizePhone(phone) || normalizeEmail(email);
  if (!basis) return null;
  return `cart-${crypto.createHash("sha256").update(basis).digest("hex").slice(0, 20)}`;
}

export interface RecordAbandonedCartInput {
  name: string;
  email: string;
  phone: string;
  products: AbandonedCartProduct[];
  cartValue: number;
  source: AbandonedCart["source"];
}

/**
 * Saves (or refreshes) one shopper's abandoned cart.
 *
 * A row already marked `recovered` is reopened: they bought once and have now left a new cart
 * behind, which is a live lead again. A reminder we already sent is kept, so the admin can see it
 * went out — but the counter lets a second reminder be sent for the newer cart.
 */
export async function recordAbandonedCart(input: RecordAbandonedCartInput): Promise<AbandonedCart | null> {
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  const id = abandonedCartId(phone, email);
  if (!id || !input.products.length) return null;

  const now = new Date().toISOString();
  const existing = await getDoc<AbandonedCart>(ABANDONED_CARTS, id);
  const reopened = existing?.status === "recovered" || existing?.status === "expired";

  const cart: AbandonedCart = {
    id,
    customerName: input.name.trim() || existing?.customerName || "Guest",
    customerEmail: email || existing?.customerEmail || "",
    customerPhone: phone || existing?.customerPhone || "",
    products: input.products,
    cartValue: input.cartValue,
    status: reopened ? "abandoned" : existing?.status ?? "abandoned",
    reminderSent: reopened ? false : existing?.reminderSent ?? false,
    reminderCount: existing?.reminderCount ?? 0,
    lastReminderAt: existing?.lastReminderAt,
    // Previous recovery stays on the record as history; the cart itself is live again.
    recoveredOrderId: reopened ? undefined : existing?.recoveredOrderId,
    recoveredOrderNumber: reopened ? undefined : existing?.recoveredOrderNumber,
    recoveredAt: reopened ? undefined : existing?.recoveredAt,
    // Never downgrade: someone who reached the payment screen stays the warmer lead.
    source: existing && existing.source !== "checkout_form" && input.source === "checkout_form" ? existing.source : input.source,
    createdAt: reopened || !existing ? now : existing.createdAt,
    updatedAt: now,
  };

  await upsertDoc<AbandonedCart>(ABANDONED_CARTS, cart);
  return cart;
}

/**
 * Turns payments that were started and never completed into abandoned carts.
 *
 * These are the warmest leads in the shop: the shopper filled in a full address and opened the
 * payment screen. The session rows are pruned by the housekeeping cron, so this runs before that
 * prune (and whenever the admin list is opened) to keep the lead after the session is gone.
 */
export async function syncAbandonedFromPaymentSessions(limit = 200): Promise<number> {
  const cutoff = new Date(Date.now() - SETTLE_MINUTES * 60_000).toISOString();
  const rows = await prisma.$queryRaw<{ data: PaymentSession }[]>`
    SELECT data FROM documents
    WHERE collection = 'payment-sessions'
      AND data->>'status' IN ('pending', 'failed')
      AND coalesce(data->>'orderId', '') = ''
      AND data->>'createdAt' < ${cutoff}
    ORDER BY data->>'createdAt' DESC
    LIMIT ${limit}`;

  let saved = 0;
  for (const { data: s } of rows) {
    const products: AbandonedCartProduct[] = (s.snapshot?.items ?? []).map((i) => ({
      productId: i.productId,
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      image: i.image,
    }));
    if (!products.length) continue;
    const r = await recordAbandonedCart({
      name: s.customer?.name ?? "",
      email: s.customer?.email ?? "",
      phone: s.customer?.phone ?? "",
      products,
      cartValue: s.snapshot?.total ?? 0,
      source: s.status === "failed" ? "payment_failed" : "payment_abandoned",
    }).catch((e) => {
      console.error("[abandoned] could not record session", s.id, e);
      return null;
    });
    if (r) saved++;
  }
  return saved;
}

/**
 * An order came through: close the matching cart(s).
 *
 * Both the phone and the e-mail are checked, because a cart recorded from a form with no e-mail is
 * keyed on the phone while one recorded from an e-mail-only contact is keyed on the address.
 */
export async function markCartsRecovered(order: Order): Promise<void> {
  const now = new Date().toISOString();
  const ids = new Set(
    [abandonedCartId(order.customerPhone ?? "", ""), abandonedCartId("", order.customerEmail ?? "")].filter(
      (v): v is string => !!v
    )
  );
  for (const id of ids) {
    const cart = await getDoc<AbandonedCart>(ABANDONED_CARTS, id);
    if (!cart || cart.status === "recovered") continue;
    await upsertDoc<AbandonedCart>(ABANDONED_CARTS, {
      ...cart,
      status: "recovered",
      recoveredOrderId: order.id,
      recoveredOrderNumber: order.orderNumber,
      recoveredAt: now,
      updatedAt: now,
    });
  }
}

/** Housekeeping: carts nobody recovered go stale; keep the row (for the stats) but stop chasing it. */
export async function expireStaleCarts(days = 30): Promise<number> {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const carts = await listDocs<AbandonedCart>(ABANDONED_CARTS, 1000);
  let expired = 0;
  for (const cart of carts) {
    if (cart.status === "recovered" || cart.status === "expired") continue;
    if (cart.updatedAt >= cutoff) continue;
    await upsertDoc<AbandonedCart>(ABANDONED_CARTS, { ...cart, status: "expired", updatedAt: new Date().toISOString() });
    expired++;
  }
  return expired;
}

export async function listAbandonedCarts(limit = 500): Promise<AbandonedCart[]> {
  const carts = await listDocs<AbandonedCart>(ABANDONED_CARTS, limit);
  // Newest first, whatever order the store returns them in.
  return carts.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}
