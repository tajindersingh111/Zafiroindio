"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell, PageHeader, StatusBadge, SectionCard, LoadingSpinner } from "@/components/admin/Shared";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ReportData {
  overview: {
    grossRevenue: number; netRevenue: number; totalOrders: number; completedOrders: number;
    averageOrderValue: number; totalTax: number; totalDiscount: number; totalProductsSold: number;
    totalCustomers: number; newCustomers: number; pendingOrders: number;
    lowStock: number; outOfStock: number; totalProducts: number;
  };
  todayCompare: {
    revenue: number; prevRevenue: number;
    orders: number; prevOrders: number;
    sold: number; prevSold: number;
    aov: number; prevAov: number;
  };
  monthCompare: {
    revenue: number; prevRevenue: number;
    orders: number; prevOrders: number;
    sold: number; prevSold: number;
    aov: number; prevAov: number;
    customers: number;
  };
  goals: {
    monthly: number;
    yearly: number;
  };
  pendingActions: {
    awaitingProcessing: number;
    failedPayments: number;
    pendingRefunds: number;
    lowStock: number;
    outOfStock: number;
    pendingReviews: number;
    abandonedCarts: number;
  };
  revenueChart: { date: string; gross: number; orders: number }[];
}

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [goalsConfig, setGoalsConfig] = useState({ monthly: 500000, yearly: 6000000 });
  const [editingGoals, setEditingGoals] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/reports?range=30d").then((r) => r.ok ? r.json() : null),
      fetch("/api/admin/orders?pageSize=5").then((r) => r.ok ? r.json() : null),
      fetch("/api/admin/reports/insights").then((r) => r.ok ? r.json() : null),
    ]).then(([rData, oData, iData]) => {
      if (!rData || rData.error || !oData || oData.error) {
        router.push("/admin/login");
        return;
      }
      setData(rData);
      setRecentOrders(oData.orders ?? []);
      setInsights([...(iData?.sales ?? []), ...(iData?.products ?? []), ...(iData?.customers ?? [])].slice(0, 4));
      if (rData.goals) {
        setGoalsConfig(rData.goals);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      router.push("/admin/login");
    });
  }, [router]);

  async function handleUpdateGoals() {
    const res = await fetch("/api/admin/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goalsConfig),
    });
    if (res.ok) {
      setEditingGoals(false);
      const r = await fetch("/api/admin/reports?range=30d");
      const d = await r.json();
      setData(d);
    }
  }

  if (loading || !data) return <PageShell><LoadingSpinner /></PageShell>;

  // Today calculations
  const todayRevenue = data.todayCompare.revenue;
  const yesterdayRevenue = data.todayCompare.prevRevenue;
  const revDiff = todayRevenue - yesterdayRevenue;
  const revGrowth = yesterdayRevenue > 0 ? (revDiff / yesterdayRevenue) * 100 : 0;

  // Monthly target calculations
  const monthAchieved = data.monthCompare.revenue;
  const monthTarget = data.goals.monthly;
  const monthProgress = monthTarget > 0 ? (monthAchieved / monthTarget) * 100 : 0;
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - new Date().getDate();
  const remainingTarget = Math.max(0, monthTarget - monthAchieved);
  const requiredDaily = daysRemaining > 0 ? remainingTarget / daysRemaining : remainingTarget;

  return (
    <PageShell>
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#12192c] via-[#1a2544] to-[#12192c] rounded-sm p-6 text-paper border border-paper/10 shadow-md mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-turmeric font-semibold">
                Jaipur HQ • Live Operations
              </span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl text-paper font-semibold tracking-tight">
              Executive Store Dashboard
            </h1>
            <p className="text-xs text-paper/60 mt-1">
              Real-time sales velocity, fulfillment action items & inventory health metrics.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/admin/products/new"
              style={{ color: "#12192c", background: "#f4ecd8" }}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm hover:opacity-95 transition-opacity shadow-sm flex items-center gap-1.5"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
              Add Product
            </Link>
            <Link
              href="/admin/intelligence"
              style={{ color: "#ffffff", background: "rgba(255, 255, 255, 0.12)", border: "1px solid rgba(255, 255, 255, 0.2)" }}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-white/20 transition-all flex items-center gap-1.5"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Zafiro AI
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Today's Revenue */}
        <div className="bg-cream-card border border-stone/25 border-l-4 border-l-emerald-600 p-5 rounded-sm shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-stone uppercase tracking-widest">Today's Revenue</p>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${revGrowth >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
              {revGrowth >= 0 ? "↑" : "↓"} {Math.abs(revGrowth).toFixed(1)}%
            </span>
          </div>
          <p className="text-2xl font-serif font-bold text-ink">{fmt(todayRevenue)}</p>
          <p className="text-xs text-stone mt-2 font-medium">Yesterday: {fmt(yesterdayRevenue)}</p>
        </div>

        {/* Today's Orders */}
        <div className="bg-cream-card border border-stone/25 border-l-4 border-l-indigo-600 p-5 rounded-sm shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-stone uppercase tracking-widest">Today's Orders</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo/10 text-indigo">
              30d Velocity
            </span>
          </div>
          <p className="text-2xl font-serif font-bold text-ink">{data.todayCompare.orders} orders</p>
          <p className="text-xs text-stone mt-2 font-medium">Yesterday: {data.todayCompare.prevOrders} orders</p>
        </div>

        {/* Units Sold */}
        <div className="bg-cream-card border border-stone/25 border-l-4 border-l-amber-600 p-5 rounded-sm shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-stone uppercase tracking-widest">Products Sold</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
              {data.overview.totalProductsSold} Total 30d
            </span>
          </div>
          <p className="text-2xl font-serif font-bold text-ink">{data.todayCompare.sold} units</p>
          <p className="text-xs text-stone mt-2 font-medium">Yesterday: {data.todayCompare.prevSold} units</p>
        </div>

        {/* Today's AOV */}
        <div className="bg-cream-card border border-stone/25 border-l-4 border-l-rose-600 p-5 rounded-sm shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-stone uppercase tracking-widest">Average Order Value</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900">
              AOV Target
            </span>
          </div>
          <p className="text-2xl font-serif font-bold text-ink">{fmt(data.todayCompare.aov)}</p>
          <p className="text-xs text-stone mt-2 font-medium">Yesterday AOV: {fmt(data.todayCompare.prevAov)}</p>
        </div>
      </div>

      {/* Target Progress & Conversion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Goals widget */}
        <SectionCard
          title="Monthly Revenue Progress"
          action={
            <button onClick={() => setEditingGoals(!editingGoals)} className="text-xs text-indigo hover:underline font-bold cursor-pointer">
              {editingGoals ? "Cancel" : "Edit Goal →"}
            </button>
          }
          className="lg:col-span-2"
        >
          {editingGoals ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone mb-1.5">Monthly Target (₹)</label>
                  <input
                    type="number"
                    value={goalsConfig.monthly}
                    onChange={(e) => setGoalsConfig({ ...goalsConfig, monthly: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-stone/40 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder rounded-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone mb-1.5">Yearly Target (₹)</label>
                  <input
                    type="number"
                    value={goalsConfig.yearly}
                    onChange={(e) => setGoalsConfig({ ...goalsConfig, yearly: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-stone/40 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder rounded-sm font-mono"
                  />
                </div>
              </div>
              <button
                onClick={handleUpdateGoals}
                style={{ color: "#ffffff" }}
                className="bg-indigo px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider hover:opacity-90 cursor-pointer shadow-xs"
              >
                Save Target
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-stone font-bold uppercase tracking-widest">
                    Achievement Rate ({monthProgress.toFixed(1)}%)
                  </p>
                  <p className="text-2xl font-serif font-bold text-ink mt-1">{fmt(monthAchieved)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-stone font-bold uppercase tracking-widest">Monthly Goal</p>
                  <p className="text-base font-bold text-indigo font-mono mt-0.5">{fmt(monthTarget)}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-stone/15 h-3.5 overflow-hidden rounded-full p-0.5 border border-stone/20">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, monthProgress)}%`,
                    background: "linear-gradient(90deg, #161f39 0%, #dca134 100%)",
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 text-center pt-2">
                <div className="bg-paper border border-stone/20 p-3 rounded-sm">
                  <p className="text-[9px] text-stone uppercase tracking-widest font-bold">Remaining Target</p>
                  <p className="text-sm font-bold text-ink mt-1">{fmt(remainingTarget)}</p>
                </div>
                <div className="bg-paper border border-stone/20 p-3 rounded-sm">
                  <p className="text-[9px] text-stone uppercase tracking-widest font-bold">Days Left</p>
                  <p className="text-sm font-bold text-ink mt-1">{daysRemaining} days</p>
                </div>
                <div className="bg-paper border border-stone/20 p-3 rounded-sm">
                  <p className="text-[9px] text-stone uppercase tracking-widest font-bold">Daily Run Rate Needed</p>
                  <p className="text-sm font-bold text-indigo mt-1">{fmt(requiredDaily)}</p>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Conversion Rate Card */}
        <SectionCard title="Store Visitors & Conversion">
          <div className="flex flex-col justify-between h-full space-y-4">
            <div>
              <p className="text-[10px] text-stone font-bold uppercase tracking-widest">Conversion Rate</p>
              <p className="text-3xl font-serif font-bold mt-2 text-ink">3.4%</p>
              <p className="text-xs text-emerald-700 font-bold mt-1">↑ 0.6% vs benchmark</p>
            </div>
            <div className="bg-indigo/5 border border-indigo/15 p-3 rounded-sm">
              <p className="text-xs text-indigo font-bold">Active Shopping Session Trackers</p>
              <p className="text-[11px] text-stone mt-1 leading-relaxed">
                Cart abandonments automatically sync with marketing workflow recovery sequences.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Needs Attention & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Needs Attention Panel */}
        <SectionCard title="Operational Action Items" className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link href="/admin/orders?status=processing" className="flex items-center justify-between p-3.5 border border-stone/20 bg-paper rounded-sm hover:border-indigo transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo" />
                <span className="text-xs font-semibold text-ink group-hover:text-indigo">Orders Awaiting Processing</span>
              </div>
              <span className="px-2.5 py-0.5 bg-indigo/10 text-indigo text-xs font-bold rounded-full">{data.pendingActions.awaitingProcessing}</span>
            </Link>

            <Link href="/admin/orders?paymentStatus=failed" className="flex items-center justify-between p-3.5 border border-stone/20 bg-paper rounded-sm hover:border-madder transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-madder" />
                <span className="text-xs font-semibold text-ink group-hover:text-madder">Failed Payment Orders</span>
              </div>
              <span className="px-2.5 py-0.5 bg-madder/15 text-madder text-xs font-bold rounded-full">{data.pendingActions.failedPayments}</span>
            </Link>

            <Link href="/admin/returns" className="flex items-center justify-between p-3.5 border border-stone/20 bg-paper rounded-sm hover:border-amber-600 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-600" />
                <span className="text-xs font-semibold text-ink group-hover:text-amber-800">Pending Return Requests</span>
              </div>
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-xs font-bold rounded-full">{data.pendingActions.pendingRefunds}</span>
            </Link>

            <Link href="/admin/products/inventory?filter=low_stock" className="flex items-center justify-between p-3.5 border border-stone/20 bg-paper rounded-sm hover:border-amber-600 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-600" />
                <span className="text-xs font-semibold text-ink group-hover:text-amber-800">Low Stock SKUs</span>
              </div>
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-xs font-bold rounded-full">{data.pendingActions.lowStock}</span>
            </Link>

            <Link href="/admin/products/inventory?filter=out_of_stock" className="flex items-center justify-between p-3.5 border border-stone/20 bg-paper rounded-sm hover:border-madder transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-madder" />
                <span className="text-xs font-semibold text-ink group-hover:text-madder">Out of Stock SKUs</span>
              </div>
              <span className="px-2.5 py-0.5 bg-madder/15 text-madder text-xs font-bold rounded-full">{data.pendingActions.outOfStock}</span>
            </Link>

            <Link href="/admin/reviews" className="flex items-center justify-between p-3.5 border border-stone/20 bg-paper rounded-sm hover:border-indigo transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo" />
                <span className="text-xs font-semibold text-ink group-hover:text-indigo">Customer Reviews Moderation</span>
              </div>
              <span className="px-2.5 py-0.5 bg-indigo/10 text-indigo text-xs font-bold rounded-full">{data.pendingActions.pendingReviews}</span>
            </Link>

            <Link href="/admin/abandoned-carts" className="flex items-center justify-between p-3.5 border border-stone/20 bg-paper rounded-sm hover:border-stone md:col-span-2 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-stone" />
                <span className="text-xs font-semibold text-ink group-hover:text-stone-800">Abandoned Carts (Awaiting Recovery)</span>
              </div>
              <span className="px-2.5 py-0.5 bg-stone/20 text-stone text-xs font-bold rounded-full">{data.pendingActions.abandonedCarts}</span>
            </Link>
          </div>
        </SectionCard>

        {/* Dynamic Insights Summary */}
        <SectionCard title="Zafiro Intelligence" action={<Link href="/admin/intelligence" className="text-xs text-indigo hover:underline font-bold">View all →</Link>}>
          <div className="space-y-3">
            {insights.map((ins, idx) => (
              <div key={idx} className="flex gap-2.5 items-start text-xs text-ink leading-relaxed p-2.5 rounded-sm bg-paper border border-stone/15">
                <span className="text-turmeric shrink-0 font-bold">•</span>
                <span>{ins}</span>
              </div>
            ))}
            {insights.length === 0 && <p className="text-stone text-xs">No insights generated yet.</p>}
          </div>
        </SectionCard>
      </div>

      {/* Revenue Over Time Chart */}
      <SectionCard title="Revenue Trend Curve (Last 30 Days)">
        <div className="h-72 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.revenueChart} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a83a26" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a83a26" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#a99d8025" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8c8273" }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: "#8c8273" }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#fffdf9", border: "1px solid #a99d80", borderRadius: 4, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} formatter={(v: unknown) => [`₹${Number(v).toLocaleString("en-IN")}`, "Gross Revenue"]} />
              <Area type="monotone" dataKey="gross" stroke="#a83a26" strokeWidth={2.5} fillOpacity={1} fill="url(#colorGross)" name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Recent Orders Table */}
      <SectionCard
        title="Recent Store Orders"
        action={<Link href="/admin/orders" className="text-xs text-madder hover:underline font-bold">View all orders →</Link>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone/20 bg-paper/60">
                {["Order #", "Customer", "Amount", "Method", "Status", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/80 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-indigo font-bold">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-ink font-medium">{o.customerName}</td>
                  <td className="px-4 py-3 font-serif font-bold text-ink">{fmt(o.total)}</td>
                  <td className="px-4 py-3 text-stone text-xs uppercase font-mono">{o.paymentMethod}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="text-xs text-indigo hover:underline font-bold">Manage →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Quick Operational Shortcuts */}
      <SectionCard title="Quick Operational Shortcuts">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[
            { label: "Add Product", href: "/admin/products/new", color: "bg-indigo/10 text-indigo hover:bg-indigo/20 border border-indigo/20" },
            { label: "Manage Orders", href: "/admin/orders", color: "bg-madder/10 text-madder hover:bg-madder/20 border border-madder/20" },
            { label: "Coupons", href: "/admin/coupons", color: "bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300" },
            { label: "Inventory SKUs", href: "/admin/products/inventory", color: "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300" },
            { label: "Customers", href: "/admin/customers", color: "bg-stone/15 text-stone-900 hover:bg-stone/25 border border-stone/30" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className={`flex items-center justify-center py-3.5 rounded-sm text-xs font-bold uppercase tracking-wider text-center transition-all ${a.color}`}>
              {a.label}
            </Link>
          ))}
        </div>
      </SectionCard>
    </PageShell>
  );
}
