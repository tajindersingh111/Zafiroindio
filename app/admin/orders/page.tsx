"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PageShell, PageHeader, DataTable, Pagination, SearchBar, FilterSelect,
  StatusBadge, Column, ConfirmDialog, Btn, LoadingSpinner, useToast,
} from "@/components/admin/Shared";

interface Order {
  id: string; orderNumber: string; customerName: string; customerEmail: string;
  total: number; status: string; paymentMethod: string; type: string;
  createdAt: string; items: { quantity: number }[];
}

const STATUS_OPTIONS = [
  { label: "Pending Payment", value: "pending_payment" },
  { label: "Processing", value: "processing" },
  { label: "On Hold", value: "on_hold" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Failed", value: "failed" },
  { label: "Refunded", value: "refunded" },
];

const PAYMENT_OPTIONS = [
  { label: "COD", value: "cod" },
  { label: "UPI", value: "upi" },
  { label: "Card", value: "card" },
  { label: "Net Banking", value: "netbanking" },
  { label: "Wallet", value: "wallet" },
];

const TYPE_OPTIONS = [
  { label: "Retail", value: "retail" },
  { label: "B2B", value: "b2b" },
];

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }

export default function OrdersPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [type, setType] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "15" });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (paymentMethod) params.set("paymentMethod", paymentMethod);
    if (type) params.set("type", type);
    const res = await fetch(`/api/admin/orders?${params}`);
    const data = await res.json();
    setOrders(data.orders ?? []);
    setTotal(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [page, search, status, paymentMethod, type]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(1); }, [search, status, paymentMethod, type]);

  async function handleBulkStatusUpdate() {
    if (!bulkStatus || !selectedIds.length) return;
    await Promise.all(selectedIds.map((id) => fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: bulkStatus }) })));
    addToast(`Updated ${selectedIds.length} order(s) to ${bulkStatus}.`);
    setSelectedIds([]); setBulkStatus("");
    fetchOrders();
  }

  async function handleBulkCancel() {
    await Promise.all(selectedIds.map((id) => fetch(`/api/admin/orders/${id}`, { method: "DELETE" })));
    addToast(`${selectedIds.length} order(s) archived.`, "warning");
    setSelectedIds([]); setConfirmDelete(false);
    fetchOrders();
  }

  const columns: Column<Order>[] = [
    { key: "orderNumber", label: "Order #", render: (o) => <span className="font-mono text-xs text-indigo font-semibold">{o.orderNumber}</span> },
    { key: "customerName", label: "Customer", render: (o) => (
      <div><p className="text-sm font-medium text-ink">{o.customerName}</p><p className="text-xs text-stone">{o.customerEmail}</p></div>
    )},
    { key: "items", label: "Items", render: (o) => <span className="text-sm">{o.items.reduce((s, i) => s + i.quantity, 0)} items</span> },
    { key: "total", label: "Total", render: (o) => <span className="font-semibold text-ink">{fmt(o.total)}</span> },
    { key: "paymentMethod", label: "Payment", render: (o) => <span className="text-xs uppercase text-stone">{o.paymentMethod}</span> },
    { key: "type", label: "Type", render: (o) => <StatusBadge status={o.type} /> },
    { key: "status", label: "Status", render: (o) => <StatusBadge status={o.status} /> },
    { key: "createdAt", label: "Date", render: (o) => <span className="text-xs text-stone">{fmtDate(o.createdAt)}</span> },
    {
      key: "actions", label: "", render: (o) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => router.push(`/admin/orders/${o.id}`)} className="text-xs text-indigo hover:underline">View</button>
        </div>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Orders"
        subtitle={`${total} orders total`}
        action={<Btn variant="secondary" onClick={fetchOrders} size="sm">Refresh</Btn>}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Search order #, customer…" className="w-64" />
        <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} placeholder="All statuses" />
        <FilterSelect value={paymentMethod} onChange={setPaymentMethod} options={PAYMENT_OPTIONS} placeholder="All payment methods" />
        <FilterSelect value={type} onChange={setType} options={TYPE_OPTIONS} placeholder="Retail + B2B" />
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 bg-indigo/10 border border-indigo/20 rounded-sm px-4 py-3">
          <span className="text-sm font-medium text-indigo">{selectedIds.length} selected</span>
          <FilterSelect value={bulkStatus} onChange={setBulkStatus} options={STATUS_OPTIONS} placeholder="Change status to…" />
          <Btn size="sm" onClick={handleBulkStatusUpdate} disabled={!bulkStatus}>Apply</Btn>
          <Btn size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>Archive</Btn>
          <button onClick={() => setSelectedIds([])} className="text-xs text-stone hover:text-ink ml-auto">Clear selection</button>
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <>
          <DataTable
            columns={columns}
            rows={orders}
            onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
            selectedIds={selectedIds}
            onSelectAll={(checked) => setSelectedIds(checked ? orders.map((o) => o.id) : [])}
            onSelectRow={(id, checked) => setSelectedIds((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id))}
            emptyMessage="No orders found. Try adjusting your filters."
          />
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Archive orders?"
        message={`This will archive ${selectedIds.length} order(s) by setting them to Cancelled. Financial records are preserved.`}
        confirmLabel="Archive"
        danger
        onConfirm={handleBulkCancel}
        onCancel={() => setConfirmDelete(false)}
      />
    </PageShell>
  );
}
