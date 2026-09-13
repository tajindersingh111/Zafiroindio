import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";

interface Campaign {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  discount: string;
  coupon: string;
  segment: string;
  isActive: boolean;
}

export async function GET() {
  const campaigns = readCollection<Campaign>("campaigns");
  return NextResponse.json(campaigns);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<Campaign>;
    const campaigns = readCollection<Campaign>("campaigns");
    const newCamp: Campaign = {
      id: "cam-" + Math.random().toString(36).substring(2, 9),
      name: body.name ?? "",
      startDate: body.startDate ?? "",
      endDate: body.endDate ?? "",
      discount: body.discount ?? "",
      coupon: body.coupon ?? "",
      segment: body.segment ?? "",
      isActive: body.isActive !== undefined ? body.isActive : true
    };
    campaigns.push(newCamp);
    writeCollection("campaigns", campaigns);
    return NextResponse.json(newCamp);
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Partial<Campaign> & { id: string };
    const campaigns = readCollection<Campaign>("campaigns");
    const idx = campaigns.findIndex((c) => c.id === body.id);
    if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    campaigns[idx] = { ...campaigns[idx], ...body };
    writeCollection("campaigns", campaigns);
    return NextResponse.json(campaigns[idx]);
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
