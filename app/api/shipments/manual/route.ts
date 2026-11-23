import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { recordManualShipment } from "@/lib/shipping/provider";
import { createAuditLog } from "@/lib/db/audit";

export const dynamic = "force-dynamic";

/**
 * Admin: record an AWB booked by hand — on the ShipMozo panel itself, or with any other courier —
 * when ShipMozo's API won't book it for us. Saves only what's typed here; makes no ShipMozo call.
 */
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
  const awb = typeof body?.awb === "string" ? body.awb.trim() : "";
  const courierName = typeof body?.courierName === "string" ? body.courierName.trim() : "";
  if (!orderId) return NextResponse.json({ error: "orderId is required." }, { status: 400 });
  if (!awb) return NextResponse.json({ error: "AWB / tracking number is required." }, { status: 400 });
  if (!courierName) return NextResponse.json({ error: "Courier name is required." }, { status: 400 });
  const trackingUrl = typeof body?.trackingUrl === "string" && body.trackingUrl.trim() ? body.trackingUrl.trim() : undefined;
  // Default on: a courier booked by hand usually never scans back to us, so nothing else would tell the shopper.
  const markShipped = body?.markShipped !== false;

  const result = await recordManualShipment({ orderId, awb, courierName, trackingUrl, markShipped, siteUrl: process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin });
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

  await createAuditLog({
    userId: auth.session.userId,
    userName: auth.session.name,
    userRole: auth.session.role,
    action: "manual_shipment",
    module: "orders",
    recordId: orderId,
    updatedData: { awb: result.awb, courier: result.courierName, markedShipped: result.shipped },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    shipment: { trackingNumber: result.awb, courierName: result.courierName, shipped: result.shipped, notified: result.notified },
  });
}
