"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn, SectionCard } from "@/components/admin/Shared";

/**
 * Cancel & Refund, on the admin order page.
 *
 * The server side of both has existed for a while — cancelOrder() restocks and queues the refund, the
 * refunds ledger records requests, /api/refunds/execute sends them through Razorpay — but nothing in the
 * admin called any of it: the only way to "refund" an order was a status dropdown that set the word
 * "Refunded" and moved no money. This box is the front end for that flow.
 *
 * Who may do what follows the server: anyone with the orders section can cancel and can raise a refund
 * request; only a Super Admin sends money (through Razorpay, or by confirming a manual payout with its
 * reference). The box asks the server which of those the viewer is, rather than offering buttons that
 * would be refused.
 */

type Refund = {
  id: string;
  amount: number;
  reason: string;
  status: "REFUND_PENDING" | "REFUND_PROCESSING" | "REFUNDED" | "REFUND_FAILED";
  gatewayRefundId?: string;
  gateway?: "razorpay";
  processedBy?: string;
  failureReason?: string;
  createdAt: string;
};

export type MoneyOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  items: { quantity: number }[];
  trackingNumber?: string;
  razorpayPaymentId?: string;
  shipmozo?: { pushedAt?: string };
};

type Toast = (msg: string, type?: "success" | "error" | "warning" | "info") => void;

/** Statuses an order can no longer be cancelled from (mirrors lib/orders/service.ts, plus the closed ones). */
const NOT_CANCELLABLE = new Set([
  "shipped", "out_for_delivery", "delivered", "returned", "return_requested", "return_approved",
  "cancelled", "refunded", "completed", "failed", "payment_failed",
]);

const CANCEL_REASONS = [
  "Customer asked to cancel",
  "Out of stock",
  "Address not serviceable",
  "Payment problem",
  "Duplicate order",
  "Suspected fake or fraudulent order",
  "Other",
];

