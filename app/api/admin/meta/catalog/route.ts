import { NextResponse } from "next/server";
import { readSettings, readCollection } from "@/lib/db/store";
import type { Product } from "@/lib/db/types";

export async function GET() {
  const config = readSettings<{ isConnected: boolean }>("meta-config");
  if (!config || !config.isConnected) {
    return NextResponse.json({ error: "Meta account not connected" }, { status: 401 });
  }

  const products = readCollection<Product>("products");
  const list = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.price,
    stock: p.stock,
    category: p.categoryId,
    catalogStatus: "synced",
    lastSync: p.updatedAt
  }));

  return NextResponse.json(list);
}

export async function POST() {
  const config = readSettings<{ isConnected: boolean }>("meta-config");
  if (!config || !config.isConnected) {
    return NextResponse.json({ error: "Meta account not connected" }, { status: 401 });
  }

  // Trigger catalog sync action (simulated)
  return NextResponse.json({
    success: true,
    message: "WooCommerce catalog sync triggered successfully.",
    timestamp: new Date().toISOString()
  });
}
