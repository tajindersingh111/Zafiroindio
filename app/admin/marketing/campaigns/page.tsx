"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, Btn, useToast } from "@/components/admin/Shared";

interface Campaign {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  discount: string;
  coupon: string;
  segment: string;
  isActive: boolean;
}

export default function CampaignsPage() {
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "", discount: "", coupon: "", segment: "VIP Customers" });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  function fetchCampaigns() {
    setLoading(true);
    fetch("/api/admin/campaigns")
      .then((r) => r.json())
      .then((data) => {
        setCampaigns(data);
        setLoading(false);
      });
  }

  async function toggleStatus(camp: Campaign) {
    const res = await fetch("/api/admin/campaigns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: camp.id, isActive: !camp.isActive })
    });
    if (res.ok) {
      addToast(`Campaign "${camp.name}" status updated.`);
      fetchCampaigns();
    }
  }

  async function handleAddCampaign(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      addToast(`Campaign "${form.name}" launched successfully.`);
      setForm({ name: "", startDate: "", endDate: "", discount: "", coupon: "", segment: "VIP Customers" });
      setShowAddForm(false);
      fetchCampaigns();
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Discount Campaigns"
        subtitle="Manage end-to-end promotional events and target specific customer cohorts."
        action={<Btn size="sm" onClick={() => setShowAddForm(!showAddForm)}>{showAddForm ? "View List" : "Launch Campaign"}</Btn>}
      />

      {loading ? (
        <LoadingSpinner />
      ) : showAddForm ? (
        <SectionCard title="Launch a New Campaign">
          <form onSubmit={handleAddCampaign} className="space-y-4">
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">Discount Amount / Offer</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 15% off, Buy 1 Get 1"
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.value })}
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
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">Promo Coupon Code</label>
                <input
                  type="text"
                  placeholder="e.g. FESTIVE15"
                  value={form.coupon}
                  onChange={(e) => setForm({ ...form, coupon: e.target.value })}
                  className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">Target Customer Cohort</label>
                <select
                  value={form.segment}
                  onChange={(e) => setForm({ ...form, segment: e.target.value })}
                  className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder"
                >
                  <option value="All Customers">All Customers</option>
                  <option value="VIP Customers">VIP Customers</option>
                  <option value="New Customers">New Customers</option>
                  <option value="Inactive Customers">Inactive Customers</option>
                </select>
              </div>
            </div>
            <Btn type="submit">Launch Campaign</Btn>
          </form>
        </SectionCard>
      ) : (
        <SectionCard title="Active Marketing Campaigns">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone/20 bg-paper/50">
                {["Campaign", "Discount", "Promo Code", "Target Segment", "Validity", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-stone/10 last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">{c.name}</td>
                  <td className="px-4 py-3">{c.discount}</td>
                  <td className="px-4 py-3 font-mono text-indigo font-bold">{c.coupon || "N/A"}</td>
                  <td className="px-4 py-3 text-xs text-stone font-semibold">{c.segment}</td>
                  <td className="px-4 py-3 text-xs text-stone">{c.startDate} to {c.endDate}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${c.isActive ? "bg-green-700/10 text-green-800" : "bg-stone/20 text-stone"}`}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(c)} className="text-xs text-indigo hover:underline font-semibold">
                      {c.isActive ? "Pause" : "Resume"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}
    </PageShell>
  );
}
