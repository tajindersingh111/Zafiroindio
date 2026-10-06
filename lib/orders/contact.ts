import type { Order } from "@/lib/db/types";

export function normalizePhone(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "").slice(-10);
}

export function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * Proves the caller knows the contact the order was placed with (phone or e-mail).
 * Used for public order actions (track / cancel / return) so an order number alone is never enough.
 */
export function orderMatchesContact(order: Order, contact: unknown): boolean {
  const raw = String(contact ?? "").trim();
  if (!raw) return false;
  if (raw.includes("@")) {
    const email = normalizeEmail(raw);
    return [order.customerEmail, order.shipping?.email, order.billing?.email].some((e) => e && normalizeEmail(e) === email);
  }
  const phone = normalizePhone(raw);
  if (phone.length < 10) return false;
  return [order.customerPhone, order.shipping?.phone, order.billing?.phone].some((p) => p && normalizePhone(p) === phone);
}

/** Public-safe view of an order (no e-mail, phone or street address). */
export function publicOrderView(order: Order) {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    total: order.total,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    discount: order.discount,
    customerFirstName: (order.customerName || "").split(" ")[0] || "Customer",
    city: order.shipping?.city || "",
    state: order.shipping?.state || "",
    trackingNumber: order.trackingNumber,
    courierName: order.courierName,
    trackingUrl: order.trackingUrl,
    estimatedDelivery: order.estimatedDelivery,
    items: (order.items || []).map((i) => ({ name: i.name, quantity: i.quantity, price: i.price, image: i.image, attributes: i.attributes })),
  };
}
