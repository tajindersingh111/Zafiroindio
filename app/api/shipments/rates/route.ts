import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { getRates } from "@/lib/shipping/shipmozo";

export const dynamic = "force-dynamic";

/** Admin: ShipMozo courier quotes for an order (cheapest first). Blank parcel fields use the defaults. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, "orders");
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  if (!orderId) return NextResponse.json({ error: "orderId is required." }, { status: 400 });

  try {
    const parcel = { weightKg: Number(body?.weightKg) || undefined, l: Number(body?.l) || undefined, w: Number(body?.w) || undefined, h: Number(body?.h) || undefined };
    return NextResponse.json(await getRates(orderId, parcel));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
