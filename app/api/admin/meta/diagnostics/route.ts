import { NextResponse } from "next/server";
import { readSettings } from "@/lib/db/store";

export async function GET() {
  const config = readSettings<{ isConnected: boolean; conversionsApiActive: boolean }>("meta-config");
  if (!config || !config.isConnected) {
    return NextResponse.json({ error: "Meta account not connected" }, { status: 401 });
  }

  const sandbox = readSettings<{ events: any[]; diagnostics: any }>("meta-sandbox");

  return NextResponse.json({
    events: sandbox?.events ?? [],
    conversionsApiStatus: config.conversionsApiActive ? "Connected" : "Configuration Required",
    deduplicationRate: sandbox?.diagnostics?.deduplicationRate ?? "N/A"
  });
}
