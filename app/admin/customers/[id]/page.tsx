"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell, PageHeader, SectionCard, StatusBadge, Btn, useToast, LoadingSpinner } from "@/components/admin/Shared";

interface Address { firstName: string; lastName: string; company?: string; address1: string; city: string; state: string; postalCode: string; country: string; phone?: string; }
interface Customer {
  id: string; firstName: string; lastName: string; email: string; phone?: string;
  company?: string; type: string; status: string; totalOrders: number; totalSpent: number;
  registeredAt: string; lastOrderDate?: string; billing?: Address; shipping?: Address;
  computedType?: string;
}
interface Order {
  id: string; orderNumber: string; total: number; status: string; createdAt: string; items: { quantity: number }[];
}
interface FavProduct { id: string; name: string; qty: number; spent: number; }
interface FavCategory { category: string; qty: number; }
interface RefundItem { id: string; productName: string; refundAmount: number; reason: string; status: string; createdAt: string; }

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { addToast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [favProducts, setFavProducts] = useState<FavProduct[]>([]);
  const [favCategories, setFavCategories] = useState<FavCategory[]>([]);
  const [refundHistory, setRefundHistory] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "preferences" | "refunds">("orders");

  useEffect(() => {
    fetch(`/api/admin/customers/${id}`).then((r) => r.json()).then((d) => {
      setCustomer(d.customer ?? null);
      setOrders(d.orders ?? []);
      setFavProducts(d.favProducts ?? []);
      setFavCategories(d.favCategories ?? []);
      setRefundHistory(d.refundHistory ?? []);
      setLoading(false);
    });
  }, [id]);

  async function toggleStatus() {
    if (!customer) return;
    const newStatus = customer.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/admin/customers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    if (res.ok) { const d = await res.json(); setCustomer(d.customer); addToast(`Customer ${newStatus === "active" ? "activated" : "deactivated"}.`); }
  }

  if (loading) return <LoadingSpinner />;
  if (!customer) return <PageShell><p className="text-stone">Customer not found.</p></PageShell>;

  return (
    <PageShell>
      <PageHeader
        title={`${customer.firstName} ${customer.lastName}`}
        subtitle={customer.company ?? customer.email}
        action={
          <div className="flex gap-2">
            <Btn size="sm" variant="secondary" onClick={toggleStatus}>{customer.status === "active" ? "Deactivate" : "Activate"}</Btn>
            <Btn size="sm" variant="secondary" onClick={() => router.push("/admin/customers")}>← Back</Btn>
          </div>
        }
      />

      {/* Tabs list */}
      <div className="flex border-b border-stone/20 mb-6">
        {[
          { id: "orders", label: "Order History" },
          { id: "preferences", label: "Preferences & 360° Insights" },
          { id: "refunds", label: "Refund History" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 -mb-[2px] transition-all ${
              activeTab === t.id ? "border-indigo text-indigo" : "border-transparent text-stone hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "orders" && (
            <SectionCard title="Order History" action={<span className="text-xs text-stone">{orders.length} orders · {fmt(customer.totalSpent)} total</span>}>
              {orders.length === 0 ? <p className="text-sm text-stone py-4">No orders yet.</p> : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-stone/20">
                    {["Order #", "Items", "Total", "Status", "Date", ""].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/60">
                        <td className="px-3 py-3 font-mono text-xs text-indigo font-semibold">{o.orderNumber}</td>
                        <td className="px-3 py-3">{o.items.reduce((s, i) => s + i.quantity, 0)} items</td>
                        <td className="px-3 py-3 font-semibold">{fmt(o.total)}</td>
                        <td className="px-3 py-3"><StatusBadge status={o.status} /></td>
                        <td className="px-3 py-3 text-xs text-stone">{fmtDate(o.createdAt)}</td>
                        <td className="px-3 py-3"><Link href={`/admin/orders/${o.id}`} className="text-xs text-madder hover:underline">View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SectionCard>
          )}

          {activeTab === "preferences" && (
            <div className="space-y-6">
              {/* Fav Products */}
              <SectionCard title="Favorite Products Purchased">
                <div className="divide-y divide-stone/20">
                  {favProducts.map((p) => (
                    <div key={p.id} className="py-3 flex justify-between items-center text-sm">
                      <div>
                        <p className="font-semibold text-indigo">{p.name}</p>
                        <p className="text-xs text-stone">{p.qty} units bought</p>
                      </div>
                      <span className="font-bold text-ink">{fmt(p.spent)}</span>
                    </div>
                  ))}
                  {favProducts.length === 0 && <p className="text-stone py-4 text-center">No purchases recorded.</p>}
                </div>
              </SectionCard>

              {/* Fav Categories */}
              <SectionCard title="Preferred Categories">
                <div className="space-y-3">
                  {favCategories.map((c) => (
                    <div key={c.category} className="flex justify-between items-center text-sm">
                      <span className="capitalize font-semibold text-ink">{c.category.replace(/-/g, " ")}</span>
                      <span className="text-xs text-stone bg-stone/10 px-2 py-0.5 rounded-sm">{c.qty} units bought</span>
                    </div>
                  ))}
                  {favCategories.length === 0 && <p className="text-stone py-4 text-center">No categories recorded.</p>}
                </div>
              </SectionCard>
            </div>
          )}

          {activeTab === "refunds" && (
            <SectionCard title="Return & Refund History">
              <div className="divide-y divide-stone/20">
                {refundHistory.map((r) => (
                  <div key={r.id} className="py-3.5 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold text-indigo">{r.productName}</p>
                      <p className="text-xs text-stone">{fmtDate(r.createdAt)} · Reason: {r.reason}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-madder">{fmt(r.refundAmount)}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-stone/20 text-stone">{r.status}</span>
                    </div>
                  </div>
                ))}
                {refundHistory.length === 0 && <p className="text-stone py-4 text-center">No refund history found.</p>}
              </div>
            </SectionCard>
          )}
        </div>

        <div className="space-y-5">
          <SectionCard title="Customer Info">
            <div className="space-y-3 text-sm">
              {[
                ["Email", customer.email],
                ["Phone", customer.phone ?? "—"],
                ["Type", ""],
                ["Status", ""],
                ["Classification", ""],
                ["Joined", fmtDate(customer.registeredAt)],
                ["Last Order", customer.lastOrderDate ? fmtDate(customer.lastOrderDate) : "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center py-1.5 border-b border-stone/10 last:border-0">
                  <span className="text-stone">{k}</span>
                  {k === "Type" ? (
                    <StatusBadge status={customer.type} />
                  ) : k === "Status" ? (
                    <StatusBadge status={customer.status} />
                  ) : k === "Classification" ? (
                    <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                      customer.computedType === "VIP" ? "bg-turmeric/20 text-[#8a6519]" : "bg-indigo/10 text-indigo"
                    }`}>
                      {customer.computedType ?? "new"}
                    </span>
                  ) : (
                    <span className="font-medium text-ink text-right">{v}</span>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          {customer.billing && (
            <SectionCard title="Billing Address">
              <address className="not-italic text-sm text-ink-soft leading-relaxed">
                <strong className="text-ink">{customer.billing.firstName} {customer.billing.lastName}</strong>
                {customer.billing.company && <><br />{customer.billing.company}</>}
                <br />{customer.billing.address1}
                <br />{customer.billing.city}, {customer.billing.state} {customer.billing.postalCode}
              </address>
            </SectionCard>
          )}

          <SectionCard title="Actions">
            <div className="space-y-2">
              <Link href={`/admin/orders?search=${encodeURIComponent(customer.email)}`} className="w-full flex">
                <Btn variant="secondary" size="sm" className="w-full justify-center">View Orders</Btn>
              </Link>
              <Link href={`mailto:${customer.email}`} className="w-full flex">
                <Btn variant="ghost" size="sm" className="w-full justify-center">Email Customer</Btn>
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}
