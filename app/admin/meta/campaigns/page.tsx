"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, StatusBadge, Btn, useToast } from "@/components/admin/Shared";
import { MetaWrapper } from "@/components/admin/MetaWrapper";

interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: "Active" | "Paused" | "Draft" | "Completed" | "Archived" | "Error";
  budget: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  revenue: number;
  roas: number;
}

function fmt(n: number) { return "₹" + Math.round(n).toLocaleString("en-IN"); }

export default function MetaCampaignsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: "", objective: "Sales", budget: "₹1,000 / day", startDate: "", endDate: "" });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  function fetchCampaigns() {
    setLoading(true);
    fetch("/api/admin/meta/campaigns")
      .then((r) => r.json())
      .then((data) => {
        setCampaigns(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }

  async function toggleStatus(camp: Campaign) {
    const newStatus = camp.status === "Active" ? "Paused" : "Active";
    if (!confirm(`Are you sure you want to ${newStatus === "Active" ? "resume" : "pause"} campaign "${camp.name}"? This will update delivery settings directly on Meta.`)) return;

    const res = await fetch("/api/admin/meta/campaigns", {
      method: "POST", // Simulating toggle through save
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: camp.id, status: newStatus })
    });
    if (res.ok) {
      addToast(`Campaign "${camp.name}" updated on Meta.`);
      fetchCampaigns();
    }
  }

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/meta/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      addToast(`New campaign "${form.name}" generated in Draft mode.`);
      setShowAddForm(false);
      fetchCampaigns();
    }
  }

  return (
    <MetaWrapper>
      <PageShell>
        <PageHeader
          title="Campaigns Management"
          subtitle="Publish campaigns, pause ad delivery, adjust bidding budgets, and track attributed purchases."
          action={<Btn size="sm" onClick={() => setShowAddForm(!showAddForm)}>{showAddForm ? "View Campaigns" : "Create Campaign"}</Btn>}
        />

        {loading ? (
          <LoadingSpinner />
        ) : showAddForm ? (
          <SectionCard title="Create advertising Campaign">
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">Campaign Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">Advertising Objective</label>
                  <select
                    value={form.objective}
                    onChange={(e) => setForm({ ...form, objective: e.target.value })}
                    className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder"
                  >
                    <option value="Sales">Sales (Conversion optimization)</option>
                    <option value="Traffic">Traffic (Link Clicks)</option>
                    <option value="Engagement">Engagement (Page Likes / Comments)</option>
                    <option value="Leads">Leads (Instant Forms)</option>
                    <option value="Awareness">Awareness (Reach / Brand recalls)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">Budget Bidding Option</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ₹1,000 / day"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder"
                  />
                </div>
              </div>
              <Btn type="submit">Create Campaign</Btn>
            </form>
          </SectionCard>
        ) : (
          <SectionCard title="Active Ad Campaigns">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone/20 bg-paper/50">
                  {["Campaign Name", "Objective", "Budget", "Spend", "Purchases", "Revenue", "ROAS", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/40">
                    <td className="px-4 py-3 font-semibold text-indigo cursor-pointer" onClick={() => router.push(`/admin/meta/campaigns/${c.id}`)}>
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone font-semibold uppercase">{c.objective}</td>
                    <td className="px-4 py-3 text-xs font-mono">{c.budget}</td>
                    <td className="px-4 py-3 font-medium">{fmt(c.spend)}</td>
                    <td className="px-4 py-3 font-semibold">{c.purchases} sales</td>
                    <td className="px-4 py-3 font-bold text-green-800">{fmt(c.revenue)}</td>
                    <td className="px-4 py-3 font-semibold text-indigo">{c.roas.toFixed(2)}x</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        c.status === "Active" ? "bg-green-700/10 text-green-800" : "bg-stone/20 text-stone"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs space-x-2">
                      <button onClick={() => toggleStatus(c)} className="text-indigo hover:underline font-semibold">
                        {c.status === "Active" ? "Pause" : "Resume"}
                      </button>
                    </td>
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
