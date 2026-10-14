import { NextResponse } from "next/server";
import { guarded } from "@/lib/auth/guard";
import { sendTestWhatsApp } from "@/lib/notifications/whatsapp";

export const dynamic = "force-dynamic";

/** Sends a test WhatsApp with the saved settings, so the admin can check them before real orders come in. */
async function handlePOST(request: Request) {
  const body = (await request.json().catch(() => null)) as { phone?: unknown } | null;
  const phone = typeof body?.phone === "string" ? body.phone : "";
  const result = await sendTestWhatsApp(phone);
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: result.error }, { status: 400 });
}

export const POST = guarded(handlePOST, "settings");
