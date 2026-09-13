"use client";

import { useState } from "react";
import { PageShell, PageHeader, SectionCard, Btn, useToast } from "@/components/admin/Shared";

const inputCls = "w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-madder/40";

const ZONES = [
  { name: "Rajasthan (Home State)", states: "RJ", courier: "DTDC / Delhivery", rate: "₹0 (free)", minOrder: "₹0", days: "1-2 days" },
  { name: "Metro Cities", states: "DL, MH, KA, TN, WB", courier: "Blue Dart / Delhivery", rate: "₹100", minOrder: "₹0", days: "2-3 days" },
  { name: "Rest of India", states: "All other states", courier: "Delhivery / DTDC", rate: "₹100", minOrder: "₹0", days: "3-5 days" },
  { name: "Free Shipping Threshold", states: "All India", courier: "—", rate: "₹0 (when order ≥ ₹2,999)", minOrder: "₹2,999", days: "Standard" },
];

export default function ShippingPage() {
  const { addToast } = useToast();
  const [zones] = useState(ZONES);

  return (
    <PageShell>
      <PageHeader title="Shipping" subtitle="Shipping zones, rates and courier configuration" action={<Btn size="sm" onClick={() => addToast("Shipping settings saved.")}>Save Settings</Btn>} />

      <SectionCard title="Shipping Zones & Rates">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-stone/20 bg-paper/50">{["Zone", "States / Region", "Courier", "Rate", "Free Threshold", "Delivery Time"].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>)}</tr></thead>
          <tbody>
            {zones.map((z, i) => (
              <tr key={i} className="border-b border-stone/10 last:border-0 hover:bg-paper/50">
                <td className="px-4 py-3 font-semibold text-ink">{z.name}</td>
                <td className="px-4 py-3 text-stone text-xs">{z.states}</td>
                <td className="px-4 py-3 text-stone text-xs">{z.courier}</td>
                <td className="px-4 py-3 font-medium text-ink">{z.rate}</td>
                <td className="px-4 py-3 text-stone">{z.minOrder}</td>
                <td className="px-4 py-3 text-stone text-xs">{z.days}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="Packaging & Dimensions">
          <div className="space-y-4 text-sm">
            {[["Default package weight (kg)", "0.5"], ["Max box length (cm)", "100"], ["Max box width (cm)", "60"], ["Max box height (cm)", "30"]].map(([label, val]) => (
              <div key={label}>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">{label}</label>
                <input type="number" defaultValue={val} className={inputCls} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Courier Partners">
          <div className="space-y-3">
            {[
              { name: "Delhivery", api: "Configured via env", status: "active" },
              { name: "Blue Dart", api: "Configured via env", status: "active" },
              { name: "DTDC", api: "Not configured", status: "inactive" },
              { name: "Shiprocket", api: "Not configured", status: "inactive" },
            ].map((c) => (
              <div key={c.name} className="flex items-center justify-between py-2 border-b border-stone/10 last:border-0">
                <div>
                  <p className="text-sm font-medium text-ink">{c.name}</p>
                  <p className="text-xs text-stone">{c.api}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${c.status === "active" ? "bg-green-700/10 text-green-800" : "bg-stone/20 text-stone"}`}>{c.status}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
