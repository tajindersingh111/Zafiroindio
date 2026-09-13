"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, StatusBadge, Btn, useToast } from "@/components/admin/Shared";

interface AbandonedCart {
  id: string;
  customerName: string;
  customerEmail: string;
  products: { productId: string; name: string; quantity: number; price: number }[];
  cartValue: number;
  status: "abandoned" | "reminder_sent" | "recovered" | "expired";
  reminderSent: boolean;
  createdAt: string;
}

interface Analytics {
  totalCarts: number;
  abandonedValue: number;
  recoveredCount: number;
  recoveryRate: number;
  recoveredRevenue: number;
  unrecoveredRevenue: number;
}

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }

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

  async function sendReminder(cart: AbandonedCart) {
    const res = await fetch("/api/admin/abandoned-carts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cart.id, status: "reminder_sent", reminderSent: true })
    });
    if (res.ok) {
      addToast(`Recovery reminder email dispatched to ${cart.customerEmail}`);
      fetchCarts();
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
                <p className="text-[9px] text-stone font-semibold uppercase tracking-wider">Abandoned Carts</p>
                <p className="text-xl font-display font-semibold mt-1 text-ink">{analytics.totalCarts}</p>
              </div>
              <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
                <p className="text-[9px] text-stone font-semibold uppercase tracking-wider">Abandoned Value</p>
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
                  {["Customer", "Cart Items", "Value", "Time Abandoned", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carts.map((c) => (
                  <tr key={c.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{c.customerName}</p>
                      <p className="text-xs text-stone">{c.customerEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate text-xs text-ink-soft">
                        {c.products.map((p) => `${p.name} (x${p.quantity})`).join(", ")}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{fmt(c.cartValue)}</td>
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
                      {c.status === "abandoned" && (
                        <Btn size="sm" onClick={() => sendReminder(c)}>Send Reminder</Btn>
                      )}
                      {c.status === "reminder_sent" && (
                        <Btn size="sm" variant="secondary" onClick={() => sendReminder(c)}>Resend</Btn>
                      )}
                      {c.status === "recovered" && (
                        <span className="text-xs font-semibold text-green-700">Recovered!</span>
                      )}
                      {c.status === "expired" && (
                        <span className="text-xs text-stone">Expired</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </>
      )}
    </PageShell>
  );
}
