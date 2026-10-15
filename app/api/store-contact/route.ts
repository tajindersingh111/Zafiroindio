import { NextResponse } from "next/server";
import { getStoreContact } from "@/lib/storefront/contact";

export const dynamic = "force-dynamic";

/** Public support contact (e-mail, phone, WhatsApp) for storefront links. */
export async function GET() {
  return NextResponse.json(await getStoreContact(), { headers: { "Cache-Control": "public, max-age=300" } });
}
