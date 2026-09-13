"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";
import { PageShell, PageHeader, StatCard, SectionCard, FilterSelect, LoadingSpinner } from "@/components/admin/Shared";

const DATE_RANGES = [
  { label: "Last 7 days", value: "7d" }, { label: "Last 30 days", value: "30d" },
  { label: "This month", value: "month" }, { label: "This year", value: "year" },
];
const PIE_COLORS = ["#212f52", "#a83a26", "#cf9a2e", "#5c7a4a", "#8b7355"];

export default function AnalyticsPage() {
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

  const statusPieData = Object.entries(ordersByStatus).map(([k, v]) => ({ name: k.replace(/_/g, " "), value: v }));

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <PageHeader title="Analytics" subtitle="Store performance overview" />
        <FilterSelect value={range} onChange={setRange} options={DATE_RANGES} placeholder="" />
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Gross Revenue" value={`₹${((ov.grossRevenue ?? 0) / 1000).toFixed(1)}k`} accent="madder" trend={{ value: 12 }} />
            <StatCard label="Net Revenue" value={`₹${((ov.netRevenue ?? 0) / 1000).toFixed(1)}k`} accent="indigo" />
            <StatCard label="Total Orders" value={String(ov.totalOrders ?? 0)} accent="turmeric" trend={{ value: 8 }} />
            <StatCard label="Customers" value={String(ov.totalCustomers ?? 0)} accent="green" trend={{ value: 5 }} />
          </div>

          <SectionCard title="Revenue Over Time">
            {revenueChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueChart} margin={{ left: 10, right: 20, top: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#a99d8030" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#a99d80" }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "#a99d80" }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "#fbf6ea", border: "1px solid #a99d80", borderRadius: 2, fontSize: 12 }} formatter={(v: unknown) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]} />
                  <Legend />
                  <Bar dataKey="gross" name="Revenue" fill="#212f52" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="py-10 text-center text-stone">No data for this period</p>}
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            <SectionCard title="Top Products">
              <div className="space-y-3">
                {topProducts.slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-stone w-5">#{i + 1}</span>
                    <span className="flex-1 text-sm text-ink truncate">{p.name}</span>
                    <span className="text-sm font-semibold">₹{p.revenue.toLocaleString("en-IN")}</span>
                  </div>
                ))}
                {topProducts.length === 0 && <p className="text-center text-stone py-4">No sales data</p>}
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </PageShell>
  );
}
