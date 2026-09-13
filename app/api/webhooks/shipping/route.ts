import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Order, ShipmentRecord, OrderStatus } from "@/lib/db/types";
import { sendTransactionalEmail } from "@/lib/email/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { trackingNumber, orderNumber, status: incomingStatus } = body;

    const tracking = trackingNumber || body.awb;
    if (!tracking && !orderNumber) {
      return NextResponse.json({ error: "Missing tracking number or order number." }, { status: 400 });
    }

    const shipments = readCollection<ShipmentRecord>("shipments");
    const shipmentIdx = shipments.findIndex(s => s.trackingNumber === tracking || s.orderNumber === orderNumber);

    if (shipmentIdx < 0) {
      return NextResponse.json({ error: "Associated shipment record not found." }, { status: 404 });
    }

    const shipment = shipments[shipmentIdx];
    const now = new Date().toISOString();

    // Map external status to internal status
    let internalStatus: ShipmentRecord["status"] = "IN_TRANSIT";
    let orderStatus: OrderStatus = "shipped";

    const normalized = (incomingStatus || "").toUpperCase();
    if (normalized.includes("PICK") || normalized === "PICKED_UP") {
      internalStatus = "PICKED_UP";
      orderStatus = "shipped";
    } else if (normalized.includes("OUT_FOR_DELIVERY") || normalized.includes("OUT FOR DELIVERY")) {
      internalStatus = "OUT_FOR_DELIVERY";
      orderStatus = "out_for_delivery";
    } else if (normalized.includes("DELIVER") || normalized === "DELIVERED") {
      internalStatus = "DELIVERED";
      orderStatus = "delivered";
      shipment.deliveredAt = now;
    } else if (normalized.includes("CANCEL")) {
      internalStatus = "CANCELLED";
      orderStatus = "cancelled";
    }

    shipment.status = internalStatus;
    shipment.updatedAt = now;
    shipments[shipmentIdx] = shipment;
    writeCollection("shipments", shipments);

    // Update order status
    const orders = readCollection<Order>("orders");
    const orderIdx = orders.findIndex(o => o.id === shipment.orderId || o.orderNumber === shipment.orderNumber);

    if (orderIdx >= 0) {
      const order = orders[orderIdx];
      order.status = orderStatus;
      if (orderStatus === "delivered") {
        order.deliveredDate = now;
      }
      order.updatedAt = now;
      orders[orderIdx] = order;
      writeCollection("orders", orders);

      // Trigger notification email
      if (orderStatus === "out_for_delivery") {
        await sendTransactionalEmail("OUT_FOR_DELIVERY", order);
      } else if (orderStatus === "delivered") {
        await sendTransactionalEmail("ORDER_DELIVERED", order);
      }
    }

    return NextResponse.json({ success: true, status: internalStatus });
  } catch (error) {
    return NextResponse.json({ error: "Shipping webhook failed." }, { status: 500 });
  }
}
