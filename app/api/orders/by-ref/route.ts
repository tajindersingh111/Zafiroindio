import { NextRequest, NextResponse } from "next/server";
import { getCheckoutSession } from "@/lib/orders/checkout-session";
import { getDoc } from "@/lib/db/store";
import { publicOrderView } from "@/lib/orders/contact";
import { rateLimit } from "@/lib/security/rate-limit";
import type { Order } from "@/lib/db/types";

export const dynamic = "force-dynamic";

/**
 * Order confirmation for the browser that started the checkout. The unguessable `ref` (192-bit,
 * issued by /api/checkout/shiprocket/token) is the credential - no login needed.
 */
export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "order-by-ref", { windowMs: 60_000, maxRequests: 60 });
  if (limited) return limited;

  const ref = request.nextUrl.searchParams.get("ref") || "";
  const session = await getCheckoutSession(ref);
  if (!session) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  if (session.status !== "completed" || !session.orderId) {
    // Webhook may still be on its way - the page polls until it lands.
    return NextResponse.json({ status: "pending" });
  }

  const order = await getDoc<Order>("orders", session.orderId);
  if (!order) return NextResponse.json({ status: "pending" });

  return NextResponse.json({
    status: "ready",
    order: publicOrderView(order),
    invoiceUrl: `/api/invoices/${encodeURIComponent(order.orderNumber)}/download?ref=${ref}`,
  });
}
