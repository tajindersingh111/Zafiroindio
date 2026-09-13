import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Product } from "@/lib/db/types";

export async function GET() {
  const products = readCollection<Product>("products");
  
  const inStock = products.filter((p) => p.stockStatus === "in_stock").length;
  const lowStock = products.filter((p) => p.stockStatus === "low_stock").length;
  const outOfStock = products.filter((p) => p.stockStatus === "out_of_stock").length;

  return NextResponse.json({
    summary: {
      total: products.length,
      inStock,
      lowStock,
      outOfStock,
    },
    inventory: products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      stock: p.stock,
      stockStatus: p.stockStatus,
      lowStockThreshold: p.lowStockThreshold,
      price: p.price,
    })),
  });
}

export async function PATCH(request: Request) {
  try {
    const { productId, stock, lowStockThreshold } = await request.json();
    const products = readCollection<Product>("products");
    const idx = products.findIndex((p) => p.id === productId);
    if (idx === -1) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const p = products[idx];
    const newStock = stock ?? p.stock;
    const threshold = lowStockThreshold ?? p.lowStockThreshold;
    const stockStatus = newStock === 0 ? "out_of_stock" : newStock <= threshold ? "low_stock" : "in_stock";

    products[idx] = {
      ...p,
      stock: newStock,
      lowStockThreshold: threshold,
      stockStatus,
      updatedAt: new Date().toISOString(),
    };

    writeCollection("products", products);
    return NextResponse.json({ product: products[idx] });
  } catch {
    return NextResponse.json({ error: "Failed to update inventory." }, { status: 500 });
  }
}
