import { NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import type { Order } from "@/lib/db/types";
import { createShipmentForOrder } from "@/lib/shipping/provider";
import { sendTransactionalEmail } from "@/lib/email/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, courierName, weightKg, dimensionsCm } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required." }, { status: 400 });
    }

    const orders = readCollection<Order>("orders");
    const order = orders.find(o => o.id === orderId || o.orderNumber === orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const shipment = await createShipmentForOrder({
      order,
      courierName: courierName || "Delhivery Express",
      weightKg: weightKg || 1.2,
      dimensionsCm: dimensionsCm || "30x20x10"
    });

    // Send shipment tracking email
    await sendTransactionalEmail("ORDER_SHIPPED", order, {
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl
    });

    return NextResponse.json({ success: true, shipment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create shipment." }, { status: 500 });
  }
}
