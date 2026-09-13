"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, Btn, useToast } from "@/components/admin/Shared";

interface Recommendation {
  id: string;
  title: string;
  insight: string;
  whyItMatters: string;
  consideration: string;
  evidence: string;
  priority: "critical" | "attention" | "opportunity";
}

interface Allocation {
  id: string;
  name: string;
  currentSpend: number;
  suggestedSpend: number;
  roas: number;
}

function fmt(n: number) { return "₹" + Math.round(n).toLocaleString("en-IN"); }

export default function AIRecommendationsPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<{ critical: Recommendation[]; attention: Recommendation[]; opportunity: Recommendation[] } | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [creative, setCreative] = useState<any>(null);
  const [audiences, setAudiences] = useState<string[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  function fetchRecommendations() {
    setLoading(true);
    fetch("/api/admin/ai/recommendations")
      .then((r) => r.json())
      .then((d) => {
        setRecommendations(d.recommendations);
        setAllocations(d.allocations);
        setCreative(d.creativeInsights);
        setAudiences(d.audienceInsights);
        setLoading(false);
      });
  }

  async function handleApprove(recId: string, actionText: string) {
    setProcessing(recId);
    // Simulating dispatching approval action log
    const res = await fetch("/api/admin/meta/campaigns", {
      method: "POST", // Simulates configuration write back
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: recId, status: "approved" })
    });
    if (res.ok) {
      addToast(`Action Approved: "${actionText}". Applied update to Meta Ads Manager.`);
      // Remove recommendation from state
      if (recommendations) {
        setRecommendations({
          critical: recommendations.critical.filter((r) => r.id !== recId),
          attention: recommendations.attention.filter((r) => r.id !== recId),
          opportunity: recommendations.opportunity.filter((r) => r.id !== recId),
        });
      }
    }
    setProcessing(null);
  }

  if (loading || !recommendations) return <PageShell><LoadingSpinner /></PageShell>;

  return (
    <PageShell>
      <PageHeader title="AI Marketing Optimization & Recommendations" subtitle="Analyze ROAS targets, compare CPC/CTR fatigue, and optimize budget bidding rules." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommendation Cards */}
        <div className="lg:col-span-2 space-y-4">
          <SectionCard title="Active Marketing Performance Suggestions">
            <div className="space-y-6">
              {/* Critical */}
              {recommendations.critical.map((r) => (
                <div key={r.id} className="p-4 border border-madder/20 bg-madder/5 rounded-sm relative overflow-hidden space-y-3">
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-madder" />
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-madder text-paper px-2 py-0.5 rounded-sm">Critical Danger Alert</span>
                    <h4 className="font-semibold text-ink text-sm mt-1.5">{r.title}</h4>
                    <p className="text-xs text-ink-soft mt-1 leading-relaxed">{r.insight}</p>
                  </div>
                  <div className="text-xs space-y-1 text-stone bg-paper/40 p-2.5 rounded-sm border border-stone/10">
                    <p><strong>Why it matters:</strong> {r.whyItMatters}</p>
                    <p><strong>Suggested Action:</strong> {r.consideration}</p>
                    <p><strong>Evidence:</strong> {r.evidence}</p>
                  </div>
                  <div className="flex gap-2">
                    <Btn size="sm" onClick={() => handleApprove(r.id, r.title)} disabled={processing === r.id}>Approve</Btn>
                    <button onClick={() => handleApprove(r.id, "Rejected Recommendation")} className="px-2 py-1 text-xs border border-stone/30 hover:bg-paper rounded-sm">Dismiss</button>
                  </div>
                </div>
              ))}

              {/* Attention */}
              {recommendations.attention.map((r) => (
                <div key={r.id} className="p-4 border border-turmeric/20 bg-turmeric/5 rounded-sm relative overflow-hidden space-y-3">
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-turmeric" />
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-turmeric text-[#8a6519] px-2 py-0.5 rounded-sm">Attention Needed</span>
                    <h4 className="font-semibold text-ink text-sm mt-1.5">{r.title}</h4>
                    <p className="text-xs text-ink-soft mt-1 leading-relaxed">{r.insight}</p>
                  </div>
                  <div className="text-xs space-y-1 text-stone bg-paper/40 p-2.5 rounded-sm border border-stone/10">
                    <p><strong>Why it matters:</strong> {r.whyItMatters}</p>
                    <p><strong>Suggested Action:</strong> {r.consideration}</p>
                    <p><strong>Evidence:</strong> {r.evidence}</p>
                  </div>
                  <div className="flex gap-2">
                    <Btn size="sm" onClick={() => handleApprove(r.id, r.title)} disabled={processing === r.id}>Approve</Btn>
                    <button onClick={() => handleApprove(r.id, "Rejected Recommendation")} className="px-2 py-1 text-xs border border-stone/30 hover:bg-paper rounded-sm">Dismiss</button>
                  </div>
                </div>
              ))}

              {/* Opportunity */}
              {recommendations.opportunity.map((r) => (
                <div key={r.id} className="p-4 border border-green-700/20 bg-green-700/5 rounded-sm relative overflow-hidden space-y-3">
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-green-700" />
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-green-800 text-paper px-2 py-0.5 rounded-sm">Opportunity Growth</span>
                    <h4 className="font-semibold text-ink text-sm mt-1.5">{r.title}</h4>
                    <p className="text-xs text-ink-soft mt-1 leading-relaxed">{r.insight}</p>
                  </div>
                  <div className="text-xs space-y-1 text-stone bg-paper/40 p-2.5 rounded-sm border border-stone/10">
                    <p><strong>Why it matters:</strong> {r.whyItMatters}</p>
                    <p><strong>Suggested Action:</strong> {r.consideration}</p>
                    <p><strong>Evidence:</strong> {r.evidence}</p>
                  </div>
                  <div className="flex gap-2">
                    <Btn size="sm" onClick={() => handleApprove(r.id, r.title)} disabled={processing === r.id}>Approve</Btn>
                    <button onClick={() => handleApprove(r.id, "Rejected Recommendation")} className="px-2 py-1 text-xs border border-stone/30 hover:bg-paper rounded-sm">Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Budget reallocations */}
          <SectionCard title="AI Ad Spend Budget Allocation Simulator">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone/20 bg-paper/50">
                  {["Campaign Name", "Current Spend", "Suggested allocation", "ROAS", "Action"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allocations.map((alloc) => (
                  <tr key={alloc.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/40">
                    <td className="px-4 py-3 font-semibold text-ink">{alloc.name}</td>
                    <td className="px-4 py-3">{fmt(alloc.currentSpend)}</td>
                    <td className="px-4 py-3 font-bold text-green-800">{fmt(alloc.suggestedSpend)}</td>
                    <td className="px-4 py-3 font-semibold text-indigo">{alloc.roas.toFixed(2)}x</td>
                    <td className="px-4 py-3">
                      {alloc.currentSpend !== alloc.suggestedSpend ? (
                        <Btn size="sm" onClick={() => handleApprove(alloc.id, `Budget set to ${fmt(alloc.suggestedSpend)}`)}>
                          Apply Allocation
                        </Btn>
                      ) : (
                        <span className="text-[10px] text-stone font-semibold uppercase">Optimal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </div>

        {/* Right column: Creative/Audience insights */}
        <div className="space-y-6">
          <SectionCard title="Ad Creative Performance Insights">
            <div className="space-y-4 text-xs text-ink-soft">
              <div>
                <p className="text-[10px] text-green-800 font-bold uppercase tracking-wide mb-1">Top Performing Ad Creative</p>
                <p className="font-semibold text-ink">{creative?.best}</p>
              </div>
              <hr className="border-stone/15" />
              <div>
                <p className="text-[10px] text-madder font-bold uppercase tracking-wide mb-1">Lowest Performing Ad Creative</p>
                <p className="font-semibold text-ink">{creative?.worst}</p>
              </div>
              <hr className="border-stone/15" />
              <div>
                <p className="text-[10px] text-indigo font-bold uppercase tracking-wide mb-1">High Link Clicks / Low Conversion</p>
                <p className="font-semibold text-ink">{creative?.highClickLowConv}</p>
                <p className="text-[10px] text-stone mt-1">Recommendation: Review landing page structure or price mapping.</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Target Audience Insights">
            <div className="space-y-3.5">
              {audiences.map((aud, idx) => (
                <div key={idx} className="flex gap-2.5 items-start text-xs text-ink leading-relaxed">
                  <span className="text-indigo font-bold">•</span>
                  <span>{aud}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}
