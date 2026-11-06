import crypto from "node:crypto";
import { getDoc, upsertDoc } from "@/lib/db/store";
import type { Address, OrderItem, PaymentMethod } from "@/lib/db/types";

/**
 * A pending online payment.
 *
 * The store creates no order until Razorpay confirms the money, which is how the Shiprocket flow
 * already worked (see app/api/orders/cleanup-stale: "orders are only created after payment
 * succeeds"). Everything needed to build the order is therefore frozen here first: the priced
 * lines, the totals and the address.
 *
 * Freezing the totals also means a catalogue price change between "pay" and "paid" cannot make the
 * stored order disagree with what the shopper was actually charged.
 *
 * `id` is 192 bits of randomness known only to the browser that started the checkout, so it also
 * serves as the capability to view the confirmation page afterwards.
 */

export interface CheckoutSnapshot {
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  couponId?: string;
  shippingCost: number;
  codFee: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
}

export interface PaymentSession {
  id: string; // = ref
  status: "pending" | "paid" | "failed" | "completed";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  customer: { name: string; email: string; phone: string };
  shipping: Address;
  billing: Address;
  snapshot: CheckoutSnapshot;
  /** "cart" empties the cart on the confirmation page; "buy-now" leaves it alone. */
  source: "cart" | "buy-now";
  createdAt: string;
  updatedAt: string;
}

const COLLECTION = "payment-sessions";
const BY_RAZORPAY_ORDER = "payment-sessions-by-rzp";

export function newCheckoutRef(): string {
  return crypto.randomBytes(24).toString("hex");
}

function isRef(ref: string): boolean {
  return /^[a-f0-9]{48}$/.test(ref);
}

export async function createPaymentSession(
  session: Omit<PaymentSession, "createdAt" | "updatedAt" | "status"> & { status?: PaymentSession["status"] }
): Promise<PaymentSession> {
  const now = new Date().toISOString();
  const record: PaymentSession = { status: "pending", ...session, createdAt: now, updatedAt: now };
  await upsertDoc(COLLECTION, record);
  if (record.razorpayOrderId) {
    await upsertDoc(BY_RAZORPAY_ORDER, { id: record.razorpayOrderId, ref: record.id });
  }
  return record;
}

export async function getPaymentSession(ref: string): Promise<PaymentSession | null> {
  if (!isRef(ref)) return null;
  return getDoc<PaymentSession>(COLLECTION, ref);
}

/** The session a Razorpay order belongs to — how the webhook finds the checkout. */
export async function findPaymentSessionByRazorpayOrder(razorpayOrderId: string): Promise<PaymentSession | null> {
  const link = await getDoc<{ id: string; ref: string }>(BY_RAZORPAY_ORDER, razorpayOrderId);
  return link ? getPaymentSession(link.ref) : null;
}

export async function updatePaymentSession(session: PaymentSession, patch: Partial<PaymentSession>): Promise<PaymentSession> {
  const updated: PaymentSession = { ...session, ...patch, updatedAt: new Date().toISOString() };
  await upsertDoc(COLLECTION, updated);
  return updated;
}
