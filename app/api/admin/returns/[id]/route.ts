import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import { guarded } from "@/lib/auth/guard";

interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  quantity: number;
  refundAmount: number;
  reason: string;
  notes: string;
  status: string;
  createdAt: string;
}

async function handleGET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const returns = await readCollection<ReturnRequest>("returns");
  const requestItem = returns.find((r) => r.id === id);
  if (!requestItem) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(requestItem);
}

async function handlePATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json() as Partial<ReturnRequest>;
    const returns = await readCollection<ReturnRequest>("returns");
    const idx = returns.findIndex((r) => r.id === id);
    if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    returns[idx] = { ...returns[idx], ...body, id };
    await writeCollection("returns", returns);
    return NextResponse.json(returns[idx]);
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export const GET = guarded(handleGET);
export const PATCH = guarded(handlePATCH);
