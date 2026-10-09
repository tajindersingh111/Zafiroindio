"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, Btn, LoadingSpinner, useToast } from "@/components/admin/Shared";

const inputCls = "w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-madder/40 disabled:opacity-60";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5";

interface Warehouse { id: string; name: string; pincode?: string; address?: string; isDefault: boolean }
interface Status {
  configured: boolean;
  connected: boolean;
  connectionError: string | null;
  source: "env" | "settings" | null;
  publicKeyHint: string | null;
  warehouses: Warehouse[];
  warehouseId: string;
  pickupPincode: string;
  autoPush: boolean;
  itemWeightKg: number;
  box: { l: number; w: number; h: number };
  cronConfigured: boolean;
  webhookConfigured: boolean;
}

export default function ShippingPage() {
  const { addToast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState("");

  const [publicKey, setPublicKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [pickupPincode, setPickupPincode] = useState("");
  const [autoPush, setAutoPush] = useState(true);
  const [itemWeightKg, setItemWeightKg] = useState("1");
  const [box, setBox] = useState({ l: "30", w: "25", h: "8" });

  function apply(s: Status) {
    setStatus(s);
    setWarehouseId(s.warehouseId);
    setPickupPincode(s.pickupPincode);
    setAutoPush(s.autoPush);
    setItemWeightKg(String(s.itemWeightKg));
    setBox({ l: String(s.box.l), w: String(s.box.w), h: String(s.box.h) });
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/admin/shipping")
      .then((r) => r.json())
      .then(apply)
      .catch(() => addToast("Could not load shipping settings.", "error"));
  }, [addToast]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/shipping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey, privateKey, warehouseId, pickupPincode, autoPush, itemWeightKg: Number(itemWeightKg), box: { l: Number(box.l), w: Number(box.w), h: Number(box.h) } }),
      });
      const data = await res.json();
      if (!res.ok) return addToast(data.error || "Could not save.", "error");
      apply(data);
      setPublicKey("");
      setPrivateKey("");
      if (data.connected) addToast("Saved. ShipMozo is connected.");
      else if (data.configured) addToast(`Saved, but ShipMozo rejected the keys: ${data.connectionError}`, "error");
      else addToast("Saved.");
    } catch {
      addToast("Network error while saving.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!status) return <LoadingSpinner />;
  const fromEnv = status.source === "env";

  return (
    <PageShell>
      <PageHeader
        title="Shipping"
        subtitle="Couriers are booked through ShipMozo. Checkout, OTP and payment run on Shiprocket Checkout (Fastrr)."
        action={<Btn size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save & test connection"}</Btn>}
      />

      <SectionCard title="ShipMozo connection">
        <div className="space-y-4 text-sm">
          <div className={`flex items-start gap-3 p-3 rounded border ${status.connected ? "bg-emerald-900/5 border-emerald-800/25" : "bg-madder/5 border-madder/25"}`}>
            <span className={`mt-0.5 h-2.5 w-2.5 rounded-full shrink-0 ${status.connected ? "bg-emerald-600" : "bg-madder"}`} />
            <div>
              <p className="font-semibold text-ink">
                {status.connected ? "Connected" : status.configured ? "Keys saved, but ShipMozo rejected them" : "Not connected"}
              </p>
              <p className="text-xs text-stone mt-0.5">
                {status.connected
                  ? `Public key ${status.publicKeyHint} · ${status.warehouses.length} pickup warehouse${status.warehouses.length === 1 ? "" : "s"} found${fromEnv ? " · keys come from server environment variables" : ""}`
                  : status.configured
                    ? status.connectionError
                    : "Paste the API keys from ShipMozo panel → Settings → API, then press Save."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Public key</label>
              <input className={inputCls} value={publicKey} onChange={(e) => setPublicKey(e.target.value)} disabled={fromEnv} autoComplete="off"
                placeholder={status.publicKeyHint ? `Saved (${status.publicKeyHint}) — leave blank to keep` : "Paste public key"} />
            </div>
            <div>
              <label className={labelCls}>Private key</label>
              <input className={inputCls} type="password" value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} disabled={fromEnv} autoComplete="new-password"
                placeholder={status.configured ? "Saved — leave blank to keep" : "Paste private key"} />
            </div>
            <div>
              <label className={labelCls}>Pickup warehouse</label>
              <select className={inputCls} value={warehouseId} disabled={!status.warehouses.length}
                onChange={(e) => {
                  setWarehouseId(e.target.value);
                  const w = status.warehouses.find((x) => x.id === e.target.value);
                  if (w?.pincode) setPickupPincode(w.pincode);
                }}>
                <option value="">{status.warehouses.length ? "ShipMozo default warehouse" : "Connect ShipMozo to load warehouses"}</option>
                {status.warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}{w.pincode ? ` · ${w.pincode}` : ""}{w.isDefault ? " (default)" : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Pickup PIN code</label>
              <input className={inputCls} value={pickupPincode} onChange={(e) => setPickupPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Taken from the warehouse" inputMode="numeric" />
            </div>
          </div>

          <label className="flex items-center justify-between gap-4 p-3 bg-stone/5 rounded-md border border-stone/15 cursor-pointer">
            <span>
              <span className="block font-semibold text-ink">Send new orders to ShipMozo automatically</span>
              <span className="block text-xs text-stone">Every paid / COD order appears in the ShipMozo panel right away. No courier is booked and nothing is charged until you press Dispatch.</span>
            </span>
            <input type="checkbox" checked={autoPush} onChange={(e) => setAutoPush(e.target.checked)} className="h-4 w-4 accent-madder shrink-0" />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Default parcel">
        <p className="text-xs text-stone mb-3">Used when you don&apos;t enter a weight while dispatching. Weight is per item (a 3-item order = 3 × this), minimum 0.5 kg.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <label className={labelCls}>Weight per item (kg)</label>
            <input type="number" step="0.1" min="0.1" className={inputCls} value={itemWeightKg} onChange={(e) => setItemWeightKg(e.target.value)} />
          </div>
          {(["l", "w", "h"] as const).map((k) => (
            <div key={k}>
              <label className={labelCls}>Box {k === "l" ? "length" : k === "w" ? "width" : "height"} (cm)</label>
              <input type="number" min="1" className={inputCls} value={box[k]} onChange={(e) => setBox({ ...box, [k]: e.target.value })} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Tracking updates">
        <div className="space-y-3 text-sm">
          <p className="text-xs text-stone">Courier status (picked up, out for delivery, delivered, RTO) flows back into the order and the customer gets an e-mail. The tracking page also refreshes live when a customer opens it.</p>
          <div className="p-3 rounded border border-stone/15 bg-stone/5">
            <p className="font-semibold text-ink text-xs uppercase tracking-wide mb-1">Scheduled sync {status.cronConfigured ? "✓" : "(set CRON_SECRET)"}</p>
            <p className="text-xs text-stone">Call every 30–60 minutes with header <code className="text-ink">Authorization: Bearer &lt;CRON_SECRET&gt;</code>:</p>
            <code className="block mt-1 text-xs text-ink break-all">POST {origin}/api/shipments/sync</code>
          </div>
          <div className="p-3 rounded border border-stone/15 bg-stone/5">
            <p className="font-semibold text-ink text-xs uppercase tracking-wide mb-1">ShipMozo webhook (optional) {status.webhookConfigured ? "✓" : "(set SHIPMOZO_WEBHOOK_SECRET)"}</p>
            <p className="text-xs text-stone">If your ShipMozo panel offers a status webhook, point it at:</p>
            <code className="block mt-1 text-xs text-ink break-all">{origin}/api/webhooks/shipping?token=&lt;SHIPMOZO_WEBHOOK_SECRET&gt;</code>
          </div>
          <p className="text-xs text-stone">Shipping charges shown to customers at checkout are set in the Shiprocket Checkout (Fastrr) dashboard.</p>
        </div>
      </SectionCard>
    </PageShell>
  );
}
