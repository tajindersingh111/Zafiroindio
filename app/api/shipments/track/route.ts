import { NextRequest, NextResponse } from "next/server";
import { findOneByField, getDoc } from "@/lib/db/store";
import { prisma } from "@/lib/db/prisma";
import { syncOrderTracking } from "@/lib/shipping/provider";
import { orderMatchesContact } from "@/lib/orders/contact";
import { rateLimit } from "@/lib/security/rate-limit";
import type { Order, ShipmentRecord } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const STEP: Array<[RegExp, number]> = [
  [/DELIVERED/, 5],
  [/OUT[_ ]FOR[_ ]DELIVERY/, 4],
  [/TRANSIT|SHIPPED|HUB/, 3],
  [/PICKED|CREATED|PAID|PROCESSING/, 2],
];

async function lookup(request: NextRequest, q: string, contact: string) {
  const limited = await rateLimit(request, "track", { windowMs: 60_000, maxRequests: 20 });
  if (limited) return limited;

  const cleanQ = q.trim().toLowerCase().replace(/^#/, "");
  if (!cleanQ || !contact.trim()) {
    return NextResponse.json({ error: "Order number aur registered phone ya email dono zaroori hain." }, { status: 400 });
  }

  const rows = await prisma.$queryRaw<{ data: Order }[]>`
    SELECT data FROM documents
    WHERE collection = 'orders'
      AND (lower(ltrim(data->>'orderNumber', '#')) = ${cleanQ} OR lower(data->>'trackingNumber') = ${cleanQ})
    LIMIT 1`;
  let order = rows[0]?.data;
  // Same message whether the order is missing or the contact is wrong: no enumeration.
  const miss = NextResponse.json({ error: "Koi order nahi mila. Order number aur phone/email check karein." }, { status: 404 });
  if (!order || !orderMatchesContact(order, contact)) return miss;

  // Courier status older than 15 minutes: refresh it from ShipMozo (bounded, never blocks the answer for long).
  const lastSync = order.shipmozo?.lastSyncAt ? new Date(order.shipmozo.lastSyncAt).getTime() : 0;
  if (order.shipmozo && ["paid", "processing", "shipped", "out_for_delivery"].includes(order.status) && Date.now() - lastSync > 15 * 60_000) {
    await Promise.race([syncOrderTracking(order).catch(() => null), new Promise((r) => setTimeout(r, 6000))]);
    order = (await getDoc<Order>("orders", order.id)) ?? order;
  }

  const shipment = (await getDoc<ShipmentRecord>("shipments", `shp-${order.id}`)) ?? (await findOneByField<ShipmentRecord>("shipments", "orderId", order.id));
  const statusStr = String(shipment?.status || order.status || "processing").toUpperCase();
  const currentStep = STEP.find(([re]) => re.test(statusStr))?.[1] ?? 1;

  return NextResponse.json({
    found: true,
    currentStep,
    shipment: shipment
      ? {
          courierName: shipment.courierName,
          trackingNumber: shipment.trackingNumber,
          trackingUrl: shipment.trackingUrl,
          status: shipment.status,
          shippedAt: shipment.shippedAt,
          deliveredAt: shipment.deliveredAt,
          events: (shipment.events || []).slice(0, 15),
        }
      : order.trackingNumber
        ? { courierName: order.courierName, trackingNumber: order.trackingNumber, trackingUrl: order.trackingUrl, status: statusStr }
        : null,
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      customerFirstName: (order.customerName || "").split(" ")[0],
      customerCity: order.shipping?.city || "",
      orderDate: order.createdAt,
      total: order.total,
      paymentMethod: order.paymentMethod,
      itemsCount: (order.items || []).reduce((a, b) => a + b.quantity, 0),
      items: (order.items || []).map((i) => ({ name: i.name, qty: i.quantity, price: i.price, image: i.image })),
    },
    estimatedDelivery: order.estimatedDelivery || null,
  });
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  return lookup(request, sp.get("q") || sp.get("orderNumber") || sp.get("awb") || "", sp.get("contact") || "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return lookup(request, String(body.q || body.orderNumber || body.awb || ""), String(body.contact || body.phone || body.email || ""));
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
