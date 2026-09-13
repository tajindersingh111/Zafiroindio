"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, DataTable, Column } from "@/components/admin/Shared";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface AdvancedAnalyticsData {
  salesByHour: { hour: number; revenue: number; orders: number }[];
  salesByDay: { day: string; revenue: number; orders: number }[];
  salesByMonth: { month: string; revenue: number; orders: number; unitsSold: number }[];
  salesByProduct: { id: string; name: string; unitsSold: number; revenue: number; orders: number; refunds: number; netRevenue: number }[];
  salesByCategory: { category: string; revenue: number; orders: number; unitsSold: number }[];
  salesByCustomer: { customerName: string; email: string; orders: number; revenue: number; lastPurchase: string }[];
  salesByLocation: { state: string; country: string; orders: number; revenue: number; customers: number }[];
  newVsReturning: { newCount: number; returningCount: number; newRevenue: number; returningRevenue: number };
  couponPerformance: { code: string; usage: number; discount: number; revenue: number }[];
  refundAnalysis: { totalRefunds: number; refundAmount: number; refundRate: number; topRefundedProducts: any[] };
  abandonedCartAnalytics: { totalCarts: number; abandonedValue: number; recoveredCount: number; recoveryRate: number; recoveredRevenue: number; unrecoveredRevenue: number };
  profitAnalytics: { profitAvailable: boolean; grossRevenue: number; productCost: number; grossProfit: number; profitMargin: number };
}

const PIE_COLORS = ["#212f52", "#a83a26", "#cf9a2e", "#8c7a5a", "#8b7355"];

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }

