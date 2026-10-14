"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, Btn, useToast, LoadingSpinner } from "@/components/admin/Shared";

const inputCls = "w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-madder/40";

interface Settings {
  storeName: string; storeEmail: string; storePhone: string;
  currency: string; currencySymbol: string; timezone: string;
  storeAddress: { address1: string; city: string; state: string; postalCode: string; country: string };
  lowStockThreshold: number;
  whatsappProvider?: string;
  whatsappToken?: string;
  whatsappPhoneId?: string;
  whatsappAccountSid?: string;
  whatsappTemplateName?: string;
  whatsappTemplateLang?: string;
  whatsappOrderConfirm?: boolean;
  whatsappOrderShipped?: boolean;
  shiprocketCheckoutEnabled?: boolean;
  shiprocketAppId?: string;
  shiprocketToken?: string;
}

export default function SettingsPage() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => {
      const s = d.settings ?? {};
      setSettings({
        storeName: s.storeName ?? "",
        storeEmail: s.storeEmail ?? "",
        storePhone: s.storePhone ?? "",
        currency: s.currency ?? "INR",
        currencySymbol: s.currencySymbol ?? "₹",
        timezone: s.timezone ?? "Asia/Kolkata",
        lowStockThreshold: s.lowStockThreshold ?? 10,
        whatsappProvider: s.whatsappProvider ?? "meta",
        whatsappToken: s.whatsappToken ?? "",
        whatsappPhoneId: s.whatsappPhoneId ?? "",
        whatsappAccountSid: s.whatsappAccountSid ?? "",
        whatsappTemplateName: s.whatsappTemplateName ?? "",
        whatsappTemplateLang: s.whatsappTemplateLang ?? "en",
        whatsappOrderConfirm: s.whatsappOrderConfirm !== undefined ? s.whatsappOrderConfirm : true,
        whatsappOrderShipped: s.whatsappOrderShipped !== undefined ? s.whatsappOrderShipped : true,
        shiprocketCheckoutEnabled: s.shiprocketCheckoutEnabled !== undefined ? s.shiprocketCheckoutEnabled : true,
        shiprocketAppId: s.shiprocketAppId ?? "",
        shiprocketToken: s.shiprocketToken ?? "",
        storeAddress: {
          address1: s.storeAddress?.address1 ?? "",
          city: s.storeAddress?.city ?? "",
          state: s.storeAddress?.state ?? "",
          postalCode: s.storeAddress?.postalCode ?? "",
          country: s.storeAddress?.country ?? "",
        },
      });
      setLoading(false);
    });
  }, []);

  function set(key: keyof Settings, value: unknown) {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    if (res.ok) addToast("Settings saved.");
    else addToast("Failed to save.", "error");
    setSaving(false);
  }

  async function sendTestWhatsApp() {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/settings/whatsapp-test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: testPhone }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) addToast("Test message sent. Check WhatsApp.");
      else addToast(data.error || "Test message failed.", "error");
    } catch {
      addToast("Test message failed.", "error");
    } finally {
      setTesting(false);
    }
  }

  if (loading || !settings) return <LoadingSpinner />;
  const provider = settings.whatsappProvider || "meta";

  return (
    <PageShell>
      <PageHeader title="Store Settings" subtitle="Configure core store parameters, inventory thresholds, and external integrations." action={<Btn onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Settings"}</Btn>} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Store Information">
          <div className="space-y-4">
            {([
              { label: "Store Name", key: "storeName" as const },
              { label: "Store Email", key: "storeEmail" as const },
              { label: "Phone", key: "storePhone" as const },
            ] as { label: string; key: keyof Settings }[]).map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">{label}</label>
                <input value={String(settings[key] ?? "")} onChange={(e) => set(key, e.target.value)} className={inputCls} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Address">
          <div className="space-y-4">
            {([
              ["Street Address", "address1"],
              ["City", "city"],
              ["State", "state"],
              ["Postal Code", "postalCode"],
              ["Country", "country"],
            ] as [string, string][]).map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">{label}</label>
                <input
                  value={settings.storeAddress[key as keyof typeof settings.storeAddress] ?? ""}
                  onChange={(e) => set("storeAddress", { ...settings.storeAddress, [key]: e.target.value })}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Currency & Locale">
          <div className="space-y-4">
            {([
              { label: "Currency Code", key: "currency" },
              { label: "Currency Symbol", key: "currencySymbol" },
              { label: "Timezone", key: "timezone" },
            ]).map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">{label}</label>
                <input value={String(settings[key as keyof Settings] ?? "")} onChange={(e) => set(key as keyof Settings, e.target.value)} className={inputCls} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Inventory Settings">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Default Low Stock Threshold</label>
            <input type="number" min={1} value={settings.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Number(e.target.value))} className={inputCls} />
            <p className="text-xs text-stone mt-1.5">Products with stock at or below this number will be flagged as low stock.</p>
          </div>
        </SectionCard>

        {/* Shiprocket 1-Click Checkout Engine */}
        <SectionCard title="Shiprocket 1-Click Fast Checkout Engine">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone/20">
              <input
                type="checkbox"
                id="shiprocket-enable"
                checked={settings.shiprocketCheckoutEnabled}
                onChange={(e) => set("shiprocketCheckoutEnabled", e.target.checked)}
                className="rounded-sm border-stone/30 text-indigo focus:ring-indigo/40"
              />
              <label htmlFor="shiprocket-enable" className="text-xs font-semibold uppercase text-ink cursor-pointer">
                Enable Shiprocket 1-Click Fast Checkout (OTP + Autofill)
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Shiprocket App ID / Merchant Key</label>
              <input
                type="text"
                placeholder="e.g. sr_app_982347"
                value={settings.shiprocketAppId}
                onChange={(e) => set("shiprocketAppId", e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Shiprocket Secret Token</label>
              <input
                type="password"
                placeholder="••••••••••••••••••••••••••••"
                value={settings.shiprocketToken}
                onChange={(e) => set("shiprocketToken", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </SectionCard>

        {/* WhatsApp Integration Settings */}
        <SectionCard title="WhatsApp Integration settings" className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">WhatsApp API Provider</label>
                <select
                  value={settings.whatsappProvider}
                  onChange={(e) => set("whatsappProvider", e.target.value)}
                  className={inputCls}
                >
                  <option value="meta">Meta Cloud API (Official)</option>
                  <option value="twilio">Twilio Messaging API</option>
                  <option value="greenapi">Green API (Instance)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">
                  {provider === "twilio" ? "Sender WhatsApp Number" : provider === "greenapi" ? "idInstance" : "Phone Number ID"}
                </label>
                <input
                  type="text"
                  placeholder={provider === "twilio" ? "e.g. +14155238886" : provider === "greenapi" ? "e.g. 1101000001" : "e.g. 10928374928"}
                  value={settings.whatsappPhoneId}
                  onChange={(e) => set("whatsappPhoneId", e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">
                  {provider === "twilio" ? "Auth Token" : provider === "greenapi" ? "apiTokenInstance" : "System Access Token"}
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••••••••••••••"
                  value={settings.whatsappToken}
                  onChange={(e) => set("whatsappToken", e.target.value)}
                  className={inputCls}
                />
              </div>

              {provider === "twilio" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Account SID</label>
                  <input
                    type="text"
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={settings.whatsappAccountSid}
                    onChange={(e) => set("whatsappAccountSid", e.target.value)}
                    className={inputCls}
                  />
                </div>
              )}

              {provider === "meta" && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Order Template Name</label>
                    <input
                      type="text"
                      placeholder="e.g. order_confirmation"
                      value={settings.whatsappTemplateName}
                      onChange={(e) => set("whatsappTemplateName", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Language</label>
                    <input
                      type="text"
                      placeholder="en"
                      value={settings.whatsappTemplateLang}
                      onChange={(e) => set("whatsappTemplateLang", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <p className="col-span-3 text-[11px] leading-relaxed text-stone">
                    Meta only delivers business-started messages through an approved template. Create a Utility template in WhatsApp Manager
                    whose body uses {"{{1}}"} = customer name, {"{{2}}"} = order number, {"{{3}}"} = order total.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone mb-1">Notification triggers</p>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confirm-trigger"
                  checked={settings.whatsappOrderConfirm}
                  onChange={(e) => set("whatsappOrderConfirm", e.target.checked)}
                  className="rounded-sm border-stone/30 text-indigo focus:ring-indigo/40"
                />
                <label htmlFor="confirm-trigger" className="text-xs font-semibold uppercase text-ink">Order Confirmation Notification</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="shipped-trigger"
                  checked={settings.whatsappOrderShipped}
                  onChange={(e) => set("whatsappOrderShipped", e.target.checked)}
                  className="rounded-sm border-stone/30 text-indigo focus:ring-indigo/40"
                />
                <label htmlFor="shipped-trigger" className="text-xs font-semibold uppercase text-ink">Order Shipped (with Tracking Link)</label>
              </div>

              <div className="pt-4 border-t border-stone/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone mb-1.5">Send a test message</p>
                <p className="text-[11px] text-stone mb-2">Save settings first, then send a test to your own number.</p>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="e.g. 98765 43210"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className={inputCls}
                  />
                  <Btn onClick={sendTestWhatsApp} disabled={testing || !testPhone.trim()}>{testing ? "Sending…" : "Send"}</Btn>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="flex justify-end mt-4">
        <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Settings"}</Btn>
      </div>
    </PageShell>
  );
}
