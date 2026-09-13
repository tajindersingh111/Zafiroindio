"use client";

import { PageShell, PageHeader, SectionCard, Btn, useToast } from "@/components/admin/Shared";

const TAX_SLABS = [
  { name: "Standard Rate — Textiles", rate: "5%", desc: "Applicable on cotton & textile products (HSN 5208-5212)" },
  { name: "Standard Rate — Home Décor", rate: "18%", desc: "Applicable on home décor articles" },
  { name: "Reduced Rate", rate: "0%", desc: "Khadi and handloom textiles" },
  { name: "Shipping (Standard)", rate: "18%", desc: "GST on courier/shipping services" },
];

const STATE_CODES = [
  { state: "Rajasthan", code: "08" }, { state: "Delhi", code: "07" }, { state: "Maharashtra", code: "27" },
  { state: "Karnataka", code: "29" }, { state: "Tamil Nadu", code: "33" }, { state: "West Bengal", code: "19" },
];

export default function TaxesPage() {
  const { addToast } = useToast();

  return (
    <PageShell>
      <PageHeader title="Taxes" subtitle="GST configuration for India" action={<Btn size="sm" onClick={() => addToast("Tax settings saved.")}>Save</Btn>} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="GST Configuration">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">GSTIN</label>
              <input defaultValue="GSTIN-XXXXXXXXXXXX" className="w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-madder/40 font-mono tracking-widest" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">State of Business Registration</label>
              <select className="w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-madder/40">
                {STATE_CODES.map((s) => <option key={s.code} value={s.code}>{s.state} ({s.code})</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-indigo" />
              Prices include tax (display tax-inclusive prices)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-indigo" />
              Show tax line item on invoices
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Tax Classes">
          <div className="space-y-3">
            {TAX_SLABS.map((t) => (
              <div key={t.name} className="flex items-start justify-between py-2.5 border-b border-stone/10 last:border-0">
                <div>
                  <p className="text-sm font-medium text-ink">{t.name}</p>
                  <p className="text-xs text-stone">{t.desc}</p>
                </div>
                <span className="text-sm font-bold text-indigo ml-4 shrink-0">{t.rate}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Tax Inclusive Pricing Note">
        <p className="text-sm text-stone leading-relaxed">
          All product prices entered in the admin should be <strong className="text-ink">tax-inclusive</strong>. The system will automatically calculate and separate the GST component on invoices. For B2B orders, GST details will be shown separately with GSTIN of the buyer where provided.
        </p>
      </SectionCard>
    </PageShell>
  );
}
