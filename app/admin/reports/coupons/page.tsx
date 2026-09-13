"use client";
import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, FilterSelect } from "@/components/admin/Shared";

interface Coupon { id: string; code: string; type: string; amount: number; usageCount: number; isActive: boolean; }
const DATE_RANGES = [
  { label: "Last 30 days", value: "30d" }, { label: "This month", value: "month" }, { label: "This year", value: "year" },
];

export default function CouponsReportPage() {
  const [range, setRange] = useState("30d");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/coupons?pageSize=100").then((r) => r.json()).then((d) => {
      setCoupons(d.coupons ?? []); setLoading(false);
    });
  }, [range]);

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <PageHeader title="Coupons Report" />
        <FilterSelect value={range} onChange={setRange} options={DATE_RANGES} placeholder="" />
      </div>
      {loading ? <LoadingSpinner /> : (
        <SectionCard title="Coupon Usage">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-stone/20 bg-paper/50">{["Code", "Type", "Amount", "Uses", "Status"].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>)}</tr></thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-stone/10 last:border-0">
                  <td className="px-4 py-3 font-mono font-bold text-indigo">{c.code}</td>
                  <td className="px-4 py-3 text-xs text-stone capitalize">{c.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 font-semibold">{c.type === "percent" ? `${c.amount}%` : `₹${c.amount}`}</td>
                  <td className="px-4 py-3">{c.usageCount}</td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${c.isActive ? "bg-green-700/10 text-green-800" : "bg-stone/20 text-stone"}`}>{c.isActive ? "Active" : "Inactive"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}
    </PageShell>
  );
}
