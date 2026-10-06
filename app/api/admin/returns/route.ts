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

async function handleGET() {
  const returns = await readCollection<ReturnRequest>("returns");
  return NextResponse.json(returns);
}

async function handlePOST(request: Request) {
  try {
    const body = await request.json() as Partial<ReturnRequest>;
    const returns = await readCollection<ReturnRequest>("returns");
    const newRequest: ReturnRequest = {
      id: "ret-" + Math.random().toString(36).substring(2, 9),
      orderId: body.orderId ?? "",
      orderNumber: body.orderNumber ?? "",
      customerName: body.customerName ?? "",
      customerEmail: body.customerEmail ?? "",
      productName: body.productName ?? "",
      quantity: body.quantity ?? 1,
      refundAmount: body.refundAmount ?? 0,
      reason: body.reason ?? "Defective",
      notes: body.notes ?? "",
      status: "requested",
      createdAt: new Date().toISOString()
    };
    returns.push(newRequest);
    await writeCollection("returns", returns);
    return NextResponse.json(newRequest);
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export const GET = guarded(handleGET);
export const POST = guarded(handlePOST);
