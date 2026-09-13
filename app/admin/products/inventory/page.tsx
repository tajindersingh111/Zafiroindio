"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, StatusBadge, Btn, SearchBar, FilterSelect, LoadingSpinner, useToast } from "@/components/admin/Shared";

interface Product {
  id: string; name: string; sku: string; categoryId: string; stock: number;
  stockStatus: string; lowStockThreshold: number; price: number;
  variations: { id: string; sku: string; attributes: { name: string; value: string }[]; stock: number; stockStatus: string; }[];
}

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }

export default function InventoryPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);

  useEffect(() => {
    fetch("/api/admin/products?pageSize=100")
      .then((r) => r.json())
      .then((d) => { setProducts(d.products ?? []); setLoading(false); });
  }, []);

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchStock = !stockFilter || p.stockStatus === stockFilter;
    return matchSearch && matchStock;
  });

  const inStock = products.filter((p) => p.stockStatus === "in_stock").length;
  const lowStock = products.filter((p) => p.stockStatus === "low_stock").length;
  const outOfStock = products.filter((p) => p.stockStatus === "out_of_stock").length;

  async function adjustStock(productId: string, delta: number) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const newStock = Math.max(0, p.stock + delta);
    const stockStatus = newStock === 0 ? "out_of_stock" : newStock <= p.lowStockThreshold ? "low_stock" : "in_stock";
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: newStock, stockStatus }),
    });
    if (res.ok) {
      setProducts((prev) => prev.map((x) => x.id === productId ? { ...x, stock: newStock, stockStatus } : x));
      addToast(`Stock updated to ${newStock}.`);
    }
  }

  async function setStock(productId: string, qty: number) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const stockStatus = qty === 0 ? "out_of_stock" : qty <= p.lowStockThreshold ? "low_stock" : "in_stock";
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: qty, stockStatus }),
    });
    if (res.ok) {
      setProducts((prev) => prev.map((x) => x.id === productId ? { ...x, stock: qty, stockStatus } : x));
      addToast("Stock adjusted."); setAdjustId(null);
    }
  }

  return (
    <PageShell>
      <PageHeader title="Inventory" subtitle="Stock levels across all products" />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: String(products.length), accent: "indigo" as const },
          { label: "In Stock", value: String(inStock), accent: "green" as const },
          { label: "Low Stock", value: String(lowStock), accent: "turmeric" as const },
          { label: "Out of Stock", value: String(outOfStock), accent: "madder" as const },
        ].map((c) => (
          <div key={c.label} className={`border border-stone/20 rounded-sm bg-cream-card p-5 relative overflow-hidden`}>
            <span className={`absolute left-0 top-0 bottom-0 w-1 bg-${c.accent}`} />
            <p className="text-[11px] uppercase tracking-wider text-stone mb-2">{c.label}</p>
            <p className="font-display text-3xl text-ink">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(lowStock > 0 || outOfStock > 0) && (
        <div className="bg-turmeric/10 border border-turmeric/30 rounded-sm px-5 py-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-[#8a6519] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          <span className="text-sm text-[#8a6519]">
            <strong>{lowStock} products</strong> are below their low-stock threshold, and <strong>{outOfStock}</strong> are out of stock. Restock soon.
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Search product or SKU…" className="w-64" />
        <FilterSelect
          value={stockFilter} onChange={setStockFilter}
          options={[{ label: "In Stock", value: "in_stock" }, { label: "Low Stock", value: "low_stock" }, { label: "Out of Stock", value: "out_of_stock" }]}
          placeholder="All stock status"
        />
      </div>

      {loading ? <LoadingSpinner /> : (
        <SectionCard>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone/20 bg-paper/50">
                {["Product", "SKU", "Price", "Stock", "Threshold", "Status", "Adjust"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{p.name}</p>
                    {p.variations.length > 0 && <p className="text-[11px] text-stone">{p.variations.length} variations</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-stone">{p.sku}</td>
                  <td className="px-4 py-3">{fmt(p.price)}</td>
                  <td className="px-4 py-3">
                    {adjustId === p.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min={0} value={adjustQty}
                          onChange={(e) => setAdjustQty(Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-stone/30 rounded-sm text-sm bg-paper focus:outline-none focus:ring-1 focus:ring-madder/40"
                          autoFocus
                        />
                        <button onClick={() => setStock(p.id, adjustQty)} className="text-xs text-indigo font-medium hover:underline">Set</button>
                        <button onClick={() => setAdjustId(null)} className="text-xs text-stone hover:text-ink">✕</button>
                      </div>
                    ) : (
                      <span className="font-semibold text-ink">{p.stock}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone text-sm">{p.lowStockThreshold}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.stockStatus} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => adjustStock(p.id, -1)} className="w-6 h-6 rounded border border-stone/30 text-sm hover:bg-madder/10 hover:text-madder transition-colors flex items-center justify-center">−</button>
                      <button onClick={() => adjustStock(p.id, 1)} className="w-6 h-6 rounded border border-stone/30 text-sm hover:bg-green-700/10 hover:text-green-700 transition-colors flex items-center justify-center">+</button>
                      <button onClick={() => { setAdjustId(p.id); setAdjustQty(p.stock); }} className="text-xs text-stone hover:text-indigo ml-1">Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-stone">No products match your filters.</td></tr>}
            </tbody>
          </table>
        </SectionCard>
      )}
    </PageShell>
  );
}
