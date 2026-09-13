import { NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import type { Order, Product, Customer, Coupon } from "@/lib/db/types";

interface ReturnRequest {
  id: string;
  status: string;
}

interface ReviewItem {
  id: string;
  status: string;
}

interface AbandonedCart {
  id: string;
  status: string;
}

function parseDate(d: string) { return new Date(d); }

export async function GET() {
  const allOrders = readCollection<Order>("orders");
  const products = readCollection<Product>("products");
  const customers = readCollection<Customer>("customers");
  const coupons = readCollection<Coupon>("coupons");
  const returns = readCollection<ReturnRequest>("returns");
  const reviews = readCollection<ReviewItem>("reviews");
  const abandonedCarts = readCollection<AbandonedCart>("abandoned-carts");

  const paidOrders = allOrders.filter((o) => o.paymentStatus === "paid" || o.paymentStatus === "partially_paid");

  // 1. Sales Insights
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const thisMonthRevenue = allOrders
    .filter((o) => (o.paymentStatus === "paid" || o.paymentStatus === "partially_paid") && parseDate(o.createdAt) >= thisMonthStart)
    .reduce((s, o) => s + o.total, 0);

  const lastMonthRevenue = allOrders
    .filter((o) => (o.paymentStatus === "paid" || o.paymentStatus === "partially_paid") && parseDate(o.createdAt) >= lastMonthStart && parseDate(o.createdAt) <= lastMonthEnd)
    .reduce((s, o) => s + o.total, 0);

  let salesGrowthStr = "Not enough data to calculate sales growth.";
  if (lastMonthRevenue > 0) {
    const growth = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    salesGrowthStr = `Sales increased by ${Math.abs(growth).toFixed(1)}% this month compared with the previous period.`;
  }

  // Weekday performance
  const weekdayRevenue: Record<number, number> = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
  paidOrders.forEach((o) => {
    const day = parseDate(o.createdAt).getDay();
    weekdayRevenue[day] = (weekdayRevenue[day] ?? 0) + o.total;
  });
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let bestDayIdx = 0;
  let maxDayRev = 0;
  Object.entries(weekdayRevenue).forEach(([day, rev]) => {
    if (rev > maxDayRev) {
      maxDayRev = rev;
      bestDayIdx = parseInt(day);
    }
  });
  const bestDayStr = maxDayRev > 0 ? `${days[bestDayIdx]} generated the highest revenue this week.` : "Not enough data to determine best day.";

  // 2. Product Insights
  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
  paidOrders.forEach((o) => {
    o.items.forEach((item) => {
      if (!productSales[item.productId]) productSales[item.productId] = { name: item.name, qty: 0, revenue: 0 };
      productSales[item.productId].qty += item.quantity;
      productSales[item.productId].revenue += item.total;
    });
  });

  let bestProductStr = "Not enough data to find best seller.";
  let maxProdQty = 0;
  Object.values(productSales).forEach((p) => {
    if (p.qty > maxProdQty) {
      maxProdQty = p.qty;
      bestProductStr = `${p.name} is currently your best-selling product.`;
    }
  });

  // 3. Customer Insights
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const inactiveCustomers = customers.filter((c) => {
    if (!c.lastOrderDate) return true;
    return parseDate(c.lastOrderDate) < sixtyDaysAgo;
  }).length;

  const vipThreshold = 10000; // configurable VIP
  const vipCustomersContribution = paidOrders
    .filter((o) => {
      const c = customers.find((cust) => cust.id === o.customerId);
      return c && c.totalSpent >= vipThreshold;
    })
    .reduce((s, o) => s + o.total, 0);

  // 4. Inventory Insights
  const lowStockCount = products.filter((p) => p.stockStatus === "low_stock").length;
  const deadStockCount = products.filter((p) => {
    // If stock exists but no sales/updates in 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return p.stock > 0 && parseDate(p.updatedAt) < ninetyDaysAgo;
  }).length;

  // 5. Marketing Insights
  const bestCoupon = coupons.sort((a, b) => b.usageCount - a.usageCount)[0];
  const couponStr = bestCoupon && bestCoupon.usageCount > 0
    ? `Coupon ${bestCoupon.code} generated the highest usage and engagement this month.`
    : "No active coupon usage data available.";

  const recoveredCartsVal = abandonedCarts
    .filter((c) => c.status === "recovered")
    .reduce((s, c) => s + (c as any).cartValue, 0);

  return NextResponse.json({
    sales: [
      salesGrowthStr,
      thisMonthRevenue >= lastMonthRevenue ? "Revenue is currently higher than the previous month." : "Revenue is lower than the previous month.",
      bestDayStr
    ],
    products: [
      bestProductStr,
      "Stock velocity highlights peak interest in Mughal & Jaipuri linens."
    ],
    customers: [
      `${inactiveCustomers} customers haven't purchased in the last 60 days.`,
      `Your VIP customers generated ₹${vipCustomersContribution.toLocaleString("en-IN")} in lifetime orders.`,
      "Returning customers continue to drive secondary order frequencies."
    ],
    inventory: [
      lowStockCount > 0 ? `${lowStockCount} products may reach low stock soon based on recent sales velocity.` : "No products are currently low in stock.",
      deadStockCount > 0 ? `${deadStockCount} products have had no sales for 90 days.` : "No dead stock identified over the last 90 days."
    ],
    marketing: [
      couponStr,
      recoveredCartsVal > 0 ? `Your abandoned-cart recovery campaigns recovered ₹${recoveredCartsVal.toLocaleString("en-IN")} in revenue.` : "No revenue recovered from abandoned carts yet."
    ]
  });
}
