import { NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import { getAllExpenses } from "@/lib/db/expenses";
import type { Product, Order } from "@/lib/db/types";
import {
  calculateGlobalProfitability,
  calculateProductProfitabilitySummaries,
  calculateOrderProfitability
} from "@/lib/analytics/profitability";
import { guarded } from "@/lib/auth/guard";

async function handleGET(request: Request) {
  try {
    const products = await readCollection<Product>("products");
    const orders = await readCollection<Order>("orders");
    const expenses = await getAllExpenses();

    const globalProfitability = calculateGlobalProfitability(products, orders, expenses);
    const productSummaries = calculateProductProfitabilitySummaries(products, orders, expenses);
    
    const productsMap = new Map<string, Product>(products.map((p) => [p.id, p]));
    const orderBreakdowns = orders.map((o) => calculateOrderProfitability(o, productsMap));

    return NextResponse.json({
      global: globalProfitability,
      products: productSummaries,
      orders: orderBreakdowns,
      expensesCount: expenses.length
    });
  } catch (err) {
    console.error("Failed to calculate profitability analytics:", err);
    return NextResponse.json({ error: "Failed to generate profitability analytics." }, { status: 500 });
  }
}

export const GET = guarded(handleGET);
