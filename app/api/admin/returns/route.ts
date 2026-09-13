import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";

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

export async function GET() {
  const returns = readCollection<ReturnRequest>("returns");
  return NextResponse.json(returns);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<ReturnRequest>;
    const returns = readCollection<ReturnRequest>("returns");
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
    writeCollection("returns", returns);
    return NextResponse.json(newRequest);
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
