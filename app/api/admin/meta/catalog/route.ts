import { NextResponse } from "next/server";
import { readSettings, readCollection } from "@/lib/db/store";
import type { Product } from "@/lib/db/types";
import { guarded } from "@/lib/auth/guard";

async function handleGET() {
  const config = await readSettings<{ isConnected: boolean }>("meta-config");
  if (!config || !config.isConnected) {
    return NextResponse.json({ error: "Meta account not connected" }, { status: 401 });
  }

  const products = await readCollection<Product>("products");
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

async function handlePOST() {
  const config = await readSettings<{ isConnected: boolean }>("meta-config");
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

export const GET = guarded(handleGET);
export const POST = guarded(handlePOST);
