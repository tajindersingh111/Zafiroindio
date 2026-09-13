"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, Btn, useToast } from "@/components/admin/Shared";
import { MetaWrapper } from "@/components/admin/MetaWrapper";

interface CatalogItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  catalogStatus: string;
  lastSync: string;
}

function fmt(n: number) { return "₹" + Math.round(n).toLocaleString("en-IN"); }

export default function MetaCatalogPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchCatalog();
  }, []);

  function fetchCatalog() {
    setLoading(true);
    fetch("/api/admin/meta/catalog")
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }

  async function handleSyncNow() {
    setSyncing(true);
    const res = await fetch("/api/admin/meta/catalog", { method: "POST" });
    if (res.ok) {
      addToast("WooCommerce product catalog synced to Meta Marketplace Catalog.");
      fetchCatalog();
    }
    setSyncing(false);
  }

  return (
    <MetaWrapper>
      <PageShell>
        <PageHeader
          title="Meta Catalog Manager"
          subtitle="Sync WooCommerce product listings, manage catalog mappings, and inspect sync statuses."
          action={<Btn size="sm" onClick={handleSyncNow} disabled={syncing}>{syncing ? "Syncing..." : "Sync Now"}</Btn>}
        />

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
                <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Catalog Products Count</p>
                <p className="text-xl font-display font-semibold mt-1">{items.length} items synced</p>
              </div>
              <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
                <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Sync Connection Status</p>
                <p className="text-xl font-display font-semibold mt-1 text-green-800">Operational</p>
              </div>
              <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
                <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">WooCommerce webhook sync</p>
                <p className="text-xl font-display font-semibold mt-1 text-indigo">Active</p>
              </div>
            </div>

            {/* Catalog List */}
            <SectionCard title="Catalog Synced Products">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone/20 bg-paper/50">
                    {["Product / SKU", "Stock Level", "Listed Price", "Last Meta Sync", "Catalog Status"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{item.name}</p>
                        <p className="text-xs text-stone">SKU: {item.sku}</p>
                      </td>
                      <td className="px-4 py-3">{item.stock} units</td>
                      <td className="px-4 py-3 font-semibold text-indigo">{fmt(item.price)}</td>
                      <td className="px-4 py-3 text-xs text-stone">{new Date(item.lastSync).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-700/10 text-green-800 uppercase">
                          {item.catalogStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          </div>
        )}
      </PageShell>
    </MetaWrapper>
  );
}
