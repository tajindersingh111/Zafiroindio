import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import { guarded } from "@/lib/auth/guard";

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

async function handleGET() {
  const campaigns = await readCollection<Campaign>("campaigns");
  return NextResponse.json(campaigns);
}

async function handlePOST(request: Request) {
  try {
    const body = await request.json() as Partial<Campaign>;
    const campaigns = await readCollection<Campaign>("campaigns");
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
    await writeCollection("campaigns", campaigns);
    return NextResponse.json(newCamp);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

async function handlePATCH(request: Request) {
  try {
    const body = await request.json() as Partial<Campaign> & { id: string };
    const campaigns = await readCollection<Campaign>("campaigns");
    const idx = campaigns.findIndex((c) => c.id === body.id);
    if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    campaigns[idx] = { ...campaigns[idx], ...body };
    await writeCollection("campaigns", campaigns);
    return NextResponse.json(campaigns[idx]);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export const GET = guarded(handleGET);
export const POST = guarded(handlePOST);
export const PATCH = guarded(handlePATCH);
