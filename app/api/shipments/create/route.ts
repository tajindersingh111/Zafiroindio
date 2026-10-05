import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { createShipmentForOrder } from "@/lib/shipping/provider";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  try {
    const adminSession = await getAdminSession(request);
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const result = await createShipmentForOrder({ orderId: order.id });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create shipment in Shiprocket." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/shipments/create error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error." }, { status: 500 });
  }
}
