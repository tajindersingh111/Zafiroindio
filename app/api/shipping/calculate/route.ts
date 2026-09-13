import { NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import { calculateShippingAndCodFee } from "@/lib/shipping/calculator";
import type { Product, StoreSettings } from "@/lib/db/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items = body.items || [];
    const paymentMethod = body.paymentMethod || "cod";

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart items are required for shipping calculation." }, { status: 400 });
    }

    const products = readCollection<Product>("products");
    const settingsList = readCollection<StoreSettings>("settings");
    const storeSettings = settingsList && settingsList.length > 0 ? settingsList[0] : undefined;

    const productsMap = new Map<string, Product>();
    products.forEach((p) => {
      productsMap.set(p.id, p);
      productsMap.set(p.slug, p);
    });

    const result = calculateShippingAndCodFee({
      items,
      productsMap,
      paymentMethod,
      storeSettings
    });

    return NextResponse.json({ result });
  } catch (err) {
    console.error("Error calculating shipping and COD fee:", err);
    return NextResponse.json({ error: "Failed to evaluate shipping rules." }, { status: 500 });
  }
}
