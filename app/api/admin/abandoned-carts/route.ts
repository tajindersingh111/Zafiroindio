import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";

interface AbandonedCart {
  id: string;
  customerName: string;
  customerEmail: string;
  products: any[];
  cartValue: number;
  status: "abandoned" | "reminder_sent" | "recovered" | "expired";
  reminderSent: boolean;
  createdAt: string;
}

export async function GET() {
  const carts = readCollection<AbandonedCart>("abandoned-carts");
  const totalCarts = carts.length;
  const abandonedVal = carts.reduce((s, c) => s + c.cartValue, 0);
  const recovered = carts.filter((c) => c.status === "recovered");
  const recoveredVal = recovered.reduce((s, c) => s + c.cartValue, 0);
  const recoveryRate = totalCarts > 0 ? (recovered.length / totalCarts) * 100 : 0;

  return NextResponse.json({
    carts,
    analytics: {
      totalCarts,
      abandonedValue: abandonedVal,
      recoveredCount: recovered.length,
      recoveryRate,
      recoveredRevenue: recoveredVal,
      unrecoveredRevenue: abandonedVal - recoveredVal
    }
  });
}

export async function PATCH(request: Request) {
  try {
    const { id, status, reminderSent } = await request.json() as Partial<AbandonedCart>;
    const carts = readCollection<AbandonedCart>("abandoned-carts");
    const idx = carts.findIndex((c) => c.id === id);
    if (idx < 0) return NextResponse.json({ error: "Cart not found" }, { status: 404 });

    carts[idx] = {
      ...carts[idx],
      ...(status !== undefined && { status }),
      ...(reminderSent !== undefined && { reminderSent })
    };
    writeCollection("abandoned-carts", carts);
    return NextResponse.json(carts[idx]);
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
