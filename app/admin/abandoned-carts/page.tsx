"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, Btn, useToast } from "@/components/admin/Shared";

interface AbandonedCart {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  products: { productId: string; name: string; quantity: number; price: number }[];
  cartValue: number;
  status: "abandoned" | "reminder_sent" | "recovered" | "expired";
  reminderSent: boolean;
  reminderCount: number;
  lastReminderAt?: string;
  recoveredOrderNumber?: string;
  source: "checkout_form" | "payment_abandoned" | "payment_failed";
  createdAt: string;
  updatedAt: string;
}

interface Analytics {
  totalCarts: number;
  openCarts: number;
  abandonedValue: number;
  recoveredCount: number;
  recoveryRate: number;
  recoveredRevenue: number;
  unrecoveredRevenue: number;
}

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }

/** How far the shopper got — a started payment is a far warmer lead than a half-filled form. */
const SOURCE_LABEL: Record<AbandonedCart["source"], string> = {
  checkout_form: "Filled checkout form",
  payment_abandoned: "Opened payment, never paid",
  payment_failed: "Payment failed",
};

export default function AbandonedCartsPage() {
  const { addToast } = useToast();
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCarts();
  }, []);

  function fetchCarts() {
    setLoading(true);
    fetch("/api/admin/abandoned-carts")
      .then((r) => r.json())
      .then((data) => {
        setCarts(data.carts ?? []);
        setAnalytics(data.analytics ?? null);
        setLoading(false);
      });
  }

  const [sending, setSending] = useState("");

  async function sendReminder(cart: AbandonedCart) {
    setSending(cart.id);
    try {
      const res = await fetch("/api/admin/abandoned-carts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cart.id, action: "remind" })
      });
      const data = await res.json().catch(() => ({}));
      // Only claim the mail went out when the server says it actually did.
      if (res.ok) {
        addToast(`Recovery reminder sent to ${data.sentTo || cart.customerEmail}`);
        fetchCarts();
      } else {
        addToast(data.error || "The reminder could not be sent.", "error");
      }
    } finally {
      setSending("");
    }
  }

  function getTimeSince(dateStr: string) {
    const diffMs = new Date().getTime() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours} hrs ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  }

  return (
    <PageShell>
      <PageHeader title="Abandoned Cart Recovery" subtitle="Track abandoned shopping sessions and trigger recovery reminders." />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Recovery Analytics Header */}
          {analytics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
                <p className="text-[9px] text-stone font-semibold uppercase tracking-wider">Open Carts</p>
                <p className="text-xl font-display font-semibold mt-1 text-ink">{analytics.openCarts}</p>
              </div>
              <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
                <p className="text-[9px] text-stone font-semibold uppercase tracking-wider">Recoverable Value</p>
                <p className="text-xl font-display font-semibold mt-1 text-ink">{fmt(analytics.abandonedValue)}</p>
              </div>
              <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
                <p className="text-[9px] text-stone font-semibold uppercase tracking-wider">Recovered Revenue</p>
                <p className="text-xl font-display font-semibold mt-1 text-green-800">{fmt(analytics.recoveredRevenue)}</p>
              </div>
              <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
                <p className="text-[9px] text-stone font-semibold uppercase tracking-wider">Recovery Rate</p>
                <p className="text-xl font-display font-semibold mt-1 text-indigo">{analytics.recoveryRate.toFixed(1)}%</p>
              </div>
            </div>
          )}

          {/* Cart List */}
          <SectionCard title="Abandoned Cart List">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone/20 bg-paper/50">
                  {["Customer", "Cart Items", "Value", "Reached", "Time Abandoned", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carts.map((c) => (
                  <tr key={c.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{c.customerName}</p>
                      {/* Phone first: it is the one contact the checkout form always has. */}
                      {c.customerPhone && <p className="text-xs text-ink-soft">{c.customerPhone}</p>}
                      <p className="text-xs text-stone">{c.customerEmail || "no e-mail given"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate text-xs text-ink-soft">
                        {c.products.map((p) => `${p.name} (x${p.quantity})`).join(", ")}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{fmt(c.cartValue)}</td>
                    <td className="px-4 py-3 text-xs text-stone">{SOURCE_LABEL[c.source] ?? c.source}</td>
                    <td className="px-4 py-3 text-xs text-stone">{getTimeSince(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        c.status === "recovered" ? "bg-green-700/10 text-green-800" :
                        c.status === "reminder_sent" ? "bg-indigo/10 text-indigo" :
                        c.status === "expired" ? "bg-stone/20 text-stone" : "bg-turmeric/20 text-[#8a6519]"
                      }`}>
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {/* No e-mail means no reminder is possible — say so instead of offering a button that fails. */}
                      {(c.status === "abandoned" || c.status === "reminder_sent") && (
                        c.customerEmail ? (
                          <Btn
                            size="sm"
                            variant={c.status === "reminder_sent" ? "secondary" : "primary"}
                            disabled={sending === c.id}
                            onClick={() => sendReminder(c)}
                          >
                            {sending === c.id ? "Sending…" : c.status === "reminder_sent" ? `Resend (${c.reminderCount})` : "Send Reminder"}
                          </Btn>
                        ) : (
                          <span className="text-xs text-stone">Call {c.customerPhone || "—"}</span>
                        )
                      )}
                      {c.status === "recovered" && (
                        <span className="text-xs font-semibold text-green-700">
                          Recovered{c.recoveredOrderNumber ? ` — ${c.recoveredOrderNumber}` : ""}
                        </span>
                      )}
                      {c.status === "expired" && (
                        <span className="text-xs text-stone">Expired</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!carts.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-stone">
                      No abandoned carts yet. A cart is recorded once a shopper enters their mobile number on
                      the checkout page, or starts a payment and does not finish it.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </SectionCard>
        </>
      )}
    </PageShell>
  );
}
