import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const FILE = join(process.cwd(), "data", "settings.json");

function readSettings(): Record<string, unknown> {
  if (!existsSync(FILE)) return {};
  try { return JSON.parse(readFileSync(FILE, "utf-8")); }
  catch { return {}; }
}

export async function GET() {
  return NextResponse.json({ settings: readSettings() });
}

export async function PATCH(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  const current = readSettings();
  const updated = { ...current, ...body };
  writeFileSync(FILE, JSON.stringify(updated, null, 2), "utf-8");
  return NextResponse.json({ settings: updated });
}
