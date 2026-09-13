"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageShell, PageHeader, DataTable, Pagination, SearchBar, StatusBadge, Column, Btn, LoadingSpinner, SectionCard } from "@/components/admin/Shared";

interface Customer {
  id: string; firstName: string; lastName: string; email: string;
  phone?: string; company?: string; type: string; status: string;
  totalOrders: number; totalSpent: number; registeredAt: string;
}
interface Order {
  id: string; orderNumber: string; customerName: string; total: number;
  status: string; type: string; createdAt: string; items: { quantity: number }[];
}

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }

export default function B2BPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20", type: "b2b" });
    if (search) params.set("search", search);
    const [custRes, ordRes] = await Promise.all([
      fetch(`/api/admin/customers?${params}`),
      fetch("/api/admin/orders?type=b2b&pageSize=10"),
    ]);
    const [custData, ordData] = await Promise.all([custRes.json(), ordRes.json()]);
    setCustomers(custData.customers ?? []);
    setOrders(ordData.orders ?? []);
    setTotalPages(custData.totalPages ?? 1);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search]);

  const customerColumns: Column<Customer>[] = [
    { key: "name", label: "Company / Customer", render: (c) => (
      <div>
        <p className="font-medium text-ink">{c.firstName} {c.lastName}</p>
        {c.company && <p className="text-xs text-stone">{c.company}</p>}
        <p className="text-xs text-stone">{c.email}</p>
      </div>
    )},
    { key: "totalOrders", label: "Orders", render: (c) => <span className="font-semibold">{c.totalOrders}</span> },
    { key: "totalSpent", label: "Lifetime Value", render: (c) => <span className="font-semibold text-ink">{fmt(c.totalSpent)}</span> },
    { key: "status", label: "Status", render: (c) => <StatusBadge status={c.status} /> },
  ];

  const totalB2BRevenue = orders.reduce((s, o) => s + o.total, 0);

  return (
    <PageShell>
      <PageHeader title="B2B / Bulk Orders" subtitle="Manage wholesale and bulk customers" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "B2B Customers", value: String(customers.length), accent: "indigo" as const },
          { label: "B2B Orders (Latest)", value: String(orders.length), accent: "madder" as const },
          { label: "B2B Revenue", value: fmt(totalB2BRevenue), accent: "turmeric" as const },
          { label: "Avg Order Value", value: orders.length > 0 ? fmt(totalB2BRevenue / orders.length) : "—", accent: "green" as const },
        ].map((c) => (
          <div key={c.label} className="border border-stone/20 rounded-sm bg-cream-card p-5 relative overflow-hidden">
            <span className={`absolute left-0 top-0 bottom-0 w-1 bg-${c.accent}`} />
            <p className="text-[11px] uppercase tracking-wider text-stone mb-2">{c.label}</p>
            <p className="font-display text-2xl text-ink">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Recent B2B Orders */}
      <SectionCard title="Recent B2B Orders" action={<Btn size="sm" variant="secondary" onClick={() => router.push("/admin/orders?type=b2b")}>View All</Btn>}>
        {loading ? <LoadingSpinner /> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-stone/20 bg-paper/50">{["Order #", "Customer", "Items", "Total", "Status"].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>)}</tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/50 cursor-pointer" onClick={() => router.push(`/admin/orders/${o.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs text-indigo font-semibold">{o.orderNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{o.customerName}</td>
                  <td className="px-4 py-3">{o.items.reduce((s, i) => s + i.quantity, 0)} items</td>
                  <td className="px-4 py-3 font-semibold">{fmt(o.total)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone">No B2B orders found.</td></tr>}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* B2B Customers */}
      <SectionCard title="B2B Customers">
        <div className="mb-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search customer or company…" className="w-64" />
        </div>
        {loading ? <LoadingSpinner /> : (
          <>
            <DataTable columns={customerColumns} rows={customers} onRowClick={(c) => router.push(`/admin/customers/${c.id}`)} emptyMessage="No B2B customers." />
            <Pagination page={page} totalPages={totalPages} onPage={setPage} />
          </>
        )}
      </SectionCard>
    </PageShell>
  );
}
