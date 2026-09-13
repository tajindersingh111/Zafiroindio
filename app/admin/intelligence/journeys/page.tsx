"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, Btn, useToast } from "@/components/admin/Shared";

interface Journey {
  id: string;
  name: string;
  trigger: string;
  status: string;
  analytics: {
    entered: number;
    completed: number;
    purchases: number;
    revenue: number;
    conversionRate: number;
  };
}

function fmt(n: number) { return "₹" + Math.round(n).toLocaleString("en-IN"); }

export default function CustomerJourneysPage() {
  const { addToast } = useToast();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetchJourneys();
  }, []);

  function fetchJourneys() {
    setLoading(true);
    fetch("/api/admin/ai/journeys")
      .then((r) => r.json())
      .then((d) => {
        setJourneys(d);
        setLoading(false);
      });
  }

  async function handleToggleStatus(j: Journey) {
    setToggling(j.id);
    const newStatus = j.status === "Active" ? "Paused" : "Active";
    const res = await fetch("/api/admin/ai/journeys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: j.id, status: newStatus })
    });
    if (res.ok) {
      addToast(`Journey "${j.name}" delivery status updated to ${newStatus}.`);
      fetchJourneys();
    }
    setToggling(null);
  }

  return (
    <PageShell>
      <PageHeader
        title="Customer Journey Automation Pathways"
        subtitle="Route buyers through automated triggers, WhatsApp pushes, and review request reminders."
        action={
          <Link href="/admin/intelligence/journeys/builder">
            <Btn size="sm">Launch Visual Builder</Btn>
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          {/* Analytics Overview cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Total Cohorts Entered</p>
              <p className="text-xl font-display font-semibold mt-1">
                {journeys.reduce((sum, j) => sum + j.analytics.entered, 0).toLocaleString()} customers
              </p>
            </div>
            <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Total Completed Steps</p>
              <p className="text-xl font-display font-semibold mt-1">
                {journeys.reduce((sum, j) => sum + j.analytics.completed, 0).toLocaleString()} runs
              </p>
            </div>
            <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Attributed Conversion Purchases</p>
              <p className="text-xl font-display font-semibold mt-1 text-green-800">
                {journeys.reduce((sum, j) => sum + j.analytics.purchases, 0)} sales
              </p>
            </div>
            <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Attributed Revenue Recovered</p>
              <p className="text-xl font-display font-semibold mt-1 text-indigo">
                {fmt(journeys.reduce((sum, j) => sum + j.analytics.revenue, 0))}
              </p>
            </div>
          </div>

          {/* Journeys List */}
          <SectionCard title="Active Automated Journeys">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone/20 bg-paper/50">
                  {["Journey Name", "Trigger Source", "Entered", "Purchases", "Conversion ROAS", "Revenue", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {journeys.map((j) => (
                  <tr key={j.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/40">
                    <td className="px-4 py-3 font-semibold text-ink">{j.name}</td>
                    <td className="px-4 py-3 text-xs text-stone font-semibold uppercase">{j.trigger}</td>
                    <td className="px-4 py-3">{j.analytics.entered.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold">{j.analytics.purchases} sales</td>
                    <td className="px-4 py-3 font-bold text-indigo">{j.analytics.conversionRate.toFixed(1)}%</td>
                    <td className="px-4 py-3 font-bold text-green-800">{fmt(j.analytics.revenue)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        j.status === "Active" ? "bg-green-700/10 text-green-800" : "bg-stone/20 text-stone"
                      }`}>
                        {j.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs space-x-2">
                      <button onClick={() => handleToggleStatus(j)} className="text-indigo hover:underline font-semibold" disabled={toggling === j.id}>
                        {j.status === "Active" ? "Pause" : "Resume"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </div>
      )}
    </PageShell>
  );
}
