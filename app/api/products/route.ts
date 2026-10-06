import { NextResponse } from "next/server";
import { getCatalogProducts } from "@/lib/storefront/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await getCatalogProducts();
    return NextResponse.json({ products }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
  } catch (error) {
    console.error("GET /api/products failed:", error);
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
