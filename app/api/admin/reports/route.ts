import { NextResponse } from "next/server";
import { readCollection, readSettings } from "@/lib/db/store";
import type { Order, Product, Customer, Coupon } from "@/lib/db/types";

interface GoalData {
  monthly: number;
  yearly: number;
}

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

function parseDate(d?: string | null): Date {
  if (!d) return new Date(0);
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function filterByDateRange(orders: Order[], range: string, from?: string, to?: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return orders.filter((o) => {
    if (!o.createdAt) return false;
    const d = parseDate(o.createdAt);
    if (d.getTime() === 0) return false;

    switch (range) {
      case "today": return d >= today;
      case "yesterday": {
        const y = new Date(today); y.setDate(y.getDate() - 1);
        return d >= y && d < today;
      }
      case "7d": { const s = new Date(today); s.setDate(s.getDate() - 7); return d >= s; }
      case "30d": { const s = new Date(today); s.setDate(s.getDate() - 30); return d >= s; }
      case "month": return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      case "year": return d.getFullYear() === now.getFullYear();
      case "custom": {
        const s = from ? parseDate(from) : new Date(0);
        const e = to ? parseDate(to + "T23:59:59Z") : new Date();
        return d >= s && d <= e;
      }
      default: return true;
    }
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? "30d";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const allOrders = readCollection<Order>("orders");
  const products = readCollection<Product>("products");
  const customers = readCollection<Customer>("customers");
  const returns = readCollection<ReturnRequest>("returns");
  const reviews = readCollection<ReviewItem>("reviews");
  const abandonedCarts = readCollection<AbandonedCart>("abandoned-carts");

  const filteredOrders = filterByDateRange(allOrders, range, from, to);
  const paidOrders = filteredOrders.filter((o) => o.paymentStatus === "paid" || o.paymentStatus === "partially_paid");

  // ── Revenue ──────────────────────────────────────────────
  const grossRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const netRevenue = paidOrders.reduce((sum, o) => sum + (o.total - o.tax - o.shippingCost), 0);
  const totalOrders = filteredOrders.length;
  const completedOrders = filteredOrders.filter((o) => o.status === "completed").length;
  const averageOrderValue = paidOrders.length ? grossRevenue / paidOrders.length : 0;
  const totalTax = paidOrders.reduce((sum, o) => sum + o.tax, 0);
  const totalDiscount = paidOrders.reduce((sum, o) => sum + o.couponDiscount + o.discount, 0);
  const totalShipping = paidOrders.reduce((sum, o) => sum + o.shippingCost, 0);

  // ── Orders by status ─────────────────────────────────────
  const ordersByStatus: Record<string, number> = {};
  filteredOrders.forEach((o) => { ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1; });

  // ── Orders by payment method ─────────────────────────────
  const ordersByPayment: Record<string, number> = {};
  filteredOrders.forEach((o) => { ordersByPayment[o.paymentMethod] = (ordersByPayment[o.paymentMethod] ?? 0) + 1; });

  // ── Product stats ─────────────────────────────────────────
  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
  paidOrders.forEach((o) => {
    o.items.forEach((item) => {
      if (!productSales[item.productId]) productSales[item.productId] = { name: item.name, qty: 0, revenue: 0 };
      productSales[item.productId].qty += item.quantity;
      productSales[item.productId].revenue += item.total;
    });
  });
  const topProducts = Object.entries(productSales)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  const totalProductsSold = Object.values(productSales).reduce((s, v) => s + v.qty, 0);

  // ── Category stats ────────────────────────────────────────
  const categorySales: Record<string, { name: string; revenue: number }> = {};
  paidOrders.forEach((o) => {
    o.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) return;
      const key = prod.categoryId;
      if (!categorySales[key]) categorySales[key] = { name: prod.categoryId, revenue: 0 };
      categorySales[key].revenue += item.total;
    });
  });

  // ── Customer stats ────────────────────────────────────────
  const totalCustomers = customers.length;
  const newCustomers = customers.filter((c) => {
    if (!c.registeredAt) return false;
    const d = parseDate(c.registeredAt);
    if (d.getTime() === 0) return false;
    return filterByDateRange([{ createdAt: d.toISOString() } as Order], range, from, to).length > 0;
  }).length;

  // ── Revenue chart data (daily) ────────────────────────────
  const revenueByDay: Record<string, { date: string; gross: number; orders: number }> = {};
  paidOrders.forEach((o) => {
    if (!o.createdAt) return;
    const d = parseDate(o.createdAt);
    if (d.getTime() === 0) return;
    const day = d.toISOString().split("T")[0];
    if (!revenueByDay[day]) revenueByDay[day] = { date: day, gross: 0, orders: 0 };
    revenueByDay[day].gross += o.total;
    revenueByDay[day].orders += 1;
  });
  const revenueChart = Object.values(revenueByDay).sort((a, b) => a.date.localeCompare(b.date));

  // ── Inventory alerts ─────────────────────────────────────
  const lowStock = products.filter((p) => p.stockStatus === "low_stock").length;
  const outOfStock = products.filter((p) => p.stockStatus === "out_of_stock").length;
  const totalProducts = products.length;

  // ── Pending orders ────────────────────────────────────────
  const pendingOrders = allOrders.filter((o) => o.status === "pending_payment" || o.status === "on_hold").length;

  // ── Today vs Yesterday Comparison ─────────────────────────
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const todayOrders = allOrders.filter((o) => parseDate(o.createdAt) >= todayStart);
  const yesterdayOrders = allOrders.filter((o) => {
    const d = parseDate(o.createdAt);
    return d >= yesterdayStart && d < todayStart;
  });

  const todayPaid = todayOrders.filter((o) => o.paymentStatus === "paid" || o.paymentStatus === "partially_paid");
  const yesterdayPaid = yesterdayOrders.filter((o) => o.paymentStatus === "paid" || o.paymentStatus === "partially_paid");

  const todayRevenue = todayPaid.reduce((s, o) => s + o.total, 0);
  const yesterdayRevenue = yesterdayPaid.reduce((s, o) => s + o.total, 0);

  const todayOrdersCount = todayOrders.length;
  const yesterdayOrdersCount = yesterdayOrders.length;

  const todaySold = todayPaid.reduce((s, o) => s + o.items.reduce((sum, item) => sum + item.quantity, 0), 0);
  const yesterdaySold = yesterdayPaid.reduce((s, o) => s + o.items.reduce((sum, item) => sum + item.quantity, 0), 0);

  const todayAOV = todayPaid.length ? todayRevenue / todayPaid.length : 0;
  const yesterdayAOV = yesterdayPaid.length ? yesterdayRevenue / yesterdayPaid.length : 0;

  // ── This Month vs Last Month Comparison ────────────────────
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const thisMonthOrders = allOrders.filter((o) => parseDate(o.createdAt) >= thisMonthStart);
  const lastMonthOrders = allOrders.filter((o) => {
    const d = parseDate(o.createdAt);
    return d >= lastMonthStart && d <= lastMonthEnd;
  });

  const thisMonthPaid = thisMonthOrders.filter((o) => o.paymentStatus === "paid" || o.paymentStatus === "partially_paid");
  const lastMonthPaid = lastMonthOrders.filter((o) => o.paymentStatus === "paid" || o.paymentStatus === "partially_paid");

  const thisMonthRevenue = thisMonthPaid.reduce((s, o) => s + o.total, 0);
  const lastMonthRevenue = lastMonthPaid.reduce((s, o) => s + o.total, 0);

  const thisMonthOrdersCount = thisMonthOrders.length;
  const lastMonthOrdersCount = lastMonthOrders.length;

  const thisMonthSold = thisMonthPaid.reduce((s, o) => s + o.items.reduce((sum, item) => sum + item.quantity, 0), 0);
  const lastMonthSold = lastMonthPaid.reduce((s, o) => s + o.items.reduce((sum, item) => sum + item.quantity, 0), 0);

  const thisMonthAOV = thisMonthPaid.length ? thisMonthRevenue / thisMonthPaid.length : 0;
  const lastMonthAOV = lastMonthPaid.length ? lastMonthRevenue / lastMonthPaid.length : 0;

  // ── Goals data ────────────────────────────────────────────
  const goals = readSettings<GoalData>("goals") || { monthly: 500000, yearly: 6000000 };

  // ── Pending Action Summary counts ─────────────────────────
  const pendingActions = {
    awaitingProcessing: allOrders.filter((o) => o.status === "pending_payment" || o.status === "processing" || o.status === "on_hold").length,
    failedPayments: allOrders.filter((o) => o.paymentStatus === "failed").length,
    pendingRefunds: returns.filter((r) => r.status === "requested" || r.status === "under_review").length,
    lowStock,
    outOfStock,
    pendingReviews: reviews.filter((r) => r.status === "pending").length,
    abandonedCarts: abandonedCarts.filter((c) => c.status === "abandoned" || c.status === "reminder_sent").length
  };

  return NextResponse.json({
    overview: {
      grossRevenue,
      netRevenue,
      totalOrders,
      completedOrders,
      averageOrderValue,
      totalTax,
      totalDiscount,
      totalShipping,
      totalProductsSold,
      totalCustomers,
      newCustomers,
      pendingOrders,
      lowStock,
      outOfStock,
      totalProducts,
    },
    todayCompare: {
      revenue: todayRevenue,
      prevRevenue: yesterdayRevenue,
      orders: todayOrdersCount,
      prevOrders: yesterdayOrdersCount,
      sold: todaySold,
      prevSold: yesterdaySold,
      aov: todayAOV,
      prevAov: yesterdayAOV,
    },
    monthCompare: {
      revenue: thisMonthRevenue,
      prevRevenue: lastMonthRevenue,
      orders: thisMonthOrdersCount,
      prevOrders: lastMonthOrdersCount,
      sold: thisMonthSold,
      prevSold: lastMonthSold,
      aov: thisMonthAOV,
      prevAov: lastMonthAOV,
      customers: totalCustomers, // static or filtered
    },
    goals,
    pendingActions,
    ordersByStatus,
    ordersByPayment,
    topProducts,
    categorySales: Object.values(categorySales),
    revenueChart,
    range,
  });
}
