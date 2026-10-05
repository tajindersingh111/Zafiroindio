import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyShiprocketTrackingWebhook } from "@/lib/shipping/shiprocket";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-shiprocket-signature") || request.headers.get("x-fastrr-signature");

    if (process.env.SHIPROCKET_TRACKING_WEBHOOK_SECRET) {
      const isValid = verifyShiprocketTrackingWebhook(rawBody, signature);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid tracking webhook signature." }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const orderNumber = payload.order_id || payload.orderNumber || payload.awb;
    const currentStatus = (payload.current_status || payload.status || "").toUpperCase();
    const eventId = payload.event_id || payload.scans?.[0]?.scan_id || `trkwb_${orderNumber}_${currentStatus}_${Date.now()}`;

    if (!orderNumber) {
      return NextResponse.json({ error: "Missing order_id or tracking identifier." }, { status: 400 });
    }

    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { eventId }
    });

    if (existingEvent) {
      return NextResponse.json({ success: true, message: "Duplicate webhook event ignored." });
    }

    let mappedStatus: "shipped" | "out_for_delivery" | "delivered" | "cancelled" | "processing" = "processing";
    if (currentStatus.includes("DELIVERED")) {
      mappedStatus = "delivered";
    } else if (currentStatus.includes("OUT FOR DELIVERY") || currentStatus.includes("OUT_FOR_DELIVERY")) {
      mappedStatus = "out_for_delivery";
    } else if (currentStatus.includes("IN TRANSIT") || currentStatus.includes("SHIPPED") || currentStatus.includes("DISPATCHED")) {
      mappedStatus = "shipped";
    } else if (currentStatus.includes("RTO") || currentStatus.includes("RETURN") || currentStatus.includes("CANCELED") || currentStatus.includes("CANCELLED")) {
      mappedStatus = "cancelled";
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ orderNumber: String(orderNumber) }, { id: String(orderNumber) }]
      }
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: mappedStatus }
      });
    }

    await prisma.webhookEvent.create({
      data: {
        provider: "shiprocket_tracking",
        eventId,
        eventType: currentStatus,
        payload
      }
    });

    return NextResponse.json({ success: true, mappedStatus });
  } catch (error: any) {
    console.error("Shiprocket tracking webhook error:", error);
    return NextResponse.json({ error: error?.message || "Webhook processing error" }, { status: 500 });
  }
}
