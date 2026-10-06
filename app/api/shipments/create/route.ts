import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createShipmentForOrder } from "@/lib/shipping/provider";
import { createAuditLog } from "@/lib/db/audit";

export const dynamic = "force-dynamic";

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

  const result = await createShipmentForOrder({ orderId });
  if (!result.success) {
    return NextResponse.json({ error: result.error || "Failed to create shipment." }, { status: 502 });
  }
  await createAuditLog({
    userId: auth.session.userId,
    userName: auth.session.name,
    userRole: auth.session.role,
    action: "create_shipment",
    module: "orders",
    recordId: orderId,
    updatedData: { awb: result.awb, shipmentId: result.shipmentId },
  }).catch(() => {});
  return NextResponse.json({ success: true, awb: result.awb, shipmentId: result.shipmentId });
}
