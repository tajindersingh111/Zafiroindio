"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, Btn } from "@/components/admin/Shared";
import { MetaWrapper } from "@/components/admin/MetaWrapper";

interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: string;
  budget: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  costPerPurchase: number;
  revenue: number;
  roas: number;
  startDate: string;
}

function fmt(n: number) { return "₹" + Math.round(n).toLocaleString("en-IN"); }

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/meta/campaigns")
      .then((r) => r.json())
      .then((data) => {
        const found = data.find((c: any) => c.id === id);
        setCampaign(found || null);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <PageShell><LoadingSpinner /></PageShell>;
  if (!campaign) return <PageShell><p className="text-stone">Campaign not found.</p></PageShell>;

  return (
    <MetaWrapper>
      <PageShell>
        <PageHeader
          title={campaign.name}
          subtitle={`Campaign ID: ${campaign.id} · Objective: ${campaign.objective}`}
          action={<Btn size="sm" variant="secondary" onClick={() => router.push("/admin/meta/campaigns")}>← Campaigns List</Btn>}
        />

        {/* Campaign Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
            <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Spend Budget</p>
            <p className="text-xl font-display font-semibold text-ink mt-1">{fmt(campaign.spend)}</p>
          </div>
          <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
            <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Conversion Revenue</p>
            <p className="text-xl font-display font-semibold text-green-800 mt-1">{fmt(campaign.revenue)}</p>
          </div>
          <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
            <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">ROAS Achieved</p>
            <p className="text-xl font-display font-semibold text-indigo mt-1">{campaign.roas.toFixed(2)}x</p>
          </div>
          <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
            <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Cost per Purchase</p>
            <p className="text-xl font-display font-semibold text-madder mt-1">{fmt(campaign.costPerPurchase)}</p>
          </div>
        </div>

        {/* Structural Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SectionCard title="Ad Account Structure Hierarchy" className="lg:col-span-2">
            <div className="space-y-4 pt-2">
              <div className="p-4 border border-indigo/20 bg-indigo/5 rounded-sm">
                <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo text-paper px-2 py-0.5 rounded-sm">Campaign</span>
                <p className="font-semibold text-indigo mt-1.5 text-sm">{campaign.name}</p>
              </div>

              <div className="ml-8 border-l border-stone/20 pl-4 space-y-4">
                <div className="p-4 border border-turmeric/20 bg-turmeric/5 rounded-sm">
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-turmeric text-[#8a6519] px-2 py-0.5 rounded-sm">Ad Set</span>
                  <p className="font-semibold text-ink mt-1.5 text-sm">Broad Targeting - India (Home Decor Interest)</p>
                  <p className="text-xs text-stone mt-1">Audience size: 14.5k Website Visitors</p>
                </div>

                <div className="ml-8 border-l border-stone/20 pl-4 space-y-3">
                  <div className="p-3 border border-stone/20 bg-paper rounded-sm">
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-stone text-ink px-2 py-0.5 rounded-sm">Ad Creative</span>
                    <p className="font-medium text-ink mt-1 text-xs">Cleopatra Bedsheet Carousel Ad</p>
                    <p className="text-[10px] text-stone">Creative: Carousel (3 Mughal bedsheets)</p>
                  </div>
                  <div className="p-3 border border-stone/20 bg-paper rounded-sm">
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-stone text-ink px-2 py-0.5 rounded-sm">Ad Creative</span>
                    <p className="font-medium text-ink mt-1 text-xs">Saffron Mughal Gardens Single Image Ad</p>
                    <p className="text-[10px] text-stone">Creative: Single Image (Saffron bedroom mockup)</p>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Ad Diagnostics Details">
            <div className="space-y-3.5 text-xs text-ink-soft">
              <div className="flex justify-between py-1 border-b border-stone/10">
                <span className="text-stone">Click Through Rate (CTR)</span>
                <span className="font-semibold">{campaign.ctr.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone/10">
                <span className="text-stone">Cost Per Click (CPC)</span>
                <span className="font-semibold">{fmt(campaign.cpc)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone/10">
                <span className="text-stone">Cost Per 1K views (CPM)</span>
                <span className="font-semibold">{fmt(campaign.cpm)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone/10">
                <span className="text-stone">Impressions count</span>
                <span>{campaign.impressions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone/10">
                <span className="text-stone">Start Date</span>
                <span>{campaign.startDate}</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </PageShell>
    </MetaWrapper>
  );
}
