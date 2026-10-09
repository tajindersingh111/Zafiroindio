"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell, PageHeader, StatusBadge, Btn, SectionCard, FilterSelect, useToast, LoadingSpinner } from "@/components/admin/Shared";

interface Address { firstName: string; lastName: string; company?: string; address1: string; address2?: string; city: string; state: string; postalCode: string; country: string; phone?: string; email?: string; }
interface OrderItem { productId: string; variationId?: string; name: string; sku: string; quantity: number; price: number; costPrice?: number; discount: number; tax: number; total: number; attributes?: { name: string; value: string }[]; }
interface OrderNote { id: string; note: string; isCustomerNote: boolean; createdAt: string; }
interface Order {
  id: string; orderNumber: string; customerName: string; customerEmail: string; customerPhone?: string;
  type: string; status: string; items: OrderItem[]; billing: Address; shipping: Address;
  couponCode?: string; couponDiscount: number; subtotal: number; shippingCost: number;
  tax: number; discount: number; total: number;
  costSnapshot?: { shippingCost?: number; paymentFee?: number; packagingCost?: number; marketingAttributionCost?: number; returnShippingCost?: number; refundAmount?: number; otherOrderCost?: number; };
  paymentMethod: string; paymentStatus: string;
  transactionId?: string; notes: OrderNote[];
  trackingNumber?: string; courierName?: string; trackingUrl?: string;
  shippingDate?: string; estimatedDelivery?: string; deliveredDate?: string;
  shipmozo?: { pushedAt: string; labelUrl?: string; lastStatus?: string; lastSyncAt?: string; pickupScheduled?: boolean };
  createdAt: string; updatedAt: string;
}
interface CourierRate { courierId: string; name: string; price: number; eta?: string; }

