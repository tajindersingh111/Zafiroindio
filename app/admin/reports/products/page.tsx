"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, StatusBadge, FilterSelect, LoadingSpinner } from "@/components/admin/Shared";

const DATE_RANGES = [
  { label: "Last 7 days", value: "7d" }, { label: "Last 30 days", value: "30d" },
  { label: "This month", value: "month" }, { label: "This year", value: "year" },
];

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }

export default function ProductsReportPage() {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<{ id: string; name: string; qty: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/reports?range=${range}`)
      .then((r) => r.json())
      .then((d) => { setData(d.topProducts ?? []); setLoading(false); });
  }, [range]);

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <PageHeader title="Products Report" subtitle="Sales by product" />
        <FilterSelect value={range} onChange={setRange} options={DATE_RANGES} placeholder="" />
      </div>
      <SectionCard title="Products by Revenue">
        {loading ? <LoadingSpinner /> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-stone/20 bg-paper/50">{["#", "Product", "Units Sold", "Revenue"].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>)}</tr></thead>
            <tbody>
              {data.map((p, i) => (
                <tr key={p.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/50">
                  <td className="px-4 py-3 font-bold text-stone">#{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-ink">{p.name}</td>
                  <td className="px-4 py-3">{p.qty}</td>
                  <td className="px-4 py-3 font-semibold">{fmt(p.revenue)}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-stone">No sales data for this period.</td></tr>}
            </tbody>
          </table>
        )}
      </SectionCard>
    </PageShell>
  );
}
