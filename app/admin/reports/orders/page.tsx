"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, FilterSelect, LoadingSpinner, StatusBadge } from "@/components/admin/Shared";

const DATE_RANGES = [
  { label: "Last 7 days", value: "7d" }, { label: "Last 30 days", value: "30d" },
  { label: "This month", value: "month" }, { label: "This year", value: "year" },
];

interface Order {
  id: string; orderNumber: string; customerName: string; total: number;
  status: string; createdAt: string;
}

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }

export default function OrdersReportPage() {
  const [range, setRange] = useState("30d");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/orders?pageSize=100").then((r) => r.json()).then((d) => {
      setOrders(d.orders ?? []);
      setLoading(false);
    });
  }, [range]);

  const byStatus: Record<string, number> = {};
  orders.forEach((o) => { byStatus[o.status] = (byStatus[o.status] ?? 0) + 1; });

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <PageHeader title="Orders Report" />
        <FilterSelect value={range} onChange={setRange} options={DATE_RANGES} placeholder="" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(byStatus).map(([status, count]) => (
          <div key={status} className="border border-stone/20 rounded-sm bg-cream-card p-4">
            <p className="text-[11px] uppercase tracking-wider text-stone mb-2">{status.replace(/_/g, " ")}</p>
            <p className="font-display text-2xl text-ink">{count}</p>
          </div>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <SectionCard title="All Orders">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-stone/20 bg-paper/50">{["Order #", "Customer", "Total", "Status", "Date"].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>)}</tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/50">
                  <td className="px-4 py-3 font-mono text-xs text-indigo font-semibold">{o.orderNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{o.customerName}</td>
                  <td className="px-4 py-3 font-semibold">{fmt(o.total)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-xs text-stone">{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}
    </PageShell>
  );
}
