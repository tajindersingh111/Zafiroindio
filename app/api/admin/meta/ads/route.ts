import { NextResponse } from "next/server";
import { readSettings } from "@/lib/db/store";

export async function GET() {
  const config = readSettings<{ isConnected: boolean }>("meta-config");
  if (!config || !config.isConnected) {
    return NextResponse.json({ error: "Meta account not connected" }, { status: 401 });
  }

  const sandbox = readSettings<{ ads: any[] }>("meta-sandbox");
  return NextResponse.json(sandbox?.ads ?? []);
}
