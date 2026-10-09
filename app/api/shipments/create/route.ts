import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createShipmentForOrder } from "@/lib/shipping/provider";
import { createAuditLog } from "@/lib/db/audit";

export const dynamic = "force-dynamic";

/** Admin: book a ShipMozo courier for an order (optionally a specific courier from /api/shipments/rates). */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "orders");
  if (auth.error) return auth.error;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  if (!orderId) return NextResponse.json({ error: "orderId is required." }, { status: 400 });
  const courierId = body?.courierId !== undefined && body?.courierId !== null && body?.courierId !== "" ? String(body.courierId) : undefined;
  const parcel = { weightKg: Number(body?.weightKg) || undefined, l: Number(body?.l) || undefined, w: Number(body?.w) || undefined, h: Number(body?.h) || undefined };

  const result = await createShipmentForOrder({
    orderId,
    courierId,
    parcel,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin,
  });
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 502 });

  await createAuditLog({
    userId: auth.session.userId,
    userName: auth.session.name,
    userRole: auth.session.role,
    action: "create_shipment",
    module: "orders",
    recordId: orderId,
    updatedData: { awb: result.awb, courier: result.courierName, courierId },
  }).catch(() => {});
  return NextResponse.json({
    success: true,
    shipment: { trackingNumber: result.awb, courierName: result.courierName, labelUrl: result.labelUrl, pickupScheduled: result.pickupScheduled, pickupMessage: result.pickupMessage },
  });
}
