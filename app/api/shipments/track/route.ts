import { NextRequest, NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
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

  const orders = await readCollection<Order>("orders");
  const order = orders.find(
    (o) => o.orderNumber.toLowerCase().replace(/^#/, "") === cleanQ || (o.trackingNumber && o.trackingNumber.toLowerCase() === cleanQ)
  );
  // Same message whether the order is missing or the contact is wrong: no enumeration.
  const miss = NextResponse.json({ error: "Koi order nahi mila. Order number aur phone/email check karein." }, { status: 404 });
  if (!order || !orderMatchesContact(order, contact)) return miss;

  const shipments = await readCollection<ShipmentRecord>("shipments");
  const shipment = shipments.find((s) => s.orderId === order.id);
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
