import { NextRequest, NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import type { Order, ShipmentRecord } from "@/lib/db/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || searchParams.get("awb") || searchParams.get("orderNumber") || "").trim();

  if (!q) {
    return NextResponse.json({ error: "Please provide a valid Order Number or AWB Tracking Number." }, { status: 400 });
  }

  const cleanQ = q.toLowerCase();
  const shipments = readCollection<ShipmentRecord>("shipments");
  const orders = readCollection<Order>("orders");

  // Search shipment by AWB or orderNumber or id
  const shipment = shipments.find(s =>
    s.trackingNumber.toLowerCase() === cleanQ ||
    s.orderNumber.toLowerCase() === cleanQ ||
    s.orderNumber.toLowerCase().replace("#", "") === cleanQ.replace("#", "") ||
    s.id.toLowerCase() === cleanQ
  );

  // Search order by orderNumber, id, phone, or email
  const order = orders.find(o =>
    o.orderNumber.toLowerCase() === cleanQ ||
    o.orderNumber.toLowerCase().replace("#", "") === cleanQ.replace("#", "") ||
    o.id.toLowerCase() === cleanQ ||
    (o.customerPhone && o.customerPhone.includes(cleanQ)) ||
    (o.trackingNumber && o.trackingNumber.toLowerCase() === cleanQ)
  );

  if (!shipment && !order) {
    return NextResponse.json({
      error: `No shipment or order found matching "${q}". Please double check your 10-digit mobile number, Order ID (e.g. ZI-10025) or AWB Tracking Number.`
    }, { status: 404 });
  }

  // Derive status step index
  const statusStr = (shipment?.status || order?.status || "processing").toUpperCase();
  let currentStep = 1;

  if (statusStr.includes("DELIVERED")) {
    currentStep = 5;
  } else if (statusStr.includes("OUT_FOR_DELIVERY") || statusStr.includes("OUT FOR DELIVERY")) {
    currentStep = 4;
  } else if (statusStr.includes("TRANSIT") || statusStr.includes("SHIPPED") || statusStr.includes("HUB")) {
    currentStep = 3;
  } else if (statusStr.includes("PICKED") || statusStr.includes("CREATED") || statusStr.includes("PAID") || statusStr.includes("PROCESSING")) {
    currentStep = 2;
  }

  const responseData = {
    found: true,
    query: q,
    shipment: shipment || {
      id: `shp-${order?.id}`,
      orderId: order?.id,
      orderNumber: order?.orderNumber,
      courierName: order?.courierName || "Delhivery Express",
      trackingNumber: order?.trackingNumber || `AWB${Math.floor(100000000 + Math.random() * 900000000)}`,
      trackingUrl: order?.trackingUrl || `https://track.zafiroindio.com/track?awb=${order?.trackingNumber}`,
      status: order?.status === "delivered" ? "DELIVERED" : order?.status === "shipped" ? "IN_TRANSIT" : "SHIPMENT_CREATED",
      shippedAt: order?.shippingDate || order?.createdAt,
      createdAt: order?.createdAt,
      updatedAt: order?.updatedAt
    },
    order: order ? {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerCity: order.shipping?.city || order.billing?.city || "Jaipur",
      orderDate: order.createdAt,
      total: order.total,
      paymentMethod: order.paymentMethod,
      itemsCount: order.items?.reduce((a, b) => a + b.quantity, 0) || 1,
      items: order.items?.map(i => ({ name: i.name, qty: i.quantity, price: i.price, image: i.image }))
    } : null,
    currentStep,
    estimatedDelivery: order?.estimatedDelivery || "3-5 Business Days"
  };

  return NextResponse.json(responseData);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const q = body.q || body.awb || body.orderNumber;
    return GET(new NextRequest(new URL(`/api/shipments/track?q=${encodeURIComponent(q || "")}`, request.url)));
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