export default function AdvancedAnalyticsPage() {
  const [data, setData] = useState<AdvancedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sales" | "products" | "customers" | "operations">("sales");

  useEffect(() => {
    fetch("/api/admin/analytics/advanced")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading || !data) return <PageShell><LoadingSpinner /></PageShell>;

  const newVsRetData = [
    { name: "New Customers", value: data.newVsReturning.newRevenue },
    { name: "Returning Customers", value: data.newVsReturning.returningRevenue },
  ];

  const productCols: Column<any>[] = [
    { key: "name", label: "Product", render: (p) => <p className="font-semibold text-indigo">{p.name}</p> },
    { key: "unitsSold", label: "Units Sold", render: (p) => <span className="font-bold">{p.unitsSold}</span> },
    { key: "revenue", label: "Gross Revenue", render: (p) => fmt(p.revenue) },
    { key: "refunds", label: "Refunds", render: (p) => <span className="text-madder font-semibold">{fmt(p.refunds)}</span> },
    { key: "netRevenue", label: "Net Revenue", render: (p) => <span className="font-bold text-green-700">{fmt(p.netRevenue)}</span> },
  ];

  const categoryCols: Column<any>[] = [
    { key: "category", label: "Category", render: (c) => <span className="font-semibold capitalize">{c.category.replace(/-/g, " ")}</span> },
    { key: "unitsSold", label: "Units Sold" },
    { key: "orders", label: "Orders" },
    { key: "revenue", label: "Revenue", render: (c) => <span className="font-bold">{fmt(c.revenue)}</span> },
  ];

  const couponCols: Column<any>[] = [
    { key: "code", label: "Coupon Code", render: (c) => <span className="font-mono font-bold text-indigo">{c.code}</span> },
    { key: "usage", label: "Usage Count", render: (c) => <span className="font-semibold">{c.usage} times</span> },
    { key: "discount", label: "Total Discount Given", render: (c) => fmt(c.discount) },
    { key: "revenue", label: "Generated Revenue", render: (c) => <span className="font-bold text-green-700">{fmt(c.revenue)}</span> },
  ];

  return (
    <PageShell>
      <PageHeader title="Advanced Analytics & Intelligence" subtitle="Deep business intelligence insights and e-commerce growth metrics." />

      {/* Tabs */}
      <div className="flex border-b border-stone/20 mb-6">
        {[
          { id: "sales", label: "Sales & Profit" },
          { id: "products", label: "Products & Categories" },
          { id: "customers", label: "Customer Insights" },
          { id: "operations", label: "Refunds & Carts" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 -mb-[2px] transition-all ${
              activeTab === t.id ? "border-indigo text-indigo" : "border-transparent text-stone hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "sales" && (
        <div className="space-y-6">
          {/* Profit Section */}
          <SectionCard title="Profit & Margin Analysis">
            {data.profitAnalytics.profitAvailable ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-paper/30 p-4 rounded-sm border border-stone/20">
                  <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Gross Revenue</p>
                  <p className="text-xl font-display font-semibold text-ink mt-1">{fmt(data.profitAnalytics.grossRevenue)}</p>
                </div>
                <div className="bg-paper/30 p-4 rounded-sm border border-stone/20">
                  <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Product Cost</p>
                  <p className="text-xl font-display font-semibold text-ink mt-1">{fmt(data.profitAnalytics.productCost)}</p>
                </div>
                <div className="bg-paper/30 p-4 rounded-sm border border-stone/20">
                  <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Gross Profit</p>
                  <p className="text-xl font-display font-semibold text-green-800 mt-1">{fmt(data.profitAnalytics.grossProfit)}</p>
                </div>
                <div className="bg-paper/30 p-4 rounded-sm border border-stone/20">
                  <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Profit Margin</p>
                  <p className="text-xl font-display font-semibold text-indigo mt-1">{data.profitAnalytics.profitMargin.toFixed(1)}%</p>
                </div>
              </div>
            ) : (
              <div className="bg-turmeric/5 border border-turmeric/20 p-4 rounded-sm">
                <p className="text-sm font-semibold text-[#8a6519]">Profit data requires product cost information.</p>
                <p className="text-xs text-stone mt-1">Please configure cost price values for all products to view profit & margins.</p>
              </div>
            )}
          </SectionCard>

          {/* Sales by Hour & Weekday */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Sales by Hour of Day">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.salesByHour}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#a99d8020" />
                    <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `₹${v/1000}k`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: unknown) => [fmt(Number(v)), "Revenue"]} />
                    <Bar dataKey="revenue" fill="#212f52" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Sales by Day of Week">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.salesByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#a99d8020" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `₹${v/1000}k`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: unknown) => [fmt(Number(v)), "Revenue"]} />
                    <Bar dataKey="revenue" fill="#a83a26" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          {/* Sales by Month */}
          <SectionCard title="Monthly Sales Velocity & Volume">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.salesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#a99d8020" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip formatter={(v: unknown) => [fmt(Number(v)), "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke="#cf9a2e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === "products" && (
        <div className="space-y-6">
          <SectionCard title="Sales Performance by Product">
            <DataTable columns={productPerformanceCols(data)} rows={data.salesByProduct} emptyMessage="No product sales data." />
          </SectionCard>

          <SectionCard title="Sales Performance by Category">
            <DataTable columns={categoryCols} rows={data.salesByCategory} emptyMessage="No category sales data." />
          </SectionCard>
        </div>
      )}

      {activeTab === "customers" && (
        <div className="space-y-6">
          {/* New vs Returning chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Revenue Share: New vs Returning Customers">
              <div className="h-64 flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={newVsRetData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={4}>
                      {newVsRetData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => [fmt(Number(v)), "Revenue"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Top Location Breakdown">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone/20 bg-paper/50">
                    {["State", "Orders Placed", "Total Revenue", "Unique Customers"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.salesByLocation.map((loc) => (
                    <tr key={loc.state} className="border-b border-stone/10 last:border-0">
                      <td className="px-4 py-3 font-semibold text-ink capitalize">{loc.state.replace(/-/g, " ")}</td>
                      <td className="px-4 py-3">{loc.orders} orders</td>
                      <td className="px-4 py-3 font-bold text-indigo">{fmt(loc.revenue)}</td>
                      <td className="px-4 py-3 text-stone">{loc.customers} buyers</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          </div>

          <SectionCard title="Highest-Spending Customers">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone/20 bg-paper/50">
                  {["Customer", "Orders", "Lifetime Spend", "Last Purchase Date"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.salesByCustomer.slice(0, 10).map((c) => (
                  <tr key={c.email} className="border-b border-stone/10 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{c.customerName}</p>
                      <p className="text-xs text-stone">{c.email}</p>
                    </td>
                    <td className="px-4 py-3">{c.orders} orders</td>
                    <td className="px-4 py-3 font-bold text-green-800">{fmt(c.revenue)}</td>
                    <td className="px-4 py-3 text-xs text-stone">{new Date(c.lastPurchase).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>

          <SectionCard title="Coupon Campaign Performance">
            <DataTable columns={couponCols} rows={data.couponPerformance} emptyMessage="No coupon campaigns active." />
          </SectionCard>
        </div>
      )}

      {activeTab === "operations" && (
        <div className="space-y-6">
          {/* Refund Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-cream-card border border-stone/20 p-5 rounded-sm">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider mb-1">Total Refunds Processed</p>
              <p className="text-2xl font-display font-semibold text-madder">{data.refundAnalysis.totalRefunds} refunds</p>
            </div>
            <div className="bg-cream-card border border-stone/20 p-5 rounded-sm">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider mb-1">Total Refund Amount</p>
              <p className="text-2xl font-display font-semibold text-madder">{fmt(data.refundAnalysis.refundAmount)}</p>
            </div>
            <div className="bg-cream-card border border-stone/20 p-5 rounded-sm">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider mb-1">Refund Rate (%)</p>
              <p className="text-2xl font-display font-semibold text-ink">{data.refundAnalysis.refundRate.toFixed(1)}%</p>
            </div>
          </div>

          {/* Carts stats */}
          <SectionCard title="Abandoned Cart Recovery Intelligence">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 border border-stone/20 bg-paper/20 rounded-sm">
                <p className="text-[9px] text-stone font-semibold uppercase">Abandoned Carts</p>
                <p className="text-lg font-bold text-ink">{data.abandonedCartAnalytics.totalCarts}</p>
              </div>
              <div className="p-3 border border-stone/20 bg-paper/20 rounded-sm">
                <p className="text-[9px] text-stone font-semibold uppercase">Total Cart Loss</p>
                <p className="text-lg font-bold text-ink">{fmt(data.abandonedCartAnalytics.abandonedValue)}</p>
              </div>
              <div className="p-3 border border-stone/20 bg-paper/20 rounded-sm">
                <p className="text-[9px] text-stone font-semibold uppercase">Recovered Revenue</p>
                <p className="text-lg font-bold text-green-700">{fmt(data.abandonedCartAnalytics.recoveredRevenue)}</p>
              </div>
              <div className="p-3 border border-stone/20 bg-paper/20 rounded-sm">
                <p className="text-[9px] text-stone font-semibold uppercase">Recovery Rate (%)</p>
                <p className="text-lg font-bold text-indigo">{data.abandonedCartAnalytics.recoveryRate.toFixed(1)}%</p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}
    </PageShell>
  );
}

function productPerformanceCols(data: AdvancedAnalyticsData): Column<any>[] {
  return [
    { key: "name", label: "Product", render: (p) => <p className="font-semibold text-indigo">{p.name}</p> },
    { key: "unitsSold", label: "Units Sold", render: (p) => <span className="font-bold">{p.unitsSold}</span> },
    { key: "revenue", label: "Gross Revenue", render: (p) => fmt(p.revenue) },
    { key: "refunds", label: "Refunds", render: (p) => <span className="text-madder font-semibold">{fmt(p.refunds)}</span> },
    { key: "netRevenue", label: "Net Revenue", render: (p) => <span className="font-bold text-green-700">{fmt(p.netRevenue)}</span> },
  ];
}