const STATUS_OPTIONS = [
  { label: "Pending Payment", value: "pending_payment" }, { label: "Processing", value: "processing" },
  { label: "On Hold", value: "on_hold" }, { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" }, { label: "Refunded", value: "refunded" },
];

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
function AddrBlock({ addr }: { addr: Address }) {
  return (
    <address className="not-italic text-sm text-ink-soft leading-relaxed">
      <strong className="text-ink">{addr.firstName} {addr.lastName}</strong>
      {addr.company && <><br />{addr.company}</>}
      <br />{addr.address1}
      {addr.address2 && <><br />{addr.address2}</>}
      <br />{addr.city}, {addr.state} {addr.postalCode}
      <br />{addr.country}
      {addr.phone && <><br />{addr.phone}</>}
    </address>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { addToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  const [parcel, setParcel] = useState({ weightKg: "", l: "", w: "", h: "" });
  const [rates, setRates] = useState<CourierRate[] | null>(null);
  const [courierId, setCourierId] = useState("");
  const [loadingRates, setLoadingRates] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const reloadOrder = () => {
    fetch(`/api/admin/orders/${id}`).then((r) => r.json()).then((d) => {
      setOrder(d.order ?? null);
      setLoading(false);
    });
  };

  useEffect(() => {
    reloadOrder();
  }, [id]);

  const parcelBody = () => ({ weightKg: Number(parcel.weightKg) || undefined, l: Number(parcel.l) || undefined, w: Number(parcel.w) || undefined, h: Number(parcel.h) || undefined });

  async function loadRates() {
    if (!order) return;
    setLoadingRates(true);
    try {
      const res = await fetch("/api/shipments/rates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, ...parcelBody() }) });
      const data = await res.json();
      if (!res.ok) return addToast(data.error || "Could not get courier rates.", "error");
      setParcel({ weightKg: String(data.parcel.weightKg), l: String(data.parcel.l), w: String(data.parcel.w), h: String(data.parcel.h) });
      setRates(data.rates);
      setCourierId(data.rates[0]?.courierId ?? "");
      if (!data.rates.length) addToast("ShipMozo returned no courier for this PIN code / weight.", "error");
    } catch {
      addToast("Network error getting rates.", "error");
    } finally {
      setLoadingRates(false);
    }
  }

  async function handleDispatchShipment() {
    if (!order) return;
    setDispatching(true);
    try {
      const res = await fetch("/api/shipments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, courierId: courierId || undefined, ...parcelBody() }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(`Courier booked: ${data.shipment.courierName}, AWB ${data.shipment.trackingNumber}${data.shipment.pickupScheduled ? " · pickup scheduled" : ""}`);
        setRates(null);
        reloadOrder();
      } else {
        addToast(data.error || "Failed to create shipment.", "error");
      }
    } catch {
      addToast("Network error creating shipment.", "error");
    } finally {
      setDispatching(false);
    }
  }

  async function refreshTracking() {
    if (!order) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/shipments/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id }) });
      const data = await res.json();
      if (res.ok) addToast(`Courier status: ${data.courierStatus || "no update yet"}`);
      else addToast(data.error || "Could not refresh tracking.", "error");
      reloadOrder();
    } catch {
      addToast("Network error refreshing tracking.", "error");
    } finally {
      setSyncing(false);
    }
  }

  async function updateStatus() {
    if (!newStatus) return;
    setSaving(true);
    const res = await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    if (res.ok) { const d = await res.json(); setOrder(d.order); addToast("Order status updated."); }
    else addToast("Failed to update status.", "error");
    setSaving(false); setNewStatus("");
  }

  async function addNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addNote: noteText, isCustomerNote: false }) });
    if (res.ok) { const d = await res.json(); setOrder(d.order); addToast("Note added."); setNoteText(""); }
    setSaving(false);
  }

  function printInvoice() {
    window.open(`/api/admin/orders/${id}/invoice`, "_blank");
  }

  if (loading) return <LoadingSpinner />;
  if (!order) return <PageShell><p className="text-stone">Order not found.</p></PageShell>;

  return (
    <PageShell>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        subtitle={fmtDate(order.createdAt)}
        action={
          <div className="flex gap-2">
            <Btn variant="secondary" size="sm" onClick={() => router.push(`/admin/orders/${order.id}/invoice`)}>📄 View Invoice</Btn>
            <Btn variant="secondary" size="sm" onClick={() => window.open(`/admin/orders/${order.id}/invoice`, "_blank")}>🖨 Print / Download</Btn>
            <Btn variant="secondary" size="sm" onClick={() => router.push("/admin/orders")}>← Back</Btn>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Order details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <SectionCard title="Order Items">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-stone/20">
                {["Product", "SKU", "Qty", "Unit Price", "Tax", "Total"].map((h) => (
                  <th key={h} className="py-2 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={i} className="border-b border-stone/10 last:border-0">
                    <td className="py-3 px-3">
                      <p className="font-medium text-ink">{item.name}</p>
                      {item.attributes?.map((a) => <span key={a.name} className="text-[11px] text-stone">{a.name}: {a.value} </span>)}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-stone">{item.sku}</td>
                    <td className="py-3 px-3">{item.quantity}</td>
                    <td className="py-3 px-3">{fmt(item.price)}</td>
                    <td className="py-3 px-3 text-stone">{fmt(item.tax)}</td>
                    <td className="py-3 px-3 font-semibold">{fmt(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Totals */}
            <div className="border-t border-stone/20 mt-4 pt-4 space-y-2">
              {[
                ["Subtotal", fmt(order.subtotal)],
                ["Shipping", fmt(order.shippingCost)],
                ...(order.couponDiscount > 0 ? [[`Coupon (${order.couponCode})`, `-${fmt(order.couponDiscount)}`]] : []),
                ...(order.discount > 0 ? [["Discount", `-${fmt(order.discount)}`]] : []),
                ["Tax (GST)", fmt(order.tax)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm text-ink-soft">
                  <span>{k}</span><span>{v}</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-bold text-ink border-t border-stone/20 pt-2 mt-2">
                <span>Total</span><span>{fmt(order.total)}</span>
              </div>
            </div>
          </SectionCard>

          {/* Order Profitability Widget */}
          <SectionCard title="Order Profitability Detail">
            {(() => {
              const grossRev = order.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
              const itemDisc = order.items.reduce((acc, i) => acc + ((i.discount || 0) * i.quantity), 0);
              const couponDisc = order.couponDiscount || order.discount || 0;
              const totalDisc = itemDisc + couponDisc;
              const netRev = Math.max(0, grossRev - totalDisc);

              const cogs = order.items.reduce((acc, i) => acc + ((i.costPrice || 0) * i.quantity), 0);
              const grossProfit = netRev - cogs;
              const grossMargin = netRev > 0 ? Math.round((grossProfit / netRev) * 1000) / 10 : 0;

              const shippingCost = order.costSnapshot?.shippingCost ?? order.shippingCost ?? 120;
              const paymentFee = order.costSnapshot?.paymentFee ?? (order.paymentMethod === "cod" ? 60 : Math.round(netRev * 0.02));
              const packagingCost = order.costSnapshot?.packagingCost ?? 50;
              const marketingCost = order.costSnapshot?.marketingAttributionCost ?? 0;
              const otherCost = order.costSnapshot?.otherOrderCost ?? 0;
              const directCosts = shippingCost + paymentFee + packagingCost + marketingCost + otherCost;

              const netProfit = grossProfit - directCosts;
              const netMargin = netRev > 0 ? Math.round((netProfit / netRev) * 1000) / 10 : 0;
              const isLoss = netProfit < 0;

              return (
                <div className="space-y-4">
                  {isLoss && (
                    <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded text-rose-300 text-xs font-semibold flex items-center gap-2">
                      ⚠️ Loss-Making Order (Net Profit: -₹{Math.abs(netProfit).toLocaleString("en-IN")})
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                    <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                      <span className="text-slate-400 block font-sans">Gross Revenue</span>
                      <span className="text-sm font-bold text-slate-100">₹{grossRev.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                      <span className="text-slate-400 block font-sans">COGS (Product Cost)</span>
                      <span className="text-sm font-bold text-amber-400">₹{cogs.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                      <span className="text-slate-400 block font-sans">Gross Profit</span>
                      <span className="text-sm font-bold text-cyan-400">₹{grossProfit.toLocaleString("en-IN")} ({grossMargin}%)</span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                      <span className="text-slate-400 block font-sans">Net Profit</span>
                      <span className={`text-sm font-bold ${netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        ₹{netProfit.toLocaleString("en-IN")} ({netMargin}%)
                      </span>
                    </div>
                  </div>

                  {/* Expandable Cost Breakdown */}
                  <details className="text-xs space-y-2 border-t border-slate-800 pt-3">
                    <summary className="cursor-pointer font-semibold text-slate-300 hover:text-amber-400 transition-colors">
                      🔍 View Complete Itemized Profitability Calculation
                    </summary>
                    <div className="pt-2 space-y-1.5 font-mono text-slate-300">
                      <div className="flex justify-between"><span>Gross Order Total:</span><span>₹{grossRev.toLocaleString("en-IN")}</span></div>
                      <div className="flex justify-between text-rose-400"><span>- Discounts Applied:</span><span>-₹{totalDisc.toLocaleString("en-IN")}</span></div>
                      <div className="flex justify-between font-bold border-b border-slate-800 pb-1"><span>= Net Realized Revenue:</span><span>₹{netRev.toLocaleString("en-IN")}</span></div>
                      
                      <div className="flex justify-between text-amber-400"><span>- COGS (Manufacturing Snapshot):</span><span>-₹{cogs.toLocaleString("en-IN")}</span></div>
                      <div className="flex justify-between font-bold text-cyan-300 border-b border-slate-800 pb-1"><span>= Gross Profit:</span><span>₹{grossProfit.toLocaleString("en-IN")} ({grossMargin}%)</span></div>
                      
                      <div className="flex justify-between"><span>- Shipping & Courier Cost:</span><span>-₹{shippingCost.toLocaleString("en-IN")}</span></div>
                      <div className="flex justify-between"><span>- Payment Gateway / COD Fee:</span><span>-₹{paymentFee.toLocaleString("en-IN")}</span></div>
                      <div className="flex justify-between"><span>- Packaging Cost:</span><span>-₹{packagingCost.toLocaleString("en-IN")}</span></div>
                      <div className="flex justify-between"><span>- Marketing Attribution:</span><span>-₹{marketingCost.toLocaleString("en-IN")}</span></div>
                      <div className="flex justify-between"><span>- Other Direct Costs:</span><span>-₹{otherCost.toLocaleString("en-IN")}</span></div>
                      
                      <div className="flex justify-between font-bold text-sm border-t border-slate-800 pt-1">
                        <span>= Net Profit:</span>
                        <span className={netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>₹{netProfit.toLocaleString("en-IN")} ({netMargin}%)</span>
                      </div>
                    </div>
                  </details>
                </div>
              );
            })()}
          </SectionCard>

          {/* Notes */}
          <SectionCard title="Order Notes">
            <div className="space-y-3 mb-4">
              {order.notes.length === 0 && <p className="text-sm text-stone">No notes yet.</p>}
              {order.notes.map((n) => (
                <div key={n.id} className={`p-3 rounded-sm text-sm border ${n.isCustomerNote ? "bg-indigo/5 border-indigo/20" : "bg-turmeric/5 border-turmeric/20"}`}>
                  <p className="text-ink">{n.note}</p>
                  <p className="text-[11px] text-stone mt-1">{fmtDate(n.createdAt)} · {n.isCustomerNote ? "Customer" : "Admin"}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a private note…"
                className="flex-1 px-3 py-2 border border-stone/30 rounded-sm text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-madder/40"
                onKeyDown={(e) => e.key === "Enter" && addNote()}
              />
              <Btn size="sm" onClick={addNote} disabled={saving || !noteText.trim()}>Add Note</Btn>
            </div>
          </SectionCard>

          {/* Tracking */}
          {(order.trackingNumber || order.courierName) && (
            <SectionCard title="Shipment Tracking">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Courier", order.courierName ?? "—"],
                  ["Tracking #", order.trackingNumber ?? "—"],
                  ["Shipped", order.shippingDate ? fmtDate(order.shippingDate) : "—"],
                  ["Est. Delivery", order.estimatedDelivery ?? "—"],
                  ["Delivered", order.deliveredDate ? fmtDate(order.deliveredDate) : "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[11px] text-stone uppercase tracking-wide mb-0.5">{k}</p>
                    <p className="text-ink font-medium">{v}</p>
                  </div>
                ))}
                {order.trackingUrl && (
                  <div className="col-span-2">
                    <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-indigo text-sm hover:underline">Track shipment →</a>
                  </div>
                )}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Right — Customer + Status */}
        <div className="space-y-5">
          {/* Tax Invoice Card */}
          <SectionCard title="Tax Invoice & Billing">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs border-b border-stone/10 pb-2">
                <span className="text-stone">Tax Invoice:</span>
                <span className="font-mono font-bold text-ink">ZI-{new Date(order.createdAt).getFullYear()}-000001</span>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  href={`/admin/orders/${order.id}/invoice`}
                  className="w-full text-center px-3 py-2 bg-madder/10 hover:bg-madder/20 text-madder font-semibold rounded text-xs transition-colors"
                >
                  📄 View Full Tax Invoice
                </Link>
                <button
                  onClick={() => window.open(`/admin/orders/${order.id}/invoice`, "_blank")}
                  className="w-full text-center px-3 py-2 bg-stone/10 hover:bg-stone/20 text-ink font-medium rounded text-xs transition-colors"
                >
                  🖨 Print / Download PDF
                </button>
              </div>
            </div>
          </SectionCard>

          {/* Status & Courier Dispatch Card */}
          <SectionCard title="Order Status & Courier Dispatch">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone/10">
                <span className="text-xs text-stone font-medium uppercase tracking-wide">Current Status</span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={order.status} />
                  <span className="text-xs text-stone"><StatusBadge status={order.paymentStatus} /></span>
                </div>
              </div>

              {/* Status Update Dropdown */}
              <div>
                <label className="block text-xs text-stone font-semibold uppercase tracking-wide mb-1.5">Update Order Status</label>
                <div className="flex gap-2">
                  <FilterSelect value={newStatus} onChange={setNewStatus} options={STATUS_OPTIONS} placeholder="Change status…" />
                  <Btn size="sm" onClick={updateStatus} disabled={saving || !newStatus}>Update</Btn>
                </div>
              </div>

              {/* Courier Dispatch Section */}
              <div className="pt-3 border-t border-stone/15">
                <p className="text-xs font-semibold text-ink uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>🚚</span> Automated Courier Dispatch
                </p>

                {order.trackingNumber ? (
                  <div className="bg-emerald-950/20 border border-emerald-800/30 p-3 rounded text-xs space-y-2">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <span>✓</span> Courier booked: {order.courierName || "Courier"}
                    </p>
                    <p className="text-stone">AWB: <span className="font-mono font-bold text-ink">{order.trackingNumber}</span></p>
                    {order.shipmozo?.lastStatus && (
                      <p className="text-stone">
                        Courier status: <span className="font-semibold text-ink">{order.shipmozo.lastStatus}</span>
                        {order.shipmozo.lastSyncAt && <span> · checked {fmtDate(order.shipmozo.lastSyncAt)}</span>}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 pt-1">
                      {order.shipmozo?.labelUrl && (
                        <a href={order.shipmozo.labelUrl} target="_blank" rel="noopener noreferrer" className="text-madder hover:underline font-medium">Download label →</a>
                      )}
                      {order.trackingUrl && (
                        <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-madder hover:underline font-medium">Customer tracking page →</a>
                      )}
                    </div>
                    {order.shipmozo && (
                      <Btn size="sm" variant="secondary" onClick={refreshTracking} disabled={syncing} className="w-full justify-center">
                        {syncing ? "Checking ShipMozo…" : "↻ Refresh tracking"}
                      </Btn>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 bg-stone/5 p-3 rounded border border-stone/15">
                    <p className="text-xs text-stone leading-relaxed">
                      Book a courier on <strong>ShipMozo</strong>: it generates the AWB and label and schedules the pickup.
                      {order.shipmozo?.pushedAt && " The order is already in the ShipMozo panel."}
                    </p>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {([["weightKg", "Weight kg"], ["l", "L cm"], ["w", "W cm"], ["h", "H cm"]] as const).map(([k, label]) => (
                        <div key={k}>
                          <label className="block text-[10px] uppercase font-semibold text-stone mb-1">{label}</label>
                          <input
                            type="number"
                            step={k === "weightKg" ? "0.1" : "1"}
                            min="0"
                            placeholder="auto"
                            value={parcel[k]}
                            onChange={(e) => { setParcel({ ...parcel, [k]: e.target.value }); setRates(null); }}
                            className="w-full px-2 py-1.5 border border-stone/30 rounded bg-paper text-xs text-ink"
                          />
                        </div>
                      ))}
                    </div>

                    {rates && rates.length > 0 && (
                      <div className="max-h-56 overflow-y-auto border border-stone/20 rounded divide-y divide-stone/10 bg-paper">
                        {rates.map((r) => (
                          <label key={r.courierId} className={`flex items-center gap-2 px-2.5 py-2 text-xs cursor-pointer ${courierId === r.courierId ? "bg-madder/5" : ""}`}>
                            <input type="radio" name="courier" checked={courierId === r.courierId} onChange={() => setCourierId(r.courierId)} className="accent-madder" />
                            <span className="flex-1 text-ink">{r.name}{r.eta && <span className="block text-[10px] text-stone">{r.eta}</span>}</span>
                            <span className="font-semibold text-ink">{fmt(r.price)}</span>
                          </label>
                        ))}
                        <label className={`flex items-center gap-2 px-2.5 py-2 text-xs cursor-pointer ${courierId === "" ? "bg-madder/5" : ""}`}>
                          <input type="radio" name="courier" checked={courierId === ""} onChange={() => setCourierId("")} className="accent-madder" />
                          <span className="flex-1 text-ink">Auto (your ShipMozo courier priority)</span>
                        </label>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Btn size="sm" variant="secondary" onClick={loadRates} disabled={loadingRates || dispatching} className="flex-1 justify-center">
                        {loadingRates ? "Getting rates…" : rates ? "↻ Rates" : "Courier rates"}
                      </Btn>
                      <Btn size="sm" onClick={handleDispatchShipment} disabled={dispatching || loadingRates} className="flex-1 justify-center font-bold">
                        {dispatching ? "Booking…" : "🚀 Book & get AWB"}
                      </Btn>
                    </div>
                    {order.shipmozo?.pushedAt && (
                      <Btn size="sm" variant="ghost" onClick={refreshTracking} disabled={syncing} className="w-full justify-center">
                        {syncing ? "Checking ShipMozo…" : "↻ Booked in the ShipMozo panel? Fetch AWB"}
                      </Btn>
                    )}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Customer */}
          <SectionCard title="Customer">
            <p className="font-medium text-ink mb-0.5">{order.customerName}</p>
            <p className="text-sm text-stone">{order.customerEmail}</p>
            {order.customerPhone && <p className="text-sm text-stone">{order.customerPhone}</p>}
            <Link href={`/admin/customers?search=${encodeURIComponent(order.customerEmail)}`} className="text-xs text-madder hover:underline mt-2 block">View customer →</Link>
          </SectionCard>

          {/* Addresses */}
          <SectionCard title="Billing Address"><AddrBlock addr={order.billing} /></SectionCard>
          <SectionCard title="Shipping Address"><AddrBlock addr={order.shipping} /></SectionCard>

          {/* Payment */}
          <SectionCard title="Payment">
            {[
              ["Method", order.paymentMethod.toUpperCase()],
              ["Status", ""],
              ["Transaction ID", order.transactionId ?? "N/A"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-1.5 border-b border-stone/10 last:border-0 text-sm">
                <span className="text-stone">{k}</span>
                {k === "Status" ? <StatusBadge status={order.paymentStatus} /> : <span className="font-medium text-ink">{v}</span>}
              </div>
            ))}
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}
