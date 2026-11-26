/**
 * Pushes an ecommerce event onto GTM's dataLayer, for the Meta Pixel (and GA4 enhanced ecommerce,
 * should anyone wire that too) tags configured in Google Tag Manager.
 *
 * Nothing calls the Meta Pixel directly: GTM owns every marketing tag so events can be added or
 * changed from its dashboard without another code deploy, the same reasoning GA4's own comment in
 * app/layout.tsx gives for not duplicating tags between the two.
 */

type Money = number | undefined;

interface Line {
  id: string; // SKU or slug: a stable id Meta can match to the product catalogue
  name: string;
  price: Money;
  quantity: number;
}

const CURRENCY = "INR";

function push(event: string, data: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  (window as unknown as { dataLayer?: unknown[] }).dataLayer = (window as unknown as { dataLayer?: unknown[] }).dataLayer || [];
  (window as unknown as { dataLayer: unknown[] }).dataLayer.push({ event, ...data });
  // The Meta Pixel is loaded directly in app/layout.tsx (the GTM container has no Meta tag).
  const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
  if (fbq) {
    const eventID = typeof data.order_id === "string" ? `purchase-${data.order_id}` : undefined;
    fbq("track", event, data, eventID ? { eventID } : undefined);
  }
}

/** A shopper opened a product page. */
export function trackViewContent(line: Line) {
  push("ViewContent", {
    content_ids: [line.id],
    content_name: line.name,
    content_type: "product",
    value: line.price,
    currency: CURRENCY,
  });
}

/** A shopper added one line to the cart (fired once per Add to Cart click, not per unit). */
export function trackAddToCart(line: Line) {
  push("AddToCart", {
    content_ids: [line.id],
    content_name: line.name,
    content_type: "product",
    value: (line.price || 0) * line.quantity,
    currency: CURRENCY,
    num_items: line.quantity,
  });
}

/** A shopper pressed "Secure Checkout" (cart or buy-it-now) and is headed to /checkout. */
export function trackInitiateCheckout(lines: Line[], total: Money) {
  push("InitiateCheckout", {
    content_ids: lines.map((l) => l.id),
    contents: lines.map((l) => ({ id: l.id, quantity: l.quantity })),
    content_type: "product",
    value: total,
    currency: CURRENCY,
    num_items: lines.reduce((n, l) => n + l.quantity, 0),
  });
}

/** An order was confirmed. Fire exactly once per order — the caller is responsible for that. */
export function trackPurchase(orderId: string, lines: Line[], total: Money) {
  push("Purchase", {
    content_ids: lines.map((l) => l.id),
    contents: lines.map((l) => ({ id: l.id, quantity: l.quantity })),
    content_type: "product",
    value: total,
    currency: CURRENCY,
    num_items: lines.reduce((n, l) => n + l.quantity, 0),
    order_id: orderId,
  });
}
