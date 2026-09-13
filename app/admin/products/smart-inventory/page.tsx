"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, DataTable, Column } from "@/components/admin/Shared";

interface SmartProduct {
  id: string;
  name: string;
  sku: string;
  stock: number;
  cost: number;
  valuation: number;
  unitsSold: number;
  daysToStockout: string | number;
  daysSinceLastSale: number;
}

interface SmartInventoryResponse {
  products: SmartProduct[];
  fastMoving: SmartProduct[];
  slowMoving: SmartProduct[];
  deadStock: SmartProduct[];
  outOfStock: SmartProduct[];
  totalValuation: number;
}

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }

export default function SmartInventoryPage() {
  const [data, setData] = useState<SmartInventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "fast" | "slow" | "dead" | "out">("overview");

  useEffect(() => {
    fetch("/api/admin/products/smart-inventory")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading || !data) return <PageShell><LoadingSpinner /></PageShell>;

  const productCols: Column<SmartProduct>[] = [
    { key: "name", label: "Product", render: (p) => (
      <div>
        <p className="font-semibold text-indigo">{p.name}</p>
        <p className="text-xs text-stone">SKU: {p.sku}</p>
      </div>
    )},
    { key: "stock", label: "Stock Level", render: (p) => (
      <span className={`font-bold ${p.stock === 0 ? "text-madder" : p.stock < 10 ? "text-[#8a6519]" : "text-green-800"}`}>
        {p.stock} units
      </span>
    )},
    { key: "unitsSold", label: "Total Units Sold", render: (p) => <span className="font-semibold">{p.unitsSold}</span> },
    { key: "daysToStockout", label: "Prediction Stock-out", render: (p) => (
      <span className="text-xs font-semibold text-stone">
        {typeof p.daysToStockout === "number" ? `approx. ${p.daysToStockout} days` : p.daysToStockout}
      </span>
    )},
    { key: "valuation", label: "Inventory Valuation", render: (p) => <span className="font-bold">{p.cost > 0 ? fmt(p.valuation) : "No cost price configured"}</span> }
  ];

  return (
    <PageShell>
      <PageHeader title="Smart Inventory Intelligence" subtitle="Predictive stock calculations, inventory valuations, and velocity metrics." />

      {/* Tabs */}
      <div className="flex border-b border-stone/20 mb-6">
        {[
          { id: "overview", label: "Inventory Valuation & Overview" },
          { id: "fast", label: "Fast-Moving Products" },
          { id: "slow", label: "Slow-Moving Products" },
          { id: "dead", label: "Dead Stock" },
          { id: "out", label: "Out of Stock" },
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

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-cream-card border border-stone/20 p-5 rounded-sm">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Total Inventory Valuation</p>
              <p className="text-2xl font-display font-semibold mt-1 text-ink">{fmt(data.totalValuation)}</p>
            </div>
            <div className="bg-cream-card border border-stone/20 p-5 rounded-sm">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Out of Stock Items</p>
              <p className="text-2xl font-display font-semibold mt-1 text-madder">{data.outOfStock.length} products</p>
            </div>
            <div className="bg-cream-card border border-stone/20 p-5 rounded-sm">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Dead Stock Items</p>
              <p className="text-2xl font-display font-semibold mt-1 text-[#8a6519]">{data.deadStock.length} products</p>
            </div>
          </div>

          <SectionCard title="Comprehensive Inventory Statistics">
            <DataTable columns={productCols} rows={data.products} emptyMessage="No products found." />
          </SectionCard>
        </div>
      )}

      {activeTab === "fast" && (
        <SectionCard title="Fast-Moving Products (By Units Sold)">
          <DataTable columns={productCols} rows={data.fastMoving} emptyMessage="No fast moving products identified." />
        </SectionCard>
      )}

      {activeTab === "slow" && (
        <SectionCard title="Slow-Moving Products">
          <DataTable columns={productCols} rows={data.slowMoving} emptyMessage="No slow moving products identified." />
        </SectionCard>
      )}

      {activeTab === "dead" && (
        <SectionCard title="Dead Stock (No sales for 90+ Days)">
          <DataTable columns={productCols} rows={data.deadStock} emptyMessage="No dead stock detected." />
        </SectionCard>
      )}

      {activeTab === "out" && (
        <SectionCard title="Out of Stock Items">
          <DataTable columns={productCols} rows={data.outOfStock} emptyMessage="No out of stock products." />
        </SectionCard>
      )}
    </PageShell>
  );
}
