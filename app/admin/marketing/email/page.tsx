"use client";

import { useState } from "react";
import { PageShell, PageHeader, SectionCard, Btn, useToast } from "@/components/admin/Shared";

export default function EmailCampaignsPage() {
  const { addToast } = useToast();
  const [form, setForm] = useState({ subject: "", template: "welcome", segment: "New Customers" });
  const [sending, setSending] = useState(false);

  async function handleSendCampaign(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    // Simulate API delay
    setTimeout(() => {
      addToast(`Email campaign dispatched to all matching recipients in "${form.segment}" segment!`);
      setForm({ subject: "", template: "welcome", segment: "New Customers" });
      setSending(false);
    }, 1500);
  }

  return (
    <PageShell>
      <PageHeader title="Targeted Email Campaigns" subtitle="Draft and execute segment-targeted newsletters and promotional emails." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Draft New Email Campaign" className="lg:col-span-2">
          <form onSubmit={handleSendCampaign} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">Email Subject Line</label>
              <input
                type="text"
                required
                placeholder="e.g. Exclusive 15% discount just for you!"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">Target Segment</label>
                <select
                  value={form.segment}
                  onChange={(e) => setForm({ ...form, segment: e.target.value })}
                  className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder"
                >
                  <option value="New Customers">New Customers</option>
                  <option value="VIP Customers">VIP Customers (High Value)</option>
                  <option value="Inactive Customers">Inactive Customers (Win-back)</option>
                  <option value="Cart Abandoners">Cart Abandoners (Recovery)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">Select Template</label>
                <select
                  value={form.template}
                  onChange={(e) => setForm({ ...form, template: e.target.value })}
                  className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder"
                >
                  <option value="welcome">Welcome Onboarding Email</option>
                  <option value="winback">Win-back Coupon Offer</option>
                  <option value="newsletter">Monsoon Mughal Launch Newsletter</option>
                  <option value="abandoned">Cart Recovery Reminder</option>
                </select>
              </div>
            </div>

            <Btn type="submit" disabled={sending}>
              {sending ? "Dispatching Emails..." : "Send Campaign Now"}
            </Btn>
          </form>
        </SectionCard>

        <SectionCard title="SMTP Connection Status">
          <div className="flex flex-col justify-between h-full min-h-[160px]">
            <div>
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">SMTP Server Status</p>
              <p className="text-sm font-semibold text-madder mt-1">Not Connected</p>
            </div>
            <div className="bg-madder/5 border border-madder/20 p-3.5 rounded-sm">
              <p className="text-[11px] text-[#8c2a1a] font-semibold">Delivery metrics and SMTP are disconnected</p>
              <p className="text-[10px] text-stone mt-1">Configure SMTP servers and newsletter webhooks under Settings to start tracking open/click rates.</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
