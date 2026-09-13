"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, Btn, useToast, LoadingSpinner } from "@/components/admin/Shared";

const inputCls = "w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-madder/40";

interface AIConfig {
  forecastPeriodDays: number;
  lowStockRestockThreshold: number;
  inactiveDaysThreshold: number;
  vipSpentThreshold: number;
  targetCpa: number;
  targetRoas: number;
  insightsFrequency: string;
}

export default function AISettingsPage() {
  const { addToast } = useToast();
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/ai/config")
      .then((r) => r.json())
      .then((d) => {
        setConfig(d);
        setLoading(false);
      });
  }, []);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    const res = await fetch("/api/admin/ai/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    if (res.ok) {
      addToast("Zafiro AI Engine configuration parameters updated.");
    } else {
      addToast("Failed to save settings.", "error");
    }
    setSaving(false);
  }

  if (loading || !config) return <PageShell><LoadingSpinner /></PageShell>;

  return (
    <PageShell>
      <PageHeader title="Zafiro AI Engine Configuration Settings" subtitle="Define thresholds for stock alarms, customer segment metrics, and budget optimizer constraints." />

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Forecasting parameters */}
          <SectionCard title="Forecast & Stock Thresholds">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Default Forecast Period (Days)</label>
                <select
                  value={config.forecastPeriodDays}
                  onChange={(e) => setConfig({ ...config, forecastPeriodDays: Number(e.target.value) })}
                  className={inputCls}
                >
                  <option value={7}>Next 7 days</option>
                  <option value={30}>Next 30 days</option>
                  <option value={90}>Next 90 days</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Low-Stock Alert Restock Threshold (Days remaining)</label>
                <input
                  type="number"
                  value={config.lowStockRestockThreshold}
                  onChange={(e) => setConfig({ ...config, lowStockRestockThreshold: Number(e.target.value) })}
                  className={inputCls}
                />
              </div>
            </div>
          </SectionCard>

          {/* Customer intelligence */}
          <SectionCard title="Customer Cohort Criteria">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Customer Inactivity Threshold (Days)</label>
                <input
                  type="number"
                  value={config.inactiveDaysThreshold}
                  onChange={(e) => setConfig({ ...config, inactiveDaysThreshold: Number(e.target.value) })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">VIP Customer Lifetime spent Threshold (₹)</label>
                <input
                  type="number"
                  value={config.vipSpentThreshold}
                  onChange={(e) => setConfig({ ...config, vipSpentThreshold: Number(e.target.value) })}
                  className={inputCls}
                />
              </div>
            </div>
          </SectionCard>

          {/* Marketing limits */}
          <SectionCard title="Marketing Constraints Optimization">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Target Acquisition CPA Limit (₹)</label>
                <input
                  type="number"
                  value={config.targetCpa}
                  onChange={(e) => setConfig({ ...config, targetCpa: Number(e.target.value) })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Target Minimum ROAS Target (x)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.targetRoas}
                  onChange={(e) => setConfig({ ...config, targetRoas: Number(e.target.value) })}
                  className={inputCls}
                />
              </div>
            </div>
          </SectionCard>

          {/* Execution details */}
          <SectionCard title="AI Analysis Cadence">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">AI Insights Calculations Cadence</label>
                <select
                  value={config.insightsFrequency}
                  onChange={(e) => setConfig({ ...config, insightsFrequency: e.target.value })}
                  className={inputCls}
                >
                  <option value="realtime">Real-time dynamic recalculations</option>
                  <option value="daily">Cached daily cron job updates (Recommended)</option>
                  <option value="weekly">Weekly batch logs parsing</option>
                </select>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="flex justify-end pt-4 border-t border-stone/15">
          <Btn type="submit" disabled={saving}>{saving ? "Saving settings..." : "Save AI Parameters"}</Btn>
        </div>
      </form>
    </PageShell>
  );
}
