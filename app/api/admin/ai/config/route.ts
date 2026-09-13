import { NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/db/store";

interface AIConfig {
  forecastPeriodDays: number;
  lowStockRestockThreshold: number;
  inactiveDaysThreshold: number;
  vipSpentThreshold: number;
  targetCpa: number;
  targetRoas: number;
  insightsFrequency: string;
}

const DEFAULT_CONFIG: AIConfig = {
  forecastPeriodDays: 30,
  lowStockRestockThreshold: 15,
  inactiveDaysThreshold: 60,
  vipSpentThreshold: 10000,
  targetCpa: 200,
  targetRoas: 4.5,
  insightsFrequency: "daily"
};

export async function GET() {
  const config = readSettings<AIConfig>("ai-config") || DEFAULT_CONFIG;
  return NextResponse.json(config);
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Partial<AIConfig>;
    const current = readSettings<AIConfig>("ai-config") || DEFAULT_CONFIG;
    const updated = { ...current, ...body };
    writeSettings("ai-config", updated);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Invalid configuration payload" }, { status: 400 });
  }
}
