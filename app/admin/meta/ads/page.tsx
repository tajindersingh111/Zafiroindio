"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, StatusBadge } from "@/components/admin/Shared";
import { MetaWrapper } from "@/components/admin/MetaWrapper";

interface Ad {
  id: string;
  name: string;
  campaign: string;
  adSet: string;
  creative: string;
  status: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  purchases: number;
  revenue: number;
  roas: number;
}

function fmt(n: number) { return "₹" + Math.round(n).toLocaleString("en-IN"); }

export default function MetaAdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/meta/ads")
      .then((r) => r.json())
      .then((data) => {
        setAds(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  if (loading) return <PageShell><LoadingSpinner /></PageShell>;

  const sortedByRoas = [...ads].sort((a, b) => b.roas - a.roas);
  const bestAd = sortedByRoas[0];
  const worstAd = sortedByRoas[sortedByRoas.length - 1];

  return (
    <MetaWrapper>
      <PageShell>
        <PageHeader title="Ad Creatives Management" subtitle="Review ad creative formats, tracking conversions, and compare ROAS across ads." />

        {/* Best/Worst Performers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {bestAd && (
            <div className="border border-green-700/20 bg-green-700/5 p-5 rounded-sm flex items-start gap-4">
              <span className="text-2xl mt-0.5">🟢</span>
              <div>
                <p className="text-[10px] text-green-800 font-bold uppercase tracking-wider">Top Performing Ad Creative (ROAS)</p>
                <p className="font-display font-semibold text-lg text-ink mt-1">{bestAd.name}</p>
                <p className="text-xs text-stone mt-1">ROAS: <strong className="text-green-800">{bestAd.roas.toFixed(2)}x</strong> · Attributed Revenue: {fmt(bestAd.revenue)}</p>
              </div>
            </div>
          )}

          {worstAd && worstAd.id !== bestAd?.id && (
            <div className="border border-madder/20 bg-madder/5 p-5 rounded-sm flex items-start gap-4">
              <span className="text-2xl mt-0.5">⚠️</span>
              <div>
                <p className="text-[10px] text-madder font-bold uppercase tracking-wider">Lowest Performing Ad Creative (ROAS)</p>
                <p className="font-display font-semibold text-lg text-ink mt-1">{worstAd.name}</p>
                <p className="text-xs text-stone mt-1">ROAS: <strong className="text-madder">{worstAd.roas.toFixed(2)}x</strong> · Spend: {fmt(worstAd.spend)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Ads List */}
        <SectionCard title="Active Ad Creatives">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone/20 bg-paper/50">
                {["Ad Name", "Creative Type", "Spend", "CTR", "Purchases", "Revenue", "ROAS", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => (
                <tr key={ad.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/40">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{ad.name}</p>
                    <p className="text-[10px] text-stone truncate max-w-xs">{ad.adSet}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone">{ad.creative}</td>
                  <td className="px-4 py-3 font-semibold">{fmt(ad.spend)}</td>
                  <td className="px-4 py-3 text-xs">{ad.ctr.toFixed(2)}%</td>
                  <td className="px-4 py-3 font-semibold">{ad.purchases} sales</td>
                  <td className="px-4 py-3 font-bold text-green-800">{fmt(ad.revenue)}</td>
                  <td className="px-4 py-3 font-bold text-indigo">{ad.roas.toFixed(2)}x</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      ad.status === "Active" ? "bg-green-700/10 text-green-800" : "bg-stone/20 text-stone"
                    }`}>
                      {ad.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </PageShell>
    </MetaWrapper>
  );
}