const REFUND_REASONS = [
  "Product arrived damaged",
  "Order cancelled",
  "Item not available",
  "Partial order / missing item",
  "Goodwill / compensation",
  "Other",
];

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const round2 = (n: number) => Math.round(n * 100) / 100;
const when = (s: string) =>
  new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const STATUS_STYLE: Record<Refund["status"], { label: string; cls: string }> = {
  REFUND_PENDING: { label: "Pending", cls: "bg-amber-100 text-amber-900 border-amber-300" },
  REFUND_PROCESSING: { label: "Sending…", cls: "bg-indigo/10 text-indigo border-indigo/30" },
  REFUNDED: { label: "Refunded", cls: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  REFUND_FAILED: { label: "Voided", cls: "bg-stone/10 text-stone border-stone/30" },
};

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-xs" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-cream-card rounded-sm border border-stone/20 shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
        <h3 className="font-sans font-semibold text-lg text-indigo mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

const fieldCls = "w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-madder/40";
const labelCls = "block text-[11px] font-semibold uppercase tracking-wide text-stone mb-1.5";

export default function OrderMoneyPanel({ order, onChanged, addToast }: { order: MoneyOrder; onChanged: () => void; addToast: Toast }) {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [superAdmin, setSuperAdmin] = useState(false);
  const [gatewayReady, setGatewayReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelNote, setCancelNote] = useState("");
  const [refundOnCancel, setRefundOnCancel] = useState(true);

  const [refundOpen, setRefundOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [refundReason, setRefundReason] = useState(REFUND_REASONS[0]);
  const [refundNote, setRefundNote] = useState("");
  const [sendNow, setSendNow] = useState(true);

  const [manualFor, setManualFor] = useState<Refund | null>(null);
  const [manualRef, setManualRef] = useState("");
  const [voidFor, setVoidFor] = useState<Refund | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/refunds?orderId=${encodeURIComponent(order.id)}`, { cache: "no-store" });
    if (!res.ok) return setLoaded(true);
    const d = await res.json();
    setRefunds(d.refunds ?? []);
    setSuperAdmin(!!d.viewer?.superAdmin);
    setGatewayReady(!!d.gatewayReady);
    setLoaded(true);
  }, [order.id]);

  useEffect(() => {
    load();
  }, [load, order.status, order.paymentStatus]);

  // ── What the numbers are ───────────────────────────────────────────
  const refunded = round2(refunds.filter((r) => r.status === "REFUNDED").reduce((s, r) => s + r.amount, 0));
  const open = round2(refunds.filter((r) => r.status === "REFUND_PENDING" || r.status === "REFUND_PROCESSING").reduce((s, r) => s + r.amount, 0));
  const moneyTaken = ["paid", "refund_pending", "partially_paid", "refunded"].includes(order.paymentStatus) || refunded > 0;
  const refundable = moneyTaken ? Math.max(0, round2(order.total - refunded - open)) : 0;

  const viaRazorpay = !!order.razorpayPaymentId;
  const canSendGateway = superAdmin && viaRazorpay && gatewayReady;
  const canCancel = !NOT_CANCELLABLE.has(order.status);
  const units = order.items.reduce((s, i) => s + (i.quantity || 0), 0);
  const courierBooked = !!(order.trackingNumber || order.shipmozo?.pushedAt);

  // ── Actions ────────────────────────────────────────────────────────
  async function send(refundId: string): Promise<boolean> {
    const res = await fetch("/api/refunds/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refundId }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      addToast(d.error || "Razorpay could not send the refund. It is still pending; try again or pay it manually.", "error");
      return false;
    }
    addToast(`Refund of ${inr(d.refund?.amount)} sent through Razorpay.`);
    return true;
  }

  async function doCancel() {
    setBusy(true);
    const reason = cancelReason === "Other" ? cancelNote.trim() || "Cancelled by staff" : cancelNote.trim() ? `${cancelReason}: ${cancelNote.trim()}` : cancelReason;
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled", cancelReason: reason }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      addToast(d.error || "Could not cancel the order.", "error");
      setBusy(false);
      return;
    }
    addToast(`Order ${order.orderNumber} cancelled. Stock restored and the customer e-mailed.`);
    // Cancelling a paid order queues a refund of the full amount; send it now if asked and allowed.
    if (d.refund?.id && refundOnCancel && canSendGateway) await send(d.refund.id);
    setCancelOpen(false);
    setCancelNote("");
    setBusy(false);
    onChanged();
    load();
  }

  async function doRefund() {
    const value = round2(Number(amount));
    if (!(value > 0)) return addToast("Enter an amount above zero.", "error");
    if (value > refundable + 0.001) return addToast(`At most ${inr(refundable)} can still be refunded on this order.`, "error");
    setBusy(true);
    const reason = refundReason === "Other" ? refundNote.trim() || "Refund" : refundNote.trim() ? `${refundReason}: ${refundNote.trim()}` : refundReason;
    const res = await fetch("/api/refunds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, amount: value, reason }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      addToast(d.error || "Could not create the refund.", "error");
      setBusy(false);
      return;
    }
    if (sendNow && canSendGateway) await send(d.refund.id);
    else addToast(`Refund of ${inr(value)} recorded.${superAdmin ? "" : " A Super Admin has to send it."}`);
    setRefundOpen(false);
    setRefundNote("");
    setBusy(false);
    onChanged();
    load();
  }

  async function settle(refund: Refund, status: "REFUNDED" | "REFUND_FAILED", gatewayRefundId?: string) {
    setBusy(true);
    const res = await fetch("/api/refunds", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refundId: refund.id, status, gatewayRefundId }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) addToast(d.error || "Could not update the refund.", "error");
    else addToast(status === "REFUNDED" ? `Refund of ${inr(refund.amount)} marked as paid.` : "Refund request voided.");
    setManualFor(null);
    setManualRef("");
    setVoidFor(null);
    setBusy(false);
    onChanged();
    load();
  }

  async function sendExisting(refund: Refund) {
    setBusy(true);
    await send(refund.id);
    setBusy(false);
    onChanged();
    load();
  }

  // ── View ───────────────────────────────────────────────────────────
  return (
    <SectionCard title="Cancel & Refund">
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <span className="text-stone">Order total</span>
          <span className="text-right font-semibold text-ink">{inr(order.total)}</span>
          <span className="text-stone">Payment</span>
          <span className="text-right text-ink uppercase">
            {order.paymentMethod} · {order.paymentStatus.replace(/_/g, " ")}
          </span>
          <span className="text-stone">Refunded</span>
          <span className="text-right text-emerald-800 font-semibold">{inr(refunded)}</span>
          {open > 0 && (
            <>
              <span className="text-stone">Waiting to be sent</span>
              <span className="text-right text-amber-800 font-semibold">{inr(open)}</span>
            </>
          )}
          <span className="text-stone">Can still refund</span>
          <span className="text-right font-semibold text-ink">{inr(refundable)}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {canCancel && (
            <Btn size="sm" variant="danger" onClick={() => setCancelOpen(true)} disabled={busy}>
              Cancel order
            </Btn>
          )}
          {refundable > 0 && (
            <Btn
              size="sm"
              onClick={() => {
                setAmount(String(refundable));
                setRefundOpen(true);
              }}
              disabled={busy}
            >
              Refund
            </Btn>
          )}
        </div>
        {!canCancel && !["cancelled", "refunded"].includes(order.status) && (
          <p className="text-[11px] text-stone leading-relaxed">
            This order has left the warehouse, so it can no longer be cancelled. Once the parcel comes back (or the customer returns it), refund it here.
          </p>
        )}
        {!moneyTaken && order.status !== "cancelled" && (
          <p className="text-[11px] text-stone leading-relaxed">No payment has been taken on this order, so there is nothing to refund.</p>
        )}

        {/* Ledger */}
        {loaded && refunds.length > 0 && (
          <div className="pt-3 border-t border-stone/15 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone">Refunds on this order</p>
            {refunds.map((r) => (
              <div key={r.id} className="border border-stone/20 rounded-sm p-3 bg-paper/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{inr(r.amount)}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_STYLE[r.status].cls}`}>
                    {STATUS_STYLE[r.status].label}
                  </span>
                </div>
                <p className="text-xs text-ink-soft">{r.reason}</p>
                <p className="text-[11px] text-stone">
                  {when(r.createdAt)}
                  {r.processedBy ? ` · ${r.processedBy}` : ""}
                  {r.gatewayRefundId ? ` · ref ${r.gatewayRefundId}` : ""}
                </p>
                {r.failureReason && r.status === "REFUND_PENDING" && (
                  <p className="text-[11px] text-madder">Last attempt failed: {r.failureReason}</p>
                )}
                {r.status === "REFUND_PENDING" &&
                  (superAdmin ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {canSendGateway && (
                        <Btn size="sm" onClick={() => sendExisting(r)} disabled={busy}>
                          Send via Razorpay
                        </Btn>
                      )}
                      <Btn size="sm" variant="secondary" onClick={() => setManualFor(r)} disabled={busy}>
                        Mark paid manually
                      </Btn>
                      <Btn size="sm" variant="ghost" onClick={() => setVoidFor(r)} disabled={busy}>
                        Void
                      </Btn>
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone">Waiting for a Super Admin to send it.</p>
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Cancel ── */}
      {cancelOpen && (
        <Modal title={`Cancel order ${order.orderNumber}?`} onClose={() => !busy && setCancelOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Reason</label>
              <select className={fieldCls} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}>
                {CANCEL_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Note {cancelReason === "Other" ? "" : "(optional)"}</label>
              <textarea className={fieldCls} rows={2} maxLength={250} value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} placeholder="Shown in the order history" />
            </div>

            <div className="bg-paper border border-stone/20 rounded-sm p-3 text-xs text-ink-soft space-y-1.5">
              <p className="font-semibold text-ink">What will happen</p>
              <p>• Stock for {units} item{units === 1 ? "" : "s"} goes back on sale.</p>
              {courierBooked && <p>• The courier booking is cancelled.</p>}
              <p>• The customer is e-mailed that the order was cancelled.</p>
              {moneyTaken ? (
                <p>
                  • A refund of <strong>{inr(order.total - refunded)}</strong> is created.{" "}
                  {canSendGateway ? "" : viaRazorpay ? "A Super Admin sends it from this box." : "This order was not paid through Razorpay, so pay the customer yourself and mark it paid here."}
                </p>
              ) : (
                <p>• No payment was taken, so there is nothing to refund.</p>
              )}
            </div>

            {moneyTaken && canSendGateway && (
              <label className="flex items-start gap-2 text-xs text-ink">
                <input type="checkbox" className="mt-0.5" checked={refundOnCancel} onChange={(e) => setRefundOnCancel(e.target.checked)} />
                <span>Send the refund now to the customer&apos;s original payment method (Razorpay, 5–7 working days).</span>
              </label>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setCancelOpen(false)} disabled={busy} className="px-4 py-2 text-xs border border-stone/30 rounded-sm text-ink-soft hover:bg-paper font-medium">
                Keep order
              </button>
              <button
                onClick={doCancel}
                disabled={busy || (cancelReason === "Other" && !cancelNote.trim())}
                className="px-4 py-2 text-xs rounded-sm text-white bg-madder hover:bg-madder-deep font-medium disabled:opacity-50"
              >
                {busy ? "Cancelling…" : "Cancel order"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Refund ── */}
      {refundOpen && (
        <Modal title={`Refund on ${order.orderNumber}`} onClose={() => !busy && setRefundOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Amount (up to {inr(refundable)})</label>
              <div className="flex gap-2">
                <input className={fieldCls} type="number" min={1} step="0.01" max={refundable} value={amount} onChange={(e) => setAmount(e.target.value)} />
                <button type="button" onClick={() => setAmount(String(refundable))} className="px-3 text-[11px] font-semibold uppercase tracking-wider border border-stone/30 rounded-sm text-ink-soft hover:bg-paper whitespace-nowrap">
                  Full
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Reason</label>
              <select className={fieldCls} value={refundReason} onChange={(e) => setRefundReason(e.target.value)}>
                {REFUND_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Note {refundReason === "Other" ? "" : "(optional)"}</label>
              <textarea className={fieldCls} rows={2} maxLength={250} value={refundNote} onChange={(e) => setRefundNote(e.target.value)} />
            </div>

            <div className="bg-paper border border-stone/20 rounded-sm p-3 text-xs text-ink-soft leading-relaxed">
              {viaRazorpay
                ? "Paid through Razorpay: the refund goes back to the card, UPI or bank the customer paid with, and reaches them in 5–7 working days."
                : `Paid by ${order.paymentMethod.toUpperCase()}: pay the customer yourself (UPI or bank transfer), then mark the refund as paid here with the transaction reference.`}
              {!superAdmin && " Only a Super Admin can send the money; this records the request for them."}
            </div>

            {canSendGateway && (
              <label className="flex items-start gap-2 text-xs text-ink">
                <input type="checkbox" className="mt-0.5" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} />
                <span>Send it through Razorpay now</span>
              </label>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setRefundOpen(false)} disabled={busy} className="px-4 py-2 text-xs border border-stone/30 rounded-sm text-ink-soft hover:bg-paper font-medium">
                Back
              </button>
              <button
                onClick={doRefund}
                disabled={busy || (refundReason === "Other" && !refundNote.trim())}
                className="px-4 py-2 text-xs rounded-sm text-white bg-indigo hover:bg-indigo-deep font-medium disabled:opacity-50"
              >
                {busy ? "Working…" : sendNow && canSendGateway ? `Refund ${inr(Number(amount) || 0)}` : "Record refund"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Manual payout ── */}
      {manualFor && (
        <Modal title={`Mark ${inr(manualFor.amount)} as paid`} onClose={() => !busy && setManualFor(null)}>
          <div className="space-y-4">
            <p className="text-xs text-ink-soft leading-relaxed">
              Only do this once the money has actually reached the customer. Enter the UPI / bank transaction reference so it can be traced.
            </p>
            <div>
              <label className={labelCls}>Transaction reference</label>
              <input className={fieldCls} value={manualRef} maxLength={80} onChange={(e) => setManualRef(e.target.value)} placeholder="e.g. UPI ref 432198765432" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setManualFor(null)} disabled={busy} className="px-4 py-2 text-xs border border-stone/30 rounded-sm text-ink-soft hover:bg-paper font-medium">
                Back
              </button>
              <button
                onClick={() => settle(manualFor, "REFUNDED", manualRef.trim())}
                disabled={busy || manualRef.trim().length < 4}
                className="px-4 py-2 text-xs rounded-sm text-white bg-indigo hover:bg-indigo-deep font-medium disabled:opacity-50"
              >
                Mark paid
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Void ── */}
      {voidFor && (
        <Modal title={`Void the ${inr(voidFor.amount)} refund request?`} onClose={() => !busy && setVoidFor(null)}>
          <p className="text-xs text-ink-soft mb-5 leading-relaxed">
            No money is sent. Use this when the request was raised by mistake or the customer was paid some other way. The order goes back to paid.
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setVoidFor(null)} disabled={busy} className="px-4 py-2 text-xs border border-stone/30 rounded-sm text-ink-soft hover:bg-paper font-medium">
              Back
            </button>
            <button onClick={() => settle(voidFor, "REFUND_FAILED")} disabled={busy} className="px-4 py-2 text-xs rounded-sm text-white bg-madder hover:bg-madder-deep font-medium disabled:opacity-50">
              Void request
            </button>
          </div>
        </Modal>
      )}
    </SectionCard>
  );
}
