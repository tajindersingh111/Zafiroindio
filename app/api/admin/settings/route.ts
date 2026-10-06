import { NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/db/store";
import { guarded } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

async function handleGET() {
  return NextResponse.json({ settings: (await readSettings<Record<string, unknown>>("settings")) ?? {} });
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
  const safe = Object.fromEntries(Object.entries(body as Record<string, unknown>).filter(([k]) => !["__proto__", "constructor", "prototype"].includes(k)));
  const updated = { ...current, ...safe };
  await writeSettings("settings", updated);
  return NextResponse.json({ settings: updated });
}

export const GET = guarded(handleGET);
export const PATCH = guarded(handlePATCH);
