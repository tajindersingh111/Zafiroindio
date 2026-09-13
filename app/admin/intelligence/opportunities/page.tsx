"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, Btn, useToast } from "@/components/admin/Shared";

interface Opportunity {
  id: string;
  category: string;
  title: string;
  reason: string;
  supportingMetric: string;
  potentialAction: string;
  priority: "high" | "medium" | "low";
}

export default function AIOpportunitiesPage() {
  const { addToast } = useToast();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/ai/opportunities")
      .then((r) => r.json())
      .then((data) => {
        setOpportunities(data);
        setLoading(false);
      });
  }, []);

  async function handleLaunchCampaign(oppId: string, title: string) {
    setActing(oppId);
    // Simulates triggering background campaigns sync
    const res = await fetch("/api/admin/ai/journeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `AI - ${title}`, trigger: "Opportunity Triggered" })
    });
    if (res.ok) {
      addToast(`Action Triggered: "${title}". Generated campaign in marketing registry.`);
      setOpportunities(opportunities.filter((opp) => opp.id !== oppId));
    }
    setActing(null);
  }

  return (
    <PageShell>
      <PageHeader title="🚀 AI Growth Opportunities Scan" subtitle="Active business optimizations, audience re-engagement suggestions, and inventory velocity checks." />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {opportunities.map((opp) => (
            <SectionCard key={opp.id} title={opp.category}>
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-semibold text-ink text-base">{opp.title}</h4>
                    <p className="text-xs text-ink-soft mt-1 leading-relaxed">{opp.reason}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                    opp.priority === "high" ? "bg-madder/10 text-madder" : "bg-turmeric/20 text-[#8a6519]"
                  }`}>
                    {opp.priority} Priority
                  </span>
                </div>

                <div className="p-3 bg-paper border border-stone/15 rounded-sm text-xs space-y-1 text-ink-soft">
                  <p><strong>Metrics Evidence:</strong> {opp.supportingMetric}</p>
                  <p><strong>Potential action:</strong> {opp.potentialAction}</p>
                </div>

                <div className="flex justify-end gap-2.5">
                  <Btn size="sm" onClick={() => handleLaunchCampaign(opp.id, opp.title)} disabled={acting === opp.id}>
                    {acting === opp.id ? "Launching..." : "Launch Campaign"}
                  </Btn>
                  <button onClick={() => handleLaunchCampaign(opp.id, "Rejected Opportunity")} className="px-2.5 py-1 text-xs border border-stone/30 hover:bg-paper rounded-sm">
                    Dismiss
                  </button>
                </div>
              </div>
            </SectionCard>
          ))}
          {opportunities.length === 0 && (
            <div className="col-span-2 border border-stone/30 bg-cream-card p-10 text-center text-stone">
              No active growth recommendations detected. Check back later for fresh opportunities.
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
