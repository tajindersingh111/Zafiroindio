import { getDoc } from "@/lib/db/store";
import { createDirectOrder } from "@/lib/orders/create";
import { fetchRazorpayOrderPayments, fetchRazorpayPayment, toPaise, type RazorpayPayment } from "@/lib/payments/razorpay";
import { updatePaymentSession, type PaymentSession } from "@/lib/checkout/session";
import type { Order } from "@/lib/db/types";

/**
 * Turns a confirmed Razorpay payment into an order — exactly once.
 *
 * Reached from two places: the browser handing back the Checkout handshake, and Razorpay's
 * webhook. Whichever arrives first stores the order; the other sees `duplicate`. That mirrors the
 * Shiprocket flow, which also had to tolerate two confirmation sources.
 *
 * Nothing here trusts the caller about money: the payment is always read back from Razorpay's API
 * and its amount checked against the frozen snapshot before an order exists.
 */

export type ConfirmResult =
  | { status: "confirmed"; order: Order; created: boolean }
  | { status: "failed"; reason: string }
  | { status: "pending"; reason: string };

/** Razorpay states that mean the money is ours. `authorized` is included because we auto-capture. */
const PAID_STATES = new Set(["captured", "authorized"]);

export async function confirmRazorpayPayment(
  session: PaymentSession,
  paymentId: string,
  via: "handshake" | "webhook",
  /** The webhook's own payment entity, so we don't re-read what Razorpay just signed for us. */
  known?: RazorpayPayment
): Promise<ConfirmResult> {
  // Already finished: return the stored order rather than doing anything twice.
  if (session.orderId) {
    const order = await getDoc<Order>("orders", session.orderId);
    if (order) return { status: "confirmed", order, created: false };
  }

  let payment: RazorpayPayment;
  try {
    // The webhook body is signed, but a re-read is still cheap insurance against a replayed or
    // stale entity, so only trust `known` when it is already in a settled paid state.
    payment = known && PAID_STATES.has(known.status) ? known : await fetchRazorpayPayment(paymentId);
  } catch (e) {
    console.error(`[checkout] could not read payment ${paymentId} (${via}):`, (e as Error).message);
    return { status: "pending", reason: "Could not reach the payment provider." };
  }

  if (session.razorpayOrderId && payment.order_id !== session.razorpayOrderId) {
    // A payment for a different checkout must never confirm this one.
    console.error(`[checkout] payment ${paymentId} belongs to order ${payment.order_id}, not ${session.razorpayOrderId}`);
    return { status: "failed", reason: "This payment does not belong to this checkout." };
  }

  if (payment.status === "failed") {
    if (session.status === "pending") await updatePaymentSession(session, { status: "failed", razorpayPaymentId: payment.id });
    return { status: "failed", reason: payment.error_description || "The payment did not go through." };
  }

  if (!PAID_STATES.has(payment.status)) {
    return { status: "pending", reason: `Payment is ${payment.status}.` };
  }

  // The amount must match what the shopper agreed to. A short payment is never accepted.
  const expected = toPaise(session.snapshot.total);
  if (payment.amount < expected) {
    console.error(`[checkout] amount mismatch for ${paymentId}: paid ${payment.amount} expected ${expected}`);
    return { status: "failed", reason: "The amount paid does not match this order." };
  }

  const result = await createDirectOrder({
    // The Razorpay order id is one per checkout, so it is the natural idempotency key.
    paymentKey: session.razorpayOrderId || `rzp_${payment.id}`,
    snapshot: session.snapshot,
    customer: {
      name: session.customer.name,
      email: session.customer.email,
      phone: session.customer.phone,
      customerId: session.customerId,
    },
    shipping: session.shipping,
    billing: session.billing,
    paymentMethod: "razorpay",
    paymentStatus: "paid",
    transactionId: payment.id,
    razorpayOrderId: payment.order_id,
    razorpayPaymentId: payment.id,
  });

  const order = result.status === "created" ? result.order : result.order;
  if (!order) return { status: "pending", reason: "Order not stored yet." };

  if (session.status !== "completed") {
    await updatePaymentSession(session, {
      status: "completed",
      razorpayPaymentId: payment.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
    });
  }

  return { status: "confirmed", order, created: result.status === "created" };
}

/**
 * Asks Razorpay directly whether this checkout was paid, and confirms it if so.
 *
 * The self-healing path for the confirmation page: it covers the shopper who paid and then lost
 * the tab before the handshake, when the webhook is also late or not configured at all.
 */
export async function confirmByRazorpayLookup(session: PaymentSession): Promise<ConfirmResult> {
  if (session.orderId) {
    const order = await getDoc<Order>("orders", session.orderId);
    if (order) return { status: "confirmed", order, created: false };
  }
  if (!session.razorpayOrderId) return { status: "pending", reason: "No payment started." };

  let payments: RazorpayPayment[];
  try {
    payments = await fetchRazorpayOrderPayments(session.razorpayOrderId);
  } catch (e) {
    console.error(`[checkout] could not list payments for ${session.razorpayOrderId}:`, (e as Error).message);
    return { status: "pending", reason: "Could not reach the payment provider." };
  }

  const paid = payments.find((p) => PAID_STATES.has(p.status));
  if (paid) return confirmRazorpayPayment(session, paid.id, "handshake", paid);

  // Nothing succeeded. Only call it failed when every attempt failed, so a payment still being
  // processed (an in-flight UPI collect request) keeps the page waiting instead of showing an error.
  if (payments.length > 0 && payments.every((p) => p.status === "failed")) {
    return { status: "failed", reason: payments[0].error_description || "The payment did not go through." };
  }
  return { status: "pending", reason: "Waiting for the payment to be confirmed." };
}
