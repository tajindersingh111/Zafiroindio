"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner } from "@/components/admin/Shared";
import { MetaWrapper } from "@/components/admin/MetaWrapper";

interface AdSet {
  id: string;
  name: string;
  campaignId: string;
  audience: string;
  budget: string;
  schedule: string;
  placement: string;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  purchases: number;
  roas: number;
}

function fmt(n: number) { return "₹" + Math.round(n).toLocaleString("en-IN"); }

export default function MetaAdSetsPage() {
  const [adsets, setAdsets] = useState<AdSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/meta/adsets")
      .then((r) => r.json())
      .then((data) => {
        setAdsets(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  return (
    <MetaWrapper>
      <PageShell>
        <PageHeader title="Ad Sets Management" subtitle="Review ad set targeting rules, active audiences, Advantage+ placements, and spends." />

        {loading ? (
          <LoadingSpinner />
        ) : (
          <SectionCard title="Active Ad Sets">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone/20 bg-paper/50">
                  {["Ad Set Name", "Target Audience", "Budget", "Spend", "Placements", "Clicks", "Purchases", "ROAS"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adsets.map((a) => (
                  <tr key={a.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/40">
                    <td className="px-4 py-3 font-semibold text-ink">{a.name}</td>
                    <td className="px-4 py-3 text-xs text-stone">{a.audience}</td>
                    <td className="px-4 py-3 text-xs font-mono">{a.budget}</td>
                    <td className="px-4 py-3 font-semibold">{fmt(a.spend)}</td>
                    <td className="px-4 py-3 text-xs text-stone uppercase font-medium">{a.placement}</td>
                    <td className="px-4 py-3">{a.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold">{a.purchases} sales</td>
                    <td className="px-4 py-3 font-bold text-indigo">{a.roas.toFixed(2)}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        )}
      </PageShell>
    </MetaWrapper>
  );
}
