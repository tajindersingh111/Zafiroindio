"use client";

import { PageShell, PageHeader, SectionCard } from "@/components/admin/Shared";

export default function PaymentsPage() {
  return (
    <PageShell>
      <PageHeader title="Payment Gateways" subtitle="Configure payment methods for your store" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { name: "UPI / QR", desc: "Accept UPI payments via Google Pay, PhonePe, Paytm and any UPI-compatible app.", enabled: true, badge: "Popular" },
          { name: "Razorpay", desc: "Accept cards, net banking, wallets and UPI through Razorpay.", enabled: false, badge: null },
          { name: "Paytm Payment Gateway", desc: "Accept Paytm Wallet, UPI, cards and net banking.", enabled: false, badge: null },
          { name: "Cash on Delivery", desc: "Allow customers to pay when they receive the order.", enabled: true, badge: null },
          { name: "Bank Transfer / NEFT", desc: "Provide bank details and manually confirm payments.", enabled: true, badge: "B2B" },
          { name: "Stripe", desc: "Accept international cards and payments via Stripe.", enabled: false, badge: "International" },
        ].map((gw) => (
          <SectionCard key={gw.name}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-ink">{gw.name}</h3>
                  {gw.badge && <span className="px-2 py-0.5 text-[10px] uppercase tracking-wide font-bold bg-indigo/10 text-indigo rounded-full">{gw.badge}</span>}
                </div>
                <p className="text-sm text-stone">{gw.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                <input type="checkbox" defaultChecked={gw.enabled} className="sr-only peer" />
                <div className="w-11 h-6 bg-stone/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo"></div>
              </label>
            </div>
          </SectionCard>
        ))}
      </div>
      <div className="bg-turmeric/10 border border-turmeric/30 rounded-sm px-5 py-4 text-sm text-[#8a6519]">
        <strong>Note:</strong> Payment gateway credentials (API keys, secrets) must be configured via environment variables. Contact your developer to set up live integrations.
      </div>
    </PageShell>
  );
}
