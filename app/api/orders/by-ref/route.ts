import { NextRequest, NextResponse } from "next/server";
import { getCheckoutSession, linkShiprocketOrder } from "@/lib/orders/checkout-session";
import { confirmLookedUpOrder, lookupShiprocketOrder, orderBelongsToSession } from "@/lib/orders/confirm";
import { isCheckoutConfigured } from "@/lib/shiprocket-checkout/client";
import { getDoc } from "@/lib/db/store";
import { publicOrderView } from "@/lib/orders/contact";
import { rateLimit } from "@/lib/security/rate-limit";
import type { Order } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
/** The confirmation page polls every few seconds; look the order up at Shiprocket at most this often. */
const LOOKUP_EVERY_MS = 4_000;
const lastLookup = new Map<string, number>();

function ready(order: Order, ref: string) {
  return NextResponse.json(
    { status: "ready", order: publicOrderView(order), invoiceUrl: `/api/invoices/${encodeURIComponent(order.orderNumber)}/download?ref=${ref}` },
    { headers: NO_STORE }
  );
}

/**
 * Order confirmation for the browser that started the checkout. The unguessable `ref` (192-bit,
 * issued by /api/checkout/shiprocket/token) is the credential - no login needed.
 *
 * Shiprocket redirects here with `oid` (its order id) and `ost` (SUCCESS/FAILED). We never trust
 * those values directly: the order is confirmed from Shiprocket's own API, so the page shows the
 * order even if the webhook is late or never arrives.
 */
export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "order-by-ref", { windowMs: 60_000, maxRequests: 300, store: "memory" });
  if (limited) return limited;

  const sp = request.nextUrl.searchParams;
  const ref = sp.get("ref") || "";
  const oid = (sp.get("oid") || "").trim().slice(0, 80);
  const session = await getCheckoutSession(ref);
  if (!session) return NextResponse.json({ error: "Order not found." }, { status: 404, headers: NO_STORE });

  if (session.status === "completed" && session.orderId) {
    const order = await getDoc<Order>("orders", session.orderId);
    if (order) return ready(order, ref);
  }

  const srOrderId = session.srOrderId || oid;
  const now = Date.now();
  if (srOrderId && isCheckoutConfigured() && now - (lastLookup.get(ref) ?? 0) >= LOOKUP_EVERY_MS) {
    lastLookup.set(ref, now);
    if (lastLookup.size > 10_000) lastLookup.clear();
    try {
      const found = await lookupShiprocketOrder(srOrderId);
      if (found) {
        // Without an id from the token call, accept the redirect's id only if it is this cart's order.
        const trusted = !!session.srOrderId || orderBelongsToSession(session, found.n);
        if (trusted) {
          if (found.n.outcome === "failed") return NextResponse.json({ status: "failed" }, { headers: NO_STORE });
          if (!session.srOrderId) await linkShiprocketOrder(ref, srOrderId);
          const result = await confirmLookedUpOrder(found);
          if (result.status === "confirmed") return ready(result.order, ref);
        }
      }
    } catch (e) {
      console.error("[order-by-ref] Shiprocket lookup failed:", e);
    }
  }

  // Webhook / payment may still be on its way - the page keeps polling.
  return NextResponse.json({ status: "pending" }, { headers: NO_STORE });
}
