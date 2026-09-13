"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, StatCard } from "@/components/admin/Shared";

interface MetricRow {
  spend: number;
  revenue: number;
  purchases: number;
  roas: number;
}

export default function ZafiroAIDashboard() {
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/ai/forecast").then((r) => r.json()),
      fetch("/api/admin/ai/recommendations").then((r) => r.json()),
      fetch("/api/admin/ai/opportunities").then((r) => r.json()),
    ]).then(([fData, rData, oData]) => {
      setForecast(fData);
      setRecommendations(rData);
      setOpportunities(oData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading || !forecast || !recommendations) return <PageShell><LoadingSpinner /></PageShell>;

  const f30 = forecast.forecast30d;

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader title="Zafiro AI Growth Engine" subtitle="Transforming transaction records and advertising metrics into actionable revenue suggestions." />
        <div className="flex gap-2">
          <Link href="/admin/intelligence/forecast" className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider bg-paper border border-stone/30 hover:bg-paper/80 rounded-sm">
            AI Forecasting
          </Link>
          <Link href="/admin/intelligence/recommendations" className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider bg-indigo text-paper hover:opacity-90 rounded-sm">
            AI Ad Optimizer
          </Link>
        </div>
      </div>

      {/* KPI Forecast Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Estimated 30d Revenue"
          value={`₹${f30.revenueMin.toLocaleString("en-IN")} - ₹${f30.revenueMax.toLocaleString("en-IN")}`}
          accent="indigo"
          sub="Estimated range (not guaranteed)"
        />
        <StatCard
          label="Estimated 30d Orders"
          value={`${f30.ordersMin} - ${f30.ordersMax} orders`}
          accent="indigo"
          sub="Expected order count"
        />
        <StatCard
          label="Estimated 30d Units Sold"
          value={`${f30.soldMin} - ${f30.soldMax} units`}
          accent="green"
          sub="Product sales volumes"
        />
        <StatCard
          label="Predicted AOV"
          value={`₹${f30.aovMin.toLocaleString("en-IN")} - ₹${f30.aovMax.toLocaleString("en-IN")}`}
          accent="turmeric"
          sub="Per conversion basket"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Recommendations */}
        <SectionCard title="Priority Marketing Recommendations" className="lg:col-span-2">
          <div className="space-y-4">
            {/* Critical */}
            {recommendations.recommendations.critical.map((r: any) => (
              <div key={r.id} className="p-4 border border-madder/20 bg-madder/5 rounded-sm relative overflow-hidden">
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-madder" />
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-madder text-paper px-2 py-0.5 rounded-sm">Critical</span>
                    <h4 className="font-semibold text-ink text-sm mt-1.5">{r.title}</h4>
                    <p className="text-xs text-ink-soft mt-1 leading-relaxed">{r.insight}</p>
                    <p className="text-[11px] text-stone mt-2 italic">Evidence: {r.evidence}</p>
                  </div>
                  <Link href="/admin/intelligence/recommendations" className="text-xs font-semibold text-madder hover:underline shrink-0">Review →</Link>
                </div>
              </div>
            ))}

            {/* Opportunity */}
            {recommendations.recommendations.opportunity.map((r: any) => (
              <div key={r.id} className="p-4 border border-green-700/20 bg-green-700/5 rounded-sm relative overflow-hidden">
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-green-700" />
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-green-800 text-paper px-2 py-0.5 rounded-sm">Opportunity</span>
                    <h4 className="font-semibold text-ink text-sm mt-1.5">{r.title}</h4>
                    <p className="text-xs text-ink-soft mt-1 leading-relaxed">{r.insight}</p>
                    <p className="text-[11px] text-stone mt-2 italic">Evidence: {r.evidence}</p>
                  </div>
                  <Link href="/admin/intelligence/recommendations" className="text-xs font-semibold text-green-800 hover:underline shrink-0">Review →</Link>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Growth Opportunities */}
        <SectionCard title="Active Growth Opportunities">
          <div className="space-y-4">
            {opportunities.map((opp) => (
              <div key={opp.id} className="border-b border-stone/10 last:border-0 pb-3 last:pb-0">
                <p className="text-[9px] text-indigo font-bold uppercase tracking-widest">{opp.category}</p>
                <h5 className="font-semibold text-ink text-xs mt-1">{opp.title}</h5>
                <p className="text-xs text-stone mt-1 leading-relaxed">{opp.reason}</p>
                <Link href="/admin/intelligence/opportunities" className="text-[11px] text-madder hover:underline font-semibold block mt-1.5">Configure campaign →</Link>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Quick Action Navigation Grid */}
      <SectionCard title="Growth Engine Operations">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[
            { label: "Sales & Stock Forecasting", href: "/admin/intelligence/forecast", color: "bg-indigo/10 text-indigo hover:bg-indigo/15" },
            { label: "Ad Campaigns Recommendations", href: "/admin/intelligence/recommendations", color: "bg-madder/10 text-madder hover:bg-madder/15" },
            { label: "Customer Journey Pathways", href: "/admin/intelligence/journeys", color: "bg-turmeric/20 text-[#8a6519] hover:bg-turmeric/30" },
            { label: "Visual Journey Builder", href: "/admin/intelligence/journeys/builder", color: "bg-green-700/10 text-green-800 hover:bg-green-700/15" },
            { label: "Opportunity Scan", href: "/admin/intelligence/opportunities", color: "bg-stone/20 text-stone hover:bg-stone/30" }
          ].map((a) => (
            <Link key={a.href} href={a.href} className={`flex items-center justify-center py-4 rounded-sm text-xs font-semibold uppercase tracking-wider text-center transition-colors ${a.color}`}>
              {a.label}
            </Link>
          ))}
        </div>
      </SectionCard>
    </PageShell>
  );
}
