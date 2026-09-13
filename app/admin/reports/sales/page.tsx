"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, StatCard, FilterSelect, LoadingSpinner } from "@/components/admin/Shared";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const DATE_RANGES = [
  { label: "Today", value: "today" }, { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 days", value: "7d" }, { label: "Last 30 days", value: "30d" },
  { label: "This month", value: "month" }, { label: "This year", value: "year" },
];

const PIE_COLORS = ["#212f52", "#a83a26", "#c9a84c", "#5c7a4a", "#8b7355", "#4a6fa5"];
const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending", processing: "Processing", on_hold: "On Hold",
  completed: "Completed", cancelled: "Cancelled", refunded: "Refunded", failed: "Failed",
};

function fmt(n: number) { return "₹" + Math.round(n).toLocaleString("en-IN"); }

export default function SalesReportPage() {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/reports?range=${range}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [range]);

  const ov = (data?.overview as Record<string, number>) ?? {};
  const revenueChart = (data?.revenueChart as { date: string; gross: number; orders: number }[]) ?? [];
  const ordersByStatus = data?.ordersByStatus as Record<string, number> ?? {};
  const topProducts = (data?.topProducts as { id: string; name: string; qty: number; revenue: number }[]) ?? [];
  const ordersByPayment = data?.ordersByPayment as Record<string, number> ?? {};

  const statusPieData = Object.entries(ordersByStatus).map(([k, v]) => ({ name: STATUS_LABELS[k] ?? k, value: v }));
  const paymentPieData = Object.entries(ordersByPayment).map(([k, v]) => ({ name: k.toUpperCase(), value: v }));

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <PageHeader title="Sales Report" subtitle="Revenue, orders, and performance analytics" />
        <FilterSelect value={range} onChange={setRange} options={DATE_RANGES} placeholder="" />
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Gross Revenue" value={fmt(ov.grossRevenue ?? 0)} accent="madder" sub="incl. tax & shipping" />
            <StatCard label="Net Revenue" value={fmt(ov.netRevenue ?? 0)} accent="indigo" sub="excl. tax & shipping" />
            <StatCard label="Total Tax" value={fmt(ov.totalTax ?? 0)} accent="turmeric" sub="GST collected" />
            <StatCard label="Total Discount" value={fmt(ov.totalDiscount ?? 0)} accent="green" sub="coupons + offers" />
          </div>

          {/* Revenue Chart */}
          <SectionCard title="Revenue Over Time (Daily)">
            {revenueChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={revenueChart} margin={{ left: 10, right: 20, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#a99d8030" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#a99d80" }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#a99d80" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#a99d80" }} />
                  <Tooltip contentStyle={{ background: "#fbf6ea", border: "1px solid #a99d80", borderRadius: 2, fontSize: 12 }} formatter={(v: unknown, name: unknown) => [name === "gross" ? fmt(Number(v)) : Number(v), name === "gross" ? "Revenue" : "Orders"]} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="gross" stroke="#a83a26" strokeWidth={2} dot={false} name="Revenue" />
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#212f52" strokeWidth={1.5} dot={false} name="Orders" strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="py-12 text-center text-stone">No revenue data for the selected period.</p>}
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders by Status */}
            <SectionCard title="Orders by Status">
              {statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                      {statusPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#fbf6ea", border: "1px solid #a99d80", borderRadius: 2, fontSize: 12 }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-stone py-8">No data</p>}
            </SectionCard>

            {/* Orders by Payment Method */}
            <SectionCard title="Orders by Payment Method">
              {paymentPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={paymentPieData} margin={{ left: 0, right: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#a99d8030" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#a99d80" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#a99d80" }} />
                    <Tooltip contentStyle={{ background: "#fbf6ea", border: "1px solid #a99d80", borderRadius: 2, fontSize: 12 }} />
                    <Bar dataKey="value" fill="#212f52" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-stone py-8">No data</p>}
            </SectionCard>
          </div>

          {/* Top Products */}
          <SectionCard title="Top Products by Revenue">
            {topProducts.length === 0 ? <p className="text-center text-stone py-8">No sales data</p> : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-stone/20 bg-paper/50">
                  {["#", "Product", "Units Sold", "Revenue"].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>)}
                </tr></thead>
                <tbody>
                  {topProducts.slice(0, 10).map((p, i) => (
                    <tr key={p.id} className="border-b border-stone/10 last:border-0">
                      <td className="px-4 py-3 text-stone font-bold text-sm">#{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-ink">{p.name}</td>
                      <td className="px-4 py-3">{p.qty}</td>
                      <td className="px-4 py-3 font-semibold">{fmt(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
        </>
      )}
    </PageShell>
  );
}
