"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, Btn, useToast } from "@/components/admin/Shared";
import { MetaWrapper } from "@/components/admin/MetaWrapper";

interface Audience {
  id: string;
  name: string;
  type: string;
  size: string;
  source: string;
  lastUpdated: string;
}

export default function MetaAudiencesPage() {
  const { addToast } = useToast();
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingSegment, setSyncingSegment] = useState<string | null>(null);

  useEffect(() => {
    fetchAudiences();
  }, []);

  function fetchAudiences() {
    setLoading(true);
    fetch("/api/admin/meta/audiences")
      .then((r) => r.json())
      .then((data) => {
        setAudiences(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }

  async function pushSegmentToMeta(segmentName: string) {
    setSyncingSegment(segmentName);
    const res = await fetch("/api/admin/meta/audiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `Zafiro Segments - ${segmentName}`, type: "Custom Audience" })
    });
    if (res.ok) {
      addToast(`WooCommerce Customer Segment "${segmentName}" pushed to Meta Custom Audiences successfully.`);
      fetchAudiences();
    }
    setSyncingSegment(null);
  }

  return (
    <MetaWrapper>
      <PageShell>
        <PageHeader title="Audiences Manager" subtitle="Synchronize customer lists, build Website Retargeting cohorts, and configure lookalikes." />

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Audiences List */}
            <SectionCard title="Active Meta Audiences" className="lg:col-span-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone/20 bg-paper/50">
                    {["Audience Name", "Type", "Estimated Size", "Source Data", "Last Sync"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {audiences.map((aud) => (
                    <tr key={aud.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/40">
                      <td className="px-4 py-3 font-semibold text-ink">{aud.name}</td>
                      <td className="px-4 py-3 text-xs text-stone font-semibold uppercase">{aud.type}</td>
                      <td className="px-4 py-3 font-medium">{aud.size}</td>
                      <td className="px-4 py-3 text-xs text-stone">{aud.source}</td>
                      <td className="px-4 py-3 text-xs text-stone">{aud.lastUpdated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>

            {/* Sync Segment Card */}
            <SectionCard title="Push WooCommerce Segments to Meta">
              <div className="space-y-4 text-xs text-ink-soft">
                <p className="text-stone">Push your automatically updated Zafiro Customer Segments to Meta to launch highly matching retargeting/lookalike campaigns.</p>
                
                {[
                  "High Value Customers",
                  "New Customers",
                  "Inactive Customers",
                  "Frequent Buyers"
                ].map((seg) => (
                  <div key={seg} className="flex justify-between items-center p-3 border border-stone/15 rounded-sm bg-paper/30">
                    <span className="font-semibold text-ink">{seg}</span>
                    <Btn
                      size="sm"
                      onClick={() => pushSegmentToMeta(seg)}
                      disabled={syncingSegment === seg}
                    >
                      {syncingSegment === seg ? "Pushing..." : "Push to Meta"}
                    </Btn>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}
      </PageShell>
    </MetaWrapper>
  );
}
