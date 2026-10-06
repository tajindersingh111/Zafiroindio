import { NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/db/store";
import { guarded } from "@/lib/auth/guard";

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

async function handleGET() {
  const config = await readSettings<MetaConfig>("meta-config") || DEFAULT_CONFIG;
  // Mask sensitive tokens
  const safe = {
    ...config,
    accessToken: config.accessToken ? "••••••••••••••••" : "",
    conversionsApiToken: config.conversionsApiToken ? "••••••••••••••••" : "",
  };
  return NextResponse.json(safe);
}

async function handlePOST(request: Request) {
  try {
    const body = await request.json() as Partial<MetaConfig>;
    const current = await readSettings<MetaConfig>("meta-config") || DEFAULT_CONFIG;
    
    // Merge updates
    const updated: MetaConfig = {
      ...current,
      ...body,
      // If client sent masked string, don't overwrite the original stored token
      accessToken: body.accessToken === "••••••••••••••••" ? current.accessToken : (body.accessToken ?? current.accessToken),
      conversionsApiToken: body.conversionsApiToken === "••••••••••••••••" ? current.conversionsApiToken : (body.conversionsApiToken ?? current.conversionsApiToken),
    };

    await writeSettings("meta-config", updated);

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

async function handleDELETE() {
  await writeSettings("meta-config", DEFAULT_CONFIG);
  return NextResponse.json({ success: true, ...DEFAULT_CONFIG });
}

export const GET = guarded(handleGET);
export const POST = guarded(handlePOST);
export const DELETE = guarded(handleDELETE);
