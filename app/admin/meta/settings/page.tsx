"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, Btn, useToast, LoadingSpinner } from "@/components/admin/Shared";

const inputCls = "w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-madder/40";

interface MetaConfig {
  isConnected: boolean;
  businessName: string;
  adAccountName: string;
  adAccountId: string;
  pageName: string;
  instagramName: string;
  pixelId: string;
  pixelName: string;
  catalogId: string;
  catalogSyncActive: boolean;
  accessToken: string;
  conversionsApiActive: boolean;
  conversionsApiToken: string;
}

export default function MetaSettingsPage() {
  const { addToast } = useToast();
  const [config, setConfig] = useState<MetaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  function fetchConfig() {
    setLoading(true);
    fetch("/api/admin/meta/config")
      .then((r) => r.json())
      .then((d) => {
        setConfig(d);
        setLoading(false);
      });
  }

  async function handleConnectSandbox() {
    setSaving(true);
    // Seed standard simulated sandbox details
    const sandboxConfig: Partial<MetaConfig> = {
      isConnected: true,
      businessName: "Zafiro Retail Group Ltd",
      adAccountName: "Zafiro Ad Account (India)",
      adAccountId: "act_4892019385920",
      pageName: "Zafiro Indio",
      instagramName: "@zafiro.indio",
      pixelId: "982019385012398",
      pixelName: "Zafiro Web Pixel",
      catalogId: "cat_28930193850",
      catalogSyncActive: true,
      accessToken: "EAAHz...SANDBOX_TOKEN",
      conversionsApiActive: true,
      conversionsApiToken: "CAPI_EAAHz...SANDBOX_TOKEN"
    };

    const res = await fetch("/api/admin/meta/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sandboxConfig),
    });

    if (res.ok) {
      addToast("Successfully connected simulated Meta Ad Account!");
      fetchConfig();
    }
    setSaving(false);
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    const res = await fetch("/api/admin/meta/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      addToast("Meta Advertising settings updated.");
      fetchConfig();
    } else {
      addToast("Failed to save settings.", "error");
    }
    setSaving(false);
  }

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect your Meta account? This will clear all access tokens and active pixels.")) return;
    setSaving(true);
    const res = await fetch("/api/admin/meta/config", { method: "DELETE" });
    if (res.ok) {
      addToast("Meta account disconnected.");
      fetchConfig();
    }
    setSaving(false);
  }

  if (loading || !config) return <PageShell><LoadingSpinner /></PageShell>;

  return (
    <PageShell>
      <PageHeader title="Meta Account & Ads Settings" subtitle="Connect your WooCommerce catalog, track Pixel events, and configure access tokens." />

      {!config.isConnected ? (
        <div className="max-w-2xl mx-auto border border-stone/30 rounded-sm bg-cream-card p-8 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-indigo/10 flex items-center justify-center text-indigo">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
          </div>
          <div>
            <h2 className="text-xl font-display font-semibold text-ink">Connect Meta Ads Account</h2>
            <p className="text-sm text-stone mt-2">Connect your WooCommerce store to Meta Business Manager to sync catalogs, track purchase conversions, and monitor ad sets performance directly in Zafiro.</p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
            <Btn size="md" onClick={handleConnectSandbox} disabled={saving}>
              {saving ? "Connecting..." : "Launch Sandbox Sandbox Account"}
            </Btn>
            <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="px-5 py-2.5 text-sm font-semibold uppercase tracking-wider border border-stone/35 text-indigo text-center rounded-sm hover:bg-paper transition-colors">
              Meta Developers Dashboard
            </a>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Connection Status Header */}
          <div className="flex items-center justify-between p-4 bg-green-700/5 border border-green-700/20 rounded-sm">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-700 animate-pulse" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-green-800">Connected to Meta Business Manager</p>
                <p className="text-sm font-semibold text-ink">{config.businessName} ({config.adAccountName})</p>
              </div>
            </div>
            <Btn variant="secondary" size="sm" onClick={handleDisconnect} disabled={saving}>Disconnect Account</Btn>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Assets */}
            <SectionCard title="Ad Account & Page Config">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Meta Ad Account ID</label>
                  <input
                    type="text"
                    value={config.adAccountId}
                    onChange={(e) => setConfig({ ...config, adAccountId: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Connected Facebook Page</label>
                  <input
                    type="text"
                    value={config.pageName}
                    onChange={(e) => setConfig({ ...config, pageName: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Instagram Account handle</label>
                  <input
                    type="text"
                    value={config.instagramName}
                    onChange={(e) => setConfig({ ...config, instagramName: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Tracking Pixel */}
            <SectionCard title="Meta Pixel Config">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Pixel Name</label>
                  <input
                    type="text"
                    value={config.pixelName}
                    onChange={(e) => setConfig({ ...config, pixelName: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Pixel ID</label>
                  <input
                    type="text"
                    value={config.pixelId}
                    onChange={(e) => setConfig({ ...config, pixelId: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Catalog Sync */}
            <SectionCard title="Catalog Sync settings">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Product Catalog ID</label>
                  <input
                    type="text"
                    value={config.catalogId}
                    onChange={(e) => setConfig({ ...config, catalogId: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="catalog-sync"
                    checked={config.catalogSyncActive}
                    onChange={(e) => setConfig({ ...config, catalogSyncActive: e.target.checked })}
                    className="rounded-sm border-stone/30 text-indigo focus:ring-indigo/40"
                  />
                  <label htmlFor="catalog-sync" className="text-xs font-semibold uppercase tracking-wide text-ink">Enable automatic daily WooCommerce Catalog sync</label>
                </div>
              </div>
            </SectionCard>

            {/* Conversions API */}
            <SectionCard title="Conversions API settings">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="capi-active"
                    checked={config.conversionsApiActive}
                    onChange={(e) => setConfig({ ...config, conversionsApiActive: e.target.checked })}
                    className="rounded-sm border-stone/30 text-indigo focus:ring-indigo/40"
                  />
                  <label htmlFor="capi-active" className="text-xs font-semibold uppercase tracking-wide text-ink">Enable Server-Side Conversions API (CAPI)</label>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">System User Access Token</label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••"
                    value={config.conversionsApiToken}
                    onChange={(e) => setConfig({ ...config, conversionsApiToken: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone/15">
            <Btn type="submit" disabled={saving}>{saving ? "Saving settings..." : "Save Config"}</Btn>
          </div>
        </form>
      )}
    </PageShell>
  );
}
