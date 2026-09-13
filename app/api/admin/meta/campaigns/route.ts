import { NextResponse } from "next/server";
import { readCollection, writeCollection, readSettings, writeSettings } from "@/lib/db/store";

interface MetaConfig {
  isConnected: boolean;
}

interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: string;
  budget: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  costPerPurchase: number;
  revenue: number;
  roas: number;
  startDate: string;
  endDate: string;
}

export async function GET(request: Request) {
  const config = readSettings<MetaConfig>("meta-config");
  if (!config || !config.isConnected) {
    return NextResponse.json({ error: "Meta account not connected" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") ?? "").toLowerCase();
  const status = searchParams.get("status") ?? "";
  const sort = searchParams.get("sort") ?? "";

  const sandbox = readSettings<{ campaigns: Campaign[] }>("meta-sandbox");
  let campaigns = sandbox?.campaigns ?? [];

  if (search) {
    campaigns = campaigns.filter((c) => c.name.toLowerCase().includes(search));
  }
  if (status) {
    campaigns = campaigns.filter((c) => c.status.toLowerCase() === status.toLowerCase());
  }

  if (sort) {
    campaigns = [...campaigns].sort((a, b) => {
      const valA = (a as any)[sort];
      const valB = (b as any)[sort];
      if (typeof valA === "number" && typeof valB === "number") {
        return valB - valA;
      }
      return String(valB).localeCompare(String(valA));
    });
  }

  return NextResponse.json(campaigns);
}

export async function POST(request: Request) {
  const config = readSettings<MetaConfig>("meta-config");
  if (!config || !config.isConnected) {
    return NextResponse.json({ error: "Meta account not connected" }, { status: 401 });
  }

  try {
    const body = await request.json() as Partial<Campaign>;
    const sandbox = readSettings<{ campaigns: Campaign[]; adsets: any[]; ads: any[]; audiences: any[]; events: any[] }>("meta-sandbox");
    if (!sandbox) return NextResponse.json({ error: "Internal sandbox error" }, { status: 500 });

    const newCampaign: Campaign = {
      id: "12020394" + Math.floor(Math.random() * 900000 + 100000),
      name: body.name ?? "Untitled Campaign",
      objective: body.objective ?? "Sales",
      status: "Active",
      budget: body.budget ?? "₹1,000 / day",
      spend: 0,
      impressions: 0,
      reach: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      purchases: 0,
      costPerPurchase: 0,
      revenue: 0,
      roas: 0,
      startDate: body.startDate ?? new Date().toISOString().split("T")[0],
      endDate: body.endDate ?? "Continuous"
    };

    sandbox.campaigns.push(newCampaign);
    writeSettings("meta-sandbox", sandbox);
    return NextResponse.json(newCampaign);
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
