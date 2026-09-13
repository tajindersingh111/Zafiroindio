import { NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import type { Product, Order } from "@/lib/db/types";

export async function GET() {
  const products = readCollection<Product>("products");
  const orders = readCollection<Order>("orders");

  const paidOrders = orders.filter((o) => o.paymentStatus === "paid" || o.paymentStatus === "partially_paid");

  // Sum units sold per product
  const unitsSoldMap: Record<string, number> = {};
  paidOrders.forEach((o) => {
    o.items.forEach((item) => {
      unitsSoldMap[item.productId] = (unitsSoldMap[item.productId] ?? 0) + item.quantity;
    });
  });

  const now = new Date();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const smartProducts = products.map((p) => {
    const unitsSold = unitsSoldMap[p.id] ?? 0;
    const stock = p.stock;
    const cost = p.costPrice ?? 0;
    const valuation = stock * cost;

    // Stockout prediction
    // Assuming simple velocity calculation since store launch (approx 60 days of operations)
    const dailyVelocity = unitsSold / 60;
    let daysToStockout: string | number = "Not enough data for prediction";
    if (dailyVelocity > 0) {
      const days = Math.round(stock / dailyVelocity);
      daysToStockout = days;
    }

    // Days since last sale / update
    const lastUpdateDate = new Date(p.updatedAt);
    const diffMs = now.getTime() - lastUpdateDate.getTime();
    const daysSinceLastSale = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      stock,
      cost,
      valuation,
      unitsSold,
      daysToStockout,
      daysSinceLastSale
    };
  });

  // Segments
  const fastMoving = [...smartProducts].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5);
  const slowMoving = [...smartProducts].filter((p) => p.unitsSold > 0 && p.unitsSold < 5).slice(0, 5);
  const deadStock = [...smartProducts].filter((p) => p.unitsSold === 0 || p.daysSinceLastSale >= 90);
  const outOfStock = [...smartProducts].filter((p) => p.stock === 0);

  const totalValuation = smartProducts.reduce((s, p) => s + p.valuation, 0);

  return NextResponse.json({
    products: smartProducts,
    fastMoving,
    slowMoving,
    deadStock,
    outOfStock,
    totalValuation
  });
}
