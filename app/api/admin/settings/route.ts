import { NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/db/store";
import { guarded } from "@/lib/auth/guard";
import { invalidate } from "@/lib/cache";

export const dynamic = "force-dynamic";

// Courier API secrets are managed only through /api/admin/shipping and never sent to the browser.
const SECRET_KEYS = ["shipmozo_private_key", "shipmozo_secret_key", "shipmozo_public_key", "shipmozo_api_key"];
const withoutSecrets = (s: Record<string, unknown>) => Object.fromEntries(Object.entries(s).filter(([k]) => !SECRET_KEYS.includes(k)));

async function handleGET() {
  return NextResponse.json({ settings: withoutSecrets((await readSettings<Record<string, unknown>>("settings")) ?? {}) });
}

async function handlePATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Settings must be an object." }, { status: 400 });
  }
  const current = (await readSettings<Record<string, unknown>>("settings")) ?? {};
  // Drop prototype-pollution style keys.
  const safe = Object.fromEntries(Object.entries(body as Record<string, unknown>).filter(([k]) => !["__proto__", "constructor", "prototype", ...SECRET_KEYS].includes(k)));
  const updated = { ...current, ...safe };
  await writeSettings("settings", updated);
  invalidate("shipmozo:");
  return NextResponse.json({ settings: withoutSecrets(updated) });
}

export const GET = guarded(handleGET);
export const PATCH = guarded(handlePATCH);
