import { NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import type { Order, Product, Customer, Coupon } from "@/lib/db/types";

interface ReturnRequest {
  id: string;
  orderNumber: string;
  customerName: string;
  productName: string;
  refundAmount: number;
  reason: string;
  status: string;
  createdAt: string;
}

interface AbandonedCart {
  id: string;
  customerName: string;
  customerEmail: string;
  products: any[];
  cartValue: number;
  status: string;
  reminderSent: boolean;
  createdAt: string;
}

function parseDate(d: string) { return new Date(d); }

export async function GET() {
  const allOrders = readCollection<Order>("orders");
  const products = readCollection<Product>("products");
  const customers = readCollection<Customer>("customers");
  const coupons = readCollection<Coupon>("coupons");
  const returns = readCollection<ReturnRequest>("returns");
  const abandonedCarts = readCollection<AbandonedCart>("abandoned-carts");

  const paidOrders = allOrders.filter((o) => o.paymentStatus === "paid" || o.paymentStatus === "partially_paid");

  // 1. Sales by Hour
  const salesByHour: Record<number, { hour: number; revenue: number; orders: number }> = {};
  for (let i = 0; i < 24; i++) {
    salesByHour[i] = { hour: i, revenue: 0, orders: 0 };
  }
  paidOrders.forEach((o) => {
    const hr = parseDate(o.createdAt).getHours();
    salesByHour[hr].revenue += o.total;
    salesByHour[hr].orders += 1;
  });

  // 2. Sales by Day of Week
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const salesByDay = weekdays.map((day, idx) => ({
    day,
    revenue: 0,
    orders: 0
  }));
  paidOrders.forEach((o) => {
    const dayIdx = parseDate(o.createdAt).getDay();
    salesByDay[dayIdx].revenue += o.total;
    salesByDay[dayIdx].orders += 1;
  });

  // 3. Sales by Month
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const salesByMonth = months.map((month, idx) => ({
    month,
    revenue: 0,
    orders: 0,
    unitsSold: 0
  }));
  paidOrders.forEach((o) => {
    const mIdx = parseDate(o.createdAt).getMonth();
    salesByMonth[mIdx].revenue += o.total;
    salesByMonth[mIdx].orders += 1;
    salesByMonth[mIdx].unitsSold += o.items.reduce((s, i) => s + i.quantity, 0);
  });

  // 4. Sales by Product
  const productPerformanceMap: Record<string, { id: string; name: string; unitsSold: number; revenue: number; orders: number; refunds: number; netRevenue: number }> = {};
  paidOrders.forEach((o) => {
    o.items.forEach((item) => {
      if (!productPerformanceMap[item.productId]) {
        productPerformanceMap[item.productId] = {
          id: item.productId,
          name: item.name,
          unitsSold: 0,
          revenue: 0,
          orders: 0,
          refunds: 0,
          netRevenue: 0
        };
      }
      const p = productPerformanceMap[item.productId];
      p.unitsSold += item.quantity;
      p.revenue += item.total;
      p.orders += 1;
      p.netRevenue += item.total;
    });
  });

  // Factor in approved refunds
  returns.filter((r) => r.status === "approved" || r.status === "completed").forEach((r) => {
    // Find matching product
    Object.values(productPerformanceMap).forEach((p) => {
      if (p.name === r.productName) {
        p.refunds += r.refundAmount;
        p.netRevenue -= r.refundAmount;
      }
    });
  });

  // 5. Sales by Category
  const categoryPerformanceMap: Record<string, { category: string; revenue: number; orders: number; unitsSold: number }> = {};
  paidOrders.forEach((o) => {
    o.items.forEach((item) => {
      const prod = products.find((pr) => pr.id === item.productId);
      const cat = prod ? prod.categoryId : "Uncategorized";
      if (!categoryPerformanceMap[cat]) {
        categoryPerformanceMap[cat] = { category: cat, revenue: 0, orders: 0, unitsSold: 0 };
      }
      categoryPerformanceMap[cat].revenue += item.total;
      categoryPerformanceMap[cat].orders += 1;
      categoryPerformanceMap[cat].unitsSold += item.quantity;
    });
  });

  // 6. Sales by Customer
  const customerPerformanceMap: Record<string, { customerName: string; email: string; orders: number; revenue: number; lastPurchase: string }> = {};
  paidOrders.forEach((o) => {
    const key = o.customerId || o.customerEmail;
    if (!customerPerformanceMap[key]) {
      customerPerformanceMap[key] = {
        customerName: o.customerName,
        email: o.customerEmail,
        orders: 0,
        revenue: 0,
        lastPurchase: o.createdAt
      };
    }
    const c = customerPerformanceMap[key];
    c.orders += 1;
    c.revenue += o.total;
    if (parseDate(o.createdAt) > parseDate(c.lastPurchase)) {
      c.lastPurchase = o.createdAt;
    }
  });

  // 7. Sales by Location (States & Cities)
  const salesByLocationMap: Record<string, { state: string; country: string; orders: number; revenue: number; customers: number }> = {};
  paidOrders.forEach((o) => {
    const state = o.shipping.state || "Unknown";
    const country = o.shipping.country || "IN";
    if (!salesByLocationMap[state]) {
      salesByLocationMap[state] = { state, country, orders: 0, revenue: 0, customers: 0 };
    }
    salesByLocationMap[state].orders += 1;
    salesByLocationMap[state].revenue += o.total;
  });

  // Add customer count to state
  Object.keys(salesByLocationMap).forEach((state) => {
    const custs = new Set(paidOrders.filter((o) => o.shipping.state === state).map((o) => o.customerId || o.customerEmail));
    salesByLocationMap[state].customers = custs.size;
  });

  // 8. New vs Returning Customers
  let returningCustomersCount = 0;
  let newCustomersCount = 0;
  let returningRevenue = 0;
  let newRevenue = 0;

  customers.forEach((c) => {
    if (c.totalOrders > 1) {
      returningCustomersCount += 1;
      returningRevenue += c.totalSpent;
    } else {
      newCustomersCount += 1;
      newRevenue += c.totalSpent;
    }
  });

  // 9. Coupon Performance
  const couponPerfMap: Record<string, { code: string; usage: number; discount: number; revenue: number }> = {};
  coupons.forEach((cp) => {
    couponPerfMap[cp.code] = { code: cp.code, usage: cp.usageCount, discount: 0, revenue: 0 };
  });

  paidOrders.forEach((o) => {
    if (o.couponCode && couponPerfMap[o.couponCode]) {
      couponPerfMap[o.couponCode].discount += o.couponDiscount;
      couponPerfMap[o.couponCode].revenue += o.total;
    }
  });

  // 10. Refund Analysis
  const refundTotalAmount = returns.reduce((s, r) => s + r.refundAmount, 0);
  const refundRate = paidOrders.length > 0 ? (returns.length / paidOrders.length) * 100 : 0;

  // 11. Abandoned Cart Analytics
  const totalCarts = abandonedCarts.length;
  const abandonedValue = abandonedCarts.reduce((s, c) => s + c.cartValue, 0);
  const recoveredCarts = abandonedCarts.filter((c) => c.status === "recovered");
  const recoveredValue = recoveredCarts.reduce((s, c) => s + c.cartValue, 0);
  const recoveryRate = totalCarts > 0 ? (recoveredCarts.length / totalCarts) * 100 : 0;

  // 12. Profit margin analytics
  let profitAvailable = true;
  let totalCost = 0;
  let totalMarginRevenue = 0;

  paidOrders.forEach((o) => {
    o.items.forEach((item) => {
      const prod = products.find((pr) => pr.id === item.productId);
      if (prod && prod.costPrice !== undefined && prod.costPrice !== null) {
        totalCost += prod.costPrice * item.quantity;
        totalMarginRevenue += item.total;
      } else {
        profitAvailable = false;
      }
    });
  });

  const grossProfit = totalMarginRevenue - totalCost;
  const profitMargin = totalMarginRevenue > 0 ? (grossProfit / totalMarginRevenue) * 100 : 0;

  return NextResponse.json({
    salesByHour: Object.values(salesByHour),
    salesByDay,
    salesByMonth,
    salesByProduct: Object.values(productPerformanceMap).sort((a, b) => b.revenue - a.revenue),
    salesByCategory: Object.values(categoryPerformanceMap).sort((a, b) => b.revenue - a.revenue),
    salesByCustomer: Object.values(customerPerformanceMap).sort((a, b) => b.revenue - a.revenue),
    salesByLocation: Object.values(salesByLocationMap).sort((a, b) => b.revenue - a.revenue),
    newVsReturning: {
      newCount: newCustomersCount,
      returningCount: returningCustomersCount,
      newRevenue,
      returningRevenue,
    },
    couponPerformance: Object.values(couponPerfMap),
    refundAnalysis: {
      totalRefunds: returns.length,
      refundAmount: refundTotalAmount,
      refundRate,
      topRefundedProducts: returns.map((r) => ({ product: r.productName, amount: r.refundAmount, reason: r.reason })).slice(0, 5)
    },
    abandonedCartAnalytics: {
      totalCarts,
      abandonedValue,
      recoveredCount: recoveredCarts.length,
      recoveryRate,
      recoveredRevenue: recoveredValue,
      unrecoveredRevenue: abandonedValue - recoveredValue
    },
    profitAnalytics: {
      profitAvailable,
      grossRevenue: totalMarginRevenue,
      productCost: totalCost,
      grossProfit,
      profitMargin
    }
  });
}
