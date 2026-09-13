"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageShell, PageHeader, DataTable, Pagination, SearchBar, FilterSelect, StatusBadge, Column, Btn, LoadingSpinner } from "@/components/admin/Shared";

interface Customer {
  id: string; firstName: string; lastName: string; email: string; phone?: string;
  company?: string; type: string; status: string; totalOrders: number;
  totalSpent: number; registeredAt: string; lastOrderDate?: string;
}

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [sortBy, setSortBy] = useState("registeredAt");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20", sortDir: "desc", sortBy });
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    const res = await fetch(`/api/admin/customers?${params}`);
    const data = await res.json();
    setCustomers(data.customers ?? []);
    setTotal(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [page, search, type, sortBy]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { setPage(1); }, [search, type, sortBy]);

  const columns: Column<Customer>[] = [
    {
      key: "name", label: "Customer", render: (c) => (
        <div>
          <p className="font-medium text-ink text-sm">{c.firstName} {c.lastName}</p>
          {c.company && <p className="text-xs text-stone">{c.company}</p>}
          <p className="text-xs text-stone">{c.email}</p>
        </div>
      )
    },
    { key: "phone", label: "Phone", render: (c) => <span className="text-sm text-stone">{c.phone ?? "—"}</span> },
    { key: "type", label: "Type", render: (c) => <StatusBadge status={c.type} /> },
    { key: "totalOrders", label: "Orders", render: (c) => <span className="font-semibold">{c.totalOrders}</span> },
    { key: "totalSpent", label: "Lifetime Spend", render: (c) => <span className="font-semibold text-ink">{fmt(c.totalSpent)}</span> },
    { key: "registeredAt", label: "Joined", render: (c) => <span className="text-xs text-stone">{fmtDate(c.registeredAt)}</span> },
    { key: "status", label: "Status", render: (c) => <StatusBadge status={c.status} /> },
  ];

  return (
    <PageShell>
      <PageHeader title="Customers" subtitle={`${total} customers`} action={<Btn size="sm" variant="secondary" onClick={fetchCustomers}>Refresh</Btn>} />

      <div className="flex flex-wrap gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Name, email, phone…" className="w-64" />
        <FilterSelect value={type} onChange={setType} options={[{ label: "Retail", value: "retail" }, { label: "B2B", value: "b2b" }, { label: "Guest", value: "guest" }]} placeholder="All types" />
        <FilterSelect value={sortBy} onChange={setSortBy} options={[{ label: "Registration date", value: "registeredAt" }, { label: "Total spent", value: "totalSpent" }, { label: "Total orders", value: "totalOrders" }]} placeholder="Sort by" />
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          <DataTable columns={columns} rows={customers} onRowClick={(c) => router.push(`/admin/customers/${c.id}`)} emptyMessage="No customers found." />
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </PageShell>
  );
}
