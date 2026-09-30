"use client";

import { useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [shipmozoEnabled, setShipmozoEnabled] = useState(true);
  const [shipmozoApiKey, setShipmozoApiKey] = useState("");
  const [shipmozoSecretKey, setShipmozoSecretKey] = useState("");
  const [shipmozoPickupLocation, setShipmozoPickupLocation] = useState("Jaipur Warehouse");
  const [defaultCourier, setDefaultCourier] = useState("Shipmozo");

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          const s = data.settings || {};
          if (s.shipmozo_enabled !== undefined) setShipmozoEnabled(Boolean(s.shipmozo_enabled));
          if (s.shipmozo_api_key) setShipmozoApiKey(s.shipmozo_api_key);
          if (s.shipmozo_secret_key) setShipmozoSecretKey(s.shipmozo_secret_key);
          if (s.shipmozo_pickup_location) setShipmozoPickupLocation(s.shipmozo_pickup_location);
          if (s.default_courier) setDefaultCourier(s.default_courier);
        }
      } catch (err) {
        console.error("Failed to load shipping settings", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipmozo_enabled: shipmozoEnabled,
          shipmozo_api_key: shipmozoApiKey,
          shipmozo_secret_key: shipmozoSecretKey,
          shipmozo_pickup_location: shipmozoPickupLocation,
          default_courier: defaultCourier
        })
      });
      if (res.ok) {
        addToast("Shipping & Courier API settings saved successfully!");
      } else {
        addToast("Failed to save settings. Please try again.");
      }
    } catch {
      addToast("Network error while saving settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Shipping & Logistics"
        subtitle="Configure live Courier APIs (Shipmozo, Shiprocket), shipping zones, and rates"
        action={<Btn size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Btn>}
      />

      {/* Shipmozo Integration Card */}
      <SectionCard title="Shipmozo Courier API Integration">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-stone/5 rounded-md border border-stone/15">
            <div>
              <p className="text-sm font-semibold text-ink">Enable Automated Shipmozo Dispatch</p>
              <p className="text-xs text-stone">When enabled, marking an order as shipped automatically pushes order details to Shipmozo API to generate live AWBs.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={shipmozoEnabled}
                onChange={(e) => setShipmozoEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-madder"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Shipmozo API Key</label>
              <input
                type="text"
                placeholder="e.g. sm_live_1234567890abcdef"
                value={shipmozoApiKey}
                onChange={(e) => setShipmozoApiKey(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Shipmozo Public/Secret Key</label>
              <input
                type="password"
                placeholder="e.g. ••••••••••••••••••"
                value={shipmozoSecretKey}
                onChange={(e) => setShipmozoSecretKey(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Warehouse Pickup Location Name</label>
              <input
                type="text"
                placeholder="e.g. Jaipur Main Store"
                value={shipmozoPickupLocation}
                onChange={(e) => setShipmozoPickupLocation(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Default Courier Provider</label>
              <select
                value={defaultCourier}
                onChange={(e) => setDefaultCourier(e.target.value)}
                className={inputCls}
              >
                <option value="Shipmozo">Shipmozo (Auto Courier Aggregator)</option>
                <option value="Delhivery Direct">Delhivery Direct</option>
                <option value="Shiprocket">Shiprocket API</option>
                <option value="Blue Dart">Blue Dart</option>
              </select>
            </div>
          </div>
        </div>
      </SectionCard>

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

        <SectionCard title="Courier Integration Status">
          <div className="space-y-3">
            {[
              { name: "Shipmozo", api: shipmozoApiKey ? "Configured & Ready" : "API Key Pending", status: shipmozoApiKey ? "active" : "inactive" },
              { name: "Delhivery", api: "Configured via env", status: "active" },
              { name: "Blue Dart", api: "Configured via env", status: "active" },
              { name: "Shiprocket", api: "Available via API", status: "inactive" },
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

