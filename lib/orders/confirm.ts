import { after } from "next/server";
import { getDoc } from "@/lib/db/store";
import { createAuditLog } from "@/lib/db/audit";
import { sendTransactionalEmail } from "@/lib/email/service";
import { generateInvoiceForOrder } from "@/lib/db/invoices";
import { shiprocketCheckoutClient } from "@/lib/shiprocket-checkout/client";
import { completeCheckoutSession, findCheckoutSessionBySrOrder, type CheckoutSession } from "@/lib/orders/checkout-session";
import { createOrderFromCheckout, normalizeCheckoutWebhook, type NormalizedCheckoutOrder } from "@/lib/orders/service";
import { onOrderConfirmed } from "@/lib/shipping/provider";
import type { Order } from "@/lib/db/types";

export type ConfirmResult =
  | { status: "confirmed"; order: Order; created: boolean }
  | { status: "failed" }
  | { status: "pending"; reason: string };

/**
 * Stores a Shiprocket order exactly once (whichever of webhook / confirmation page gets here first),
 * marks the shopper's checkout session complete, and sends the invoice + e-mail for new orders.
 */
export async function confirmShiprocketOrder(n: NormalizedCheckoutOrder, eventId: string, raw: unknown, via: "webhook" | "lookup"): Promise<ConfirmResult> {
  const result = await createOrderFromCheckout(n, eventId, raw);
  if (result.status === "ignored") return n.outcome === "failed" ? { status: "failed" } : { status: "pending", reason: result.reason };

  const created = result.status === "created";
  const order = created ? result.order : result.orderId ? await getDoc<Order>("orders", result.orderId) : null;
  if (!order) return { status: "pending", reason: "order not stored yet" };

  const session = await findCheckoutSessionBySrOrder(n.externalOrderId);
  if (session && session.status !== "completed") await completeCheckoutSession(session, order.id, order.orderNumber);

  if (created) {
    // Best-effort follow-ups: an e-mail bounce must never fail (and re-trigger) the confirmation.
    await createAuditLog({
      userId: "shiprocket",
      userName: "Shiprocket Checkout",
      userRole: "system",
      action: via === "webhook" ? "ORDER_CREATED_FASTRR" : "ORDER_CREATED_FASTRR_LOOKUP",
      module: "orders",
      recordId: order.id,
      recordName: order.orderNumber,
      updatedData: { total: order.total, status: order.status, paymentMethod: order.paymentMethod },
      riskLevel: result.onHold ? "HIGH" : "LOW",
    }).catch((e) => console.error("Audit log failed:", e));
    await generateInvoiceForOrder(order).catch((e) => console.error("Invoice generation failed:", e));
    await sendTransactionalEmail(order.paymentStatus === "paid" ? "PAYMENT_SUCCESS" : "ORDER_CREATED", order).catch((e) => console.error("Order email failed:", e));
    // Send it to ShipMozo after the response, so Shiprocket's webhook / the shopper never wait on it.
    after(() => onOrderConfirmed(order));
  }
  return { status: "confirmed", order, created };
}

/** Reads an order from Shiprocket's API (authoritative) and normalises it. Null if Shiprocket doesn't know it. */
export async function lookupShiprocketOrder(srOrderId: string): Promise<{ n: NormalizedCheckoutOrder; raw: Record<string, any> } | null> {
  const raw = await shiprocketCheckoutClient.getOrderDetails(srOrderId);
  if (!raw) return null;
  const n = normalizeCheckoutWebhook({ ...raw, order_id: raw.order_id ?? srOrderId });
  return n ? { n, raw } : null;
}

/** Confirm an order we looked up ourselves. */
export function confirmLookedUpOrder(found: { n: NormalizedCheckoutOrder; raw: Record<string, any> }, via: "webhook" | "lookup" = "lookup"): Promise<ConfirmResult> {
  return confirmShiprocketOrder(found.n, `sr_lookup_${found.n.externalOrderId}`, found.raw, via);
}

/** Look the order up at Shiprocket and confirm it. */
export async function confirmByLookup(srOrderId: string, via: "webhook" | "lookup"): Promise<ConfirmResult> {
  const found = await lookupShiprocketOrder(srOrderId);
  return found ? confirmLookedUpOrder(found, via) : { status: "pending", reason: "Shiprocket does not know this order" };
}

/**
 * Whether a Shiprocket order is the one this browser checked out: every line must be a product the
 * session started checkout with, and the session must be recent. Used only when Shiprocket did not
 * return its order id with the checkout token, so we have to trust the id in the redirect URL.
 */
export function orderBelongsToSession(session: CheckoutSession, n: NormalizedCheckoutOrder): boolean {
  const ageMs = Date.now() - new Date(session.createdAt).getTime();
  if (!(ageMs >= 0 && ageMs < 12 * 60 * 60 * 1000)) return false;
  const started = new Set(session.items.map((i) => String(i.variantId)));
  return n.lines.length > 0 && n.lines.every((l) => l.variantId !== undefined && started.has(String(l.variantId)));
}
