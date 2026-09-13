"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, FilterSelect, LoadingSpinner, StatCard } from "@/components/admin/Shared";

const DATE_RANGES = [
  { label: "Last 7 days", value: "7d" }, { label: "Last 30 days", value: "30d" },
  { label: "This month", value: "month" }, { label: "This year", value: "year" },
];

interface Customer {
  id: string; firstName: string; lastName: string; email: string;
  type: string; totalOrders: number; totalSpent: number; registeredAt: string;
}

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }

export default function CustomersReportPage() {
  const [range, setRange] = useState("30d");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState({ totalCustomers: 0, newCustomers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/customers?pageSize=100").then((r) => r.json()),
      fetch(`/api/admin/reports?range=${range}`).then((r) => r.json()),
    ]).then(([custData, rData]) => {
      setCustomers(custData.customers ?? []);
      setStats({ totalCustomers: rData.overview?.totalCustomers ?? 0, newCustomers: rData.overview?.newCustomers ?? 0 });
      setLoading(false);
    });
  }, [range]);

  const topSpenders = [...customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);
  const b2b = customers.filter((c) => c.type === "b2b");
  const retail = customers.filter((c) => c.type === "retail");

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <PageHeader title="Customers Report" />
        <FilterSelect value={range} onChange={setRange} options={DATE_RANGES} placeholder="" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Customers" value={String(stats.totalCustomers)} accent="indigo" />
        <StatCard label="New Customers" value={String(stats.newCustomers)} accent="green" sub={`in ${range}`} />
        <StatCard label="B2B Customers" value={String(b2b.length)} accent="madder" />
        <StatCard label="Retail Customers" value={String(retail.length)} accent="turmeric" />
      </div>

      {loading ? <LoadingSpinner /> : (
        <SectionCard title="Top Customers by Spend">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-stone/20 bg-paper/50">{["#", "Customer", "Type", "Orders", "Lifetime Spend"].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>)}</tr></thead>
            <tbody>
              {topSpenders.map((c, i) => (
                <tr key={c.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/50">
                  <td className="px-4 py-3 font-bold text-stone">#{i + 1}</td>
                  <td className="px-4 py-3"><p className="font-medium text-ink">{c.firstName} {c.lastName}</p><p className="text-xs text-stone">{c.email}</p></td>
                  <td className="px-4 py-3 text-xs uppercase text-stone">{c.type}</td>
                  <td className="px-4 py-3">{c.totalOrders}</td>
                  <td className="px-4 py-3 font-semibold">{fmt(c.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}
    </PageShell>
  );
}
