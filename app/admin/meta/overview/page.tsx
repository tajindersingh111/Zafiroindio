"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, FilterSelect, StatCard } from "@/components/admin/Shared";
import { MetaWrapper } from "@/components/admin/MetaWrapper";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const DATE_RANGES = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "This month", value: "month" },
  { label: "This year", value: "year" },
];

function fmt(n: number) { return "₹" + Math.round(n).toLocaleString("en-IN"); }

export default function MetaOverviewPage() {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/meta/analytics").then((r) => r.json()),
      fetch("/api/admin/meta/campaigns").then((r) => r.json()),
    ]).then(([aData, cData]) => {
      setData(aData);
      setCampaigns(cData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [range]);

  if (loading || !data || data.error || !data.metrics) {
    return null;
  }

  const metrics = data.metrics;

  return (
    <MetaWrapper>
      <PageShell>
        <div className="flex items-center justify-between">
          <PageHeader title="Meta Ads Overview" subtitle="Real-time marketing attribution, advertising ROAS, and campaign performance." />
          <FilterSelect value={range} onChange={setRange} options={DATE_RANGES} placeholder="" />
        </div>

        {/* Aggregate KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Ad Spend" value={fmt(metrics.spend)} accent="madder" sub="Total paid budget" />
          <StatCard label="Attributed Sales" value={fmt(metrics.revenue)} accent="green" sub={`${metrics.purchases} conversion orders`} />
          <StatCard label="ROAS Margin" value={`${metrics.roas.toFixed(2)}x`} accent="indigo" sub="Attributed Revenue / Spend" />
          <StatCard label="CTR (Click rate)" value={`${metrics.ctr.toFixed(2)}%`} accent="turmeric" sub={`${metrics.clicks.toLocaleString()} clicks`} />
          <StatCard label="Average CPC" value={fmt(metrics.cpc)} accent="indigo" sub="Cost per Link Click" />
          <StatCard label="Average CPM" value={fmt(metrics.cpm)} accent="indigo" sub="Cost per 1,000 Impressions" />
          <StatCard label="CPA (Cost per Sale)" value={fmt(metrics.costPerPurchase)} accent="madder" sub="Average purchase cost" />
          <StatCard label="Ad Reach" value={metrics.reach.toLocaleString()} accent="indigo" sub="Unique user views" />
        </div>

        {/* Funnel & Attributed Profitability */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visual Marketing Funnel */}
          <SectionCard title="Marketing Funnel Performance" className="lg:col-span-2">
            <div className="space-y-4 py-2">
              {data.funnel.map((f: any, idx: number) => {
                const percentWidth = Math.max(10, Math.min(100, (f.count / data.funnel[0].count) * 100));
                return (
                  <div key={f.stage} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-ink">{f.stage}</span>
                      <span className="text-stone">{f.count.toLocaleString()} ({f.rate}%)</span>
                    </div>
                    <div className="w-full bg-paper border border-stone/15 h-5 overflow-hidden rounded-sm flex">
                      <div className="bg-indigo h-full opacity-90 transition-all duration-500" style={{ width: `${percentWidth}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Profitability Estimator */}
          <SectionCard title="Attributed Profitability">
            <div className="space-y-4 text-sm text-ink-soft">
              <div className="flex justify-between py-1.5 border-b border-stone/10">
                <span className="text-stone">Meta Ad Spend</span>
                <span className="font-semibold text-madder">-{fmt(data.profitability.adSpend)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone/10">
                <span className="text-stone">Product Sales Revenue</span>
                <span className="font-semibold text-ink">{fmt(data.profitability.productRevenue)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone/10">
                <span className="text-stone">Estimated Product Cost</span>
                <span className="font-semibold text-stone">-{fmt(data.profitability.productCost)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone/10 font-bold text-base">
                <span className="text-ink font-semibold">Attributed Net Profit</span>
                <span className={data.profitability.estimatedProfit >= 0 ? "text-green-800" : "text-madder"}>
                  {fmt(data.profitability.estimatedProfit)}
                </span>
              </div>
              <p className="text-[10px] text-stone italic leading-relaxed pt-2">Note: Profit metrics are estimated using attributed Meta campaigns sales minus standard WooCommerce production inventory margins.</p>
            </div>
          </SectionCard>
        </div>

        {/* Dynamic Alerts & Top campaigns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SectionCard title="Ad Insights & Alerts" className="lg:col-span-2">
            <div className="space-y-3.5">
              {data.insights.map((ins: string, idx: number) => (
                <div key={idx} className="flex gap-2.5 items-start text-xs text-ink leading-relaxed">
                  <span className="text-indigo font-bold">•</span>
                  <span>{ins}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Top Campaigns (By revenue)">
            <div className="space-y-3">
              {campaigns.slice(0, 3).map((c: any) => (
                <div key={c.id} className="flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-ink truncate max-w-[150px]">{c.name}</p>
                    <p className="text-[10px] text-stone">Spend: {fmt(c.spend)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-800">{fmt(c.revenue)}</p>
                    <p className="text-[10px] text-indigo font-semibold">{c.roas.toFixed(2)}x ROAS</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </PageShell>
    </MetaWrapper>
  );
}
