import { NextResponse } from "next/server";
import { readSettings } from "@/lib/db/store";

interface Campaign {
  id: string;
  name: string;
  spend: number;
  revenue: number;
  purchases: number;
  roas: number;
  clicks: number;
  impressions: number;
}

export async function GET() {
  const sandbox = readSettings<{ campaigns: Campaign[]; adsets: any[]; ads: any[] }>("meta-sandbox");
  const campaigns = sandbox?.campaigns ?? [];

  // Sort campaigns to recommend allocations
  const sorted = [...campaigns].sort((a, b) => b.roas - a.roas);
  const bestCamp = sorted[0];
  const worstCamp = sorted[sorted.length - 1];

  const critical = [
    {
      id: "rec-crit-1",
      title: "Cost Per Purchase Surge",
      insight: "CPA for retargeting campaign has spiked 24% over the last 7 days.",
      whyItMatters: "High conversion acquisition costs erode overall marketing profit margins.",
      consideration: "Review creative fatigue on Instagram placements and test fresh lookalike assets.",
      evidence: "CPA: ₹169.64 vs ₹136.20 average.",
      priority: "critical"
    }
  ];

  const attention = [
    {
      id: "rec-att-1",
      title: "Underperforming Campaign Budget Loss",
      insight: `Campaign '${worstCamp?.name || "Traffic"}' has spent ${worstCamp?.spend ? `₹${worstCamp.spend}` : "₹8,200"} with relatively low ROAS.`,
      whyItMatters: "Unoptimized traffic campaigns result in budget leakages without downstream purchase intent.",
      consideration: "Consider refining the landing page offer or narrowing geographical city targets.",
      evidence: `ROAS: ${worstCamp?.roas ? worstCamp.roas.toFixed(2) : "2.63"}x vs Target: 4.50x.`,
      priority: "attention"
    }
  ];

  const opportunity = [
    {
      id: "rec-opp-1",
      title: "Gradual Budget Scale Recommended",
      insight: `Campaign '${bestCamp?.name || "Sales"}' ROAS is outperforming target metrics.`,
      whyItMatters: "Scaling budget on top performers captures high-converting search share and increases gross sales.",
      consideration: "Test a gradual budget increase of 20% over 7 days while monitoring click-through rates.",
      evidence: `ROAS: ${bestCamp?.roas ? bestCamp.roas.toFixed(2) : "9.54"}x vs Target: 4.50x.`,
      priority: "opportunity"
    }
  ];

  // Budget allocations
  const allocations = campaigns.map((c) => {
    let suggestedBudget = c.spend;
    if (c.id === bestCamp?.id) {
      suggestedBudget = Math.round(c.spend * 1.25);
    } else if (c.id === worstCamp?.id) {
      suggestedBudget = Math.round(c.spend * 0.70);
    }
    return {
      id: c.id,
      name: c.name,
      currentSpend: c.spend,
      suggestedSpend: suggestedBudget,
      roas: c.roas
    };
  });

  const creativeInsights = {
    best: "Cleopatra Carousel Ad (ROAS 10.05x, CTR 1.83%)",
    worst: "Traffic Banner Ad (ROAS 2.63x, High Clicks but low purchase conversions)",
    highClickLowConv: "Saffron मुगल Mockup Ad (High link clicks but cart completion rate below 1.5%)"
  };

  return NextResponse.json({
    recommendations: {
      critical,
      attention,
      opportunity
    },
    allocations,
    creativeInsights,
    audienceInsights: [
      "Returning custom audiences generate stronger ROAS than broad interest targeting.",
      "Lookalike 1% - Zafiro Purchasers has the highest customer acquisition velocity."
    ]
  });
}
