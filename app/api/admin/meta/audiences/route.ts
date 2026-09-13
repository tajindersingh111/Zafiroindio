import { NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/db/store";

export async function GET() {
  const config = readSettings<{ isConnected: boolean }>("meta-config");
  if (!config || !config.isConnected) {
    return NextResponse.json({ error: "Meta account not connected" }, { status: 401 });
  }

  const sandbox = readSettings<{ audiences: any[] }>("meta-sandbox");
  return NextResponse.json(sandbox?.audiences ?? []);
}

export async function POST(request: Request) {
  const config = readSettings<{ isConnected: boolean }>("meta-config");
  if (!config || !config.isConnected) {
    return NextResponse.json({ error: "Meta account not connected" }, { status: 401 });
  }

  try {
    const { name, type } = await request.json() as { name: string; type: string };
    const sandbox = readSettings<{ campaigns: any[]; adsets: any[]; ads: any[]; audiences: any[] }>("meta-sandbox");
    if (!sandbox) return NextResponse.json({ error: "Internal sandbox error" }, { status: 500 });

    const newAudience = {
      id: "aud-" + Math.floor(Math.random() * 900 + 100),
      name,
      type: type || "Custom Audience",
      size: "Syncing...",
      source: "WooCommerce Push",
      lastUpdated: new Date().toISOString().split("T")[0]
    };

    sandbox.audiences.push(newAudience);
    writeSettings("meta-sandbox", sandbox);
    return NextResponse.json(newAudience);
  } catch (error) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
