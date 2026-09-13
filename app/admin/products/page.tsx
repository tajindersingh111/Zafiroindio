"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PageShell, PageHeader, DataTable, Pagination, SearchBar, FilterSelect,
  StatusBadge, Column, ConfirmDialog, Btn, LoadingSpinner, useToast,
} from "@/components/admin/Shared";

interface Product {
  id: string; name: string; sku: string; type: string; status: string;
  price: number; salePrice?: number; stock: number; stockStatus: string;
  categoryId: string; brandId?: string; tags: string[];
  createdAt: string; updatedAt: string;
}
interface Category { id: string; name: string; }

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }

export default function ProductsPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    if (stockStatus) params.set("stock", stockStatus);
    const [pRes, catRes] = await Promise.all([
      fetch(`/api/admin/products?${params}`),
      fetch("/api/admin/products/categories"),
    ]);
    const [pData, catData] = await Promise.all([pRes.json(), catRes.json()]);
    setProducts(pData.products ?? []);
    setTotal(pData.total ?? 0);
    setTotalPages(pData.totalPages ?? 1);
    setCategories(catData.categories ?? []);
    setLoading(false);
  }, [page, search, category, status, stockStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, category, status, stockStatus]);

  async function handleBulkDelete() {
    const ids = selectedIds.join(",");
    await fetch(`/api/admin/products?ids=${ids}`, { method: "DELETE" });
    addToast(`Deleted ${selectedIds.length} product(s).`, "warning");
    setSelectedIds([]); setConfirmDelete(false); fetchData();
  }

  async function handleDuplicate(id: string) {
    const res = await fetch(`/api/admin/products/${id}`, { method: "POST" });
    if (res.ok) { addToast("Product duplicated."); fetchData(); }
    else addToast("Failed to duplicate.", "error");
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    addToast("Product deleted.", "warning");
    fetchData();
  }

  const columns: Column<Product>[] = [
    {
      key: "name", label: "Product", render: (p: any) => (
        <div className="flex items-center gap-3">
          <img
            src={p.images?.[0] || "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85"}
            alt={p.name}
            className="w-10 h-10 object-cover rounded border border-stone/20 shrink-0"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85";
            }}
          />
          <div>
            <p className="font-medium text-ink text-sm">{p.name}</p>
            <p className="text-xs text-stone font-mono">{p.sku}</p>
          </div>
        </div>
      )
    },
    { key: "type", label: "Type", render: (p) => <span className="text-xs text-stone capitalize">{p.type}</span> },
    { key: "price", label: "Price", render: (p) => (
      <div>
        <span className="font-semibold text-ink">{fmt(p.salePrice ?? p.price)}</span>
        {p.salePrice && <span className="text-xs text-stone line-through ml-1">{fmt(p.price)}</span>}
      </div>
    )},
    { key: "stock", label: "Stock", render: (p) => (
      <div className="flex items-center gap-2">
        <span className="text-sm">{p.stock}</span>
        <StatusBadge status={p.stockStatus} />
      </div>
    )},
    { key: "status", label: "Status", render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "actions", label: "", render: (p) => (
        <div className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
          <Link href={`/admin/products/${p.id}`} className="text-indigo hover:underline">Edit</Link>
          <button onClick={() => handleDuplicate(p.id)} className="text-stone hover:text-indigo">Copy</button>
          <button onClick={() => handleDelete(p.id)} className="text-madder hover:underline">Del</button>
        </div>
      )
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Products"
        subtitle={`${total} products`}
        action={
          <div className="flex gap-2">
            <Link href="/admin/products/import"><Btn variant="secondary">📥 Bulk Import CSV</Btn></Link>
            <Link href="/admin/products/new"><Btn>+ Add Product</Btn></Link>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Search name, SKU, tag…" className="w-64" />
        <FilterSelect value={category} onChange={setCategory} options={categories.map((c) => ({ label: c.name, value: c.id }))} placeholder="All categories" />
        <FilterSelect value={status} onChange={setStatus} options={[{ label: "Active", value: "active" }, { label: "Draft", value: "draft" }, { label: "Archived", value: "archived" }]} placeholder="All statuses" />
        <FilterSelect value={stockStatus} onChange={setStockStatus} options={[{ label: "In Stock", value: "in_stock" }, { label: "Low Stock", value: "low_stock" }, { label: "Out of Stock", value: "out_of_stock" }]} placeholder="All stock" />
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 bg-madder/10 border border-madder/20 rounded-sm px-4 py-3">
          <span className="text-sm font-medium text-madder">{selectedIds.length} selected</span>
          <Btn size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>Delete Selected</Btn>
          <button onClick={() => setSelectedIds([])} className="text-xs text-stone hover:text-ink ml-auto">Clear</button>
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <>
          <DataTable
            columns={columns}
            rows={products}
            onRowClick={(p) => router.push(`/admin/products/${p.id}`)}
            selectedIds={selectedIds}
            onSelectAll={(checked) => setSelectedIds(checked ? products.map((p) => p.id) : [])}
            onSelectRow={(id, checked) => setSelectedIds((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id))}
            emptyMessage="No products found."
          />
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete products?"
        message={`This will permanently delete ${selectedIds.length} product(s). This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </PageShell>
  );
}
