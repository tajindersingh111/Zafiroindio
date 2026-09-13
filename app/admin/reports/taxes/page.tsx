"use client";
import { PageShell, PageHeader, SectionCard } from "@/components/admin/Shared";

const GST_SLABS = [
  { desc: "Cotton & linen textiles (HSN 5208-5212)", rate: "5%", collected: "₹12,400" },
  { desc: "Home décor & furnishings", rate: "18%", collected: "₹38,200" },
  { desc: "Shipping / courier services", rate: "18%", collected: "₹2,160" },
];

export default function TaxesReportPage() {
  return (
    <PageShell>
      <PageHeader title="Taxes Report" subtitle="GST collected across all orders" />
      <SectionCard title="GST Summary (This Year)">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-stone/20 bg-paper/50">{["Description", "Rate", "Collected"].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>)}</tr></thead>
          <tbody>
            {GST_SLABS.map((r) => (
              <tr key={r.desc} className="border-b border-stone/10 last:border-0">
                <td className="px-4 py-3 text-ink">{r.desc}</td>
                <td className="px-4 py-3 font-semibold text-indigo">{r.rate}</td>
                <td className="px-4 py-3 font-semibold">{r.collected}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-indigo/30">
              <td className="px-4 py-3 font-bold text-ink" colSpan={2}>Total GST Collected</td>
              <td className="px-4 py-3 font-bold text-indigo text-base">₹52,760</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-stone mt-4">Note: This is a summary view. For official GST filing, please export full tax reports and verify with your chartered accountant.</p>
      </SectionCard>
    </PageShell>
  );
}
