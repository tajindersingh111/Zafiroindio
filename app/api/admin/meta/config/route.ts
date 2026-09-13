import { NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/db/store";

interface MetaConfig {
  isConnected: boolean;
  businessName: string;
  adAccountName: string;
  adAccountId: string;
  pageName: string;
  instagramName: string;
  pixelId: string;
  pixelName: string;
  catalogId: string;
  catalogSyncActive: boolean;
  accessToken: string;
  conversionsApiActive: boolean;
  conversionsApiToken: string;
}

const DEFAULT_CONFIG: MetaConfig = {
  isConnected: false,
  businessName: "",
  adAccountName: "",
  adAccountId: "",
  pageName: "",
  instagramName: "",
  pixelId: "",
  pixelName: "",
  catalogId: "",
  catalogSyncActive: false,
  accessToken: "",
  conversionsApiActive: false,
  conversionsApiToken: "",
};

export async function GET() {
  const config = readSettings<MetaConfig>("meta-config") || DEFAULT_CONFIG;
  // Mask sensitive tokens
  const safe = {
    ...config,
    accessToken: config.accessToken ? "••••••••••••••••" : "",
    conversionsApiToken: config.conversionsApiToken ? "••••••••••••••••" : "",
  };
  return NextResponse.json(safe);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<MetaConfig>;
    const current = readSettings<MetaConfig>("meta-config") || DEFAULT_CONFIG;
    
    // Merge updates
    const updated: MetaConfig = {
      ...current,
      ...body,
      // If client sent masked string, don't overwrite the original stored token
      accessToken: body.accessToken === "••••••••••••••••" ? current.accessToken : (body.accessToken ?? current.accessToken),
      conversionsApiToken: body.conversionsApiToken === "••••••••••••••••" ? current.conversionsApiToken : (body.conversionsApiToken ?? current.conversionsApiToken),
    };

    writeSettings("meta-config", updated);

    const safe = {
      ...updated,
      accessToken: updated.accessToken ? "••••••••••••••••" : "",
      conversionsApiToken: updated.conversionsApiToken ? "••••••••••••••••" : "",
    };

    return NextResponse.json(safe);
  } catch (error) {
    return NextResponse.json({ error: "Invalid configuration payload" }, { status: 400 });
  }
}

export async function DELETE() {
  writeSettings("meta-config", DEFAULT_CONFIG);
  return NextResponse.json({ success: true, ...DEFAULT_CONFIG });
}
