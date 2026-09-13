"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, StatusBadge } from "@/components/admin/Shared";

interface SearchResultProduct { id: string; name: string; sku: string; price: number; }
interface SearchResultOrder { id: string; orderNumber: string; customerName: string; total: number; status: string; }
interface SearchResultCustomer { id: string; name: string; email: string; company?: string; }
interface SearchResultCoupon { id: string; code: string; amount: number; type: string; }

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") ?? "";

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<{
    products: SearchResultProduct[];
    orders: SearchResultOrder[];
    customers: SearchResultCustomer[];
    coupons: SearchResultCoupon[];
  }>({ products: [], orders: [], customers: [], coupons: [] });

  useEffect(() => {
    if (!q) {
      setResults({ products: [], orders: [], customers: [], coupons: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/admin/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data);
        setLoading(false);
      });
  }, [q]);

  const isEmpty =
    results.products.length === 0 &&
    results.orders.length === 0 &&
    results.customers.length === 0 &&
    results.coupons.length === 0;

  return (
    <PageShell>
      <PageHeader title="Global Search" subtitle={q ? `Search results for "${q}"` : "Enter a search query"} />

      {loading ? (
        <LoadingSpinner />
      ) : isEmpty ? (
        <div className="text-center py-16 border border-stone/20 rounded-sm bg-cream-card">
          <p className="text-stone font-medium">No results found for your search query.</p>
          <p className="text-xs text-stone mt-1">Try searching for a different keyword, SKU, or email.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Products */}
          {results.products.length > 0 && (
            <SectionCard title="Matching Products">
              <div className="divide-y divide-stone/20">
                {results.products.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/admin/products/${p.id}`)}
                    className="py-3 px-4 flex items-center justify-between hover:bg-paper/50 cursor-pointer"
                  >
                    <div>
                      <p className="font-semibold text-indigo">{p.name}</p>
                      <p className="text-xs text-stone">SKU: {p.sku}</p>
                    </div>
                    <p className="font-semibold text-ink">₹{p.price.toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Orders */}
          {results.orders.length > 0 && (
            <SectionCard title="Matching Orders">
              <div className="divide-y divide-stone/20">
                {results.orders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => router.push(`/admin/orders/${o.id}`)}
                    className="py-3 px-4 flex items-center justify-between hover:bg-paper/50 cursor-pointer"
                  >
                    <div>
                      <p className="font-semibold text-indigo">{o.orderNumber}</p>
                      <p className="text-xs text-stone">{o.customerName}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-semibold text-ink">₹{o.total.toLocaleString("en-IN")}</p>
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Customers */}
          {results.customers.length > 0 && (
            <SectionCard title="Matching Customers">
              <div className="divide-y divide-stone/20">
                {results.customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => router.push(`/admin/customers/${c.id}`)}
                    className="py-3 px-4 flex items-center justify-between hover:bg-paper/50 cursor-pointer"
                  >
                    <div>
                      <p className="font-semibold text-indigo">{c.name}</p>
                      <p className="text-xs text-stone">{c.email}</p>
                    </div>
                    {c.company && (
                      <p className="text-xs font-semibold uppercase tracking-wider text-stone bg-stone/10 px-2 py-0.5 rounded-sm">
                        {c.company}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Coupons */}
          {results.coupons.length > 0 && (
            <SectionCard title="Matching Coupons">
              <div className="divide-y divide-stone/20">
                {results.coupons.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => router.push("/admin/coupons")}
                    className="py-3 px-4 flex items-center justify-between hover:bg-paper/50 cursor-pointer"
                  >
                    <div>
                      <p className="font-mono font-bold text-indigo">{c.code}</p>
                      <p className="text-xs text-stone capitalize">{c.type.replace(/_/g, " ")}</p>
                    </div>
                    <p className="font-semibold text-ink">
                      {c.type === "percent" ? `${c.amount}%` : `₹${c.amount}`}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}
    </PageShell>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={<PageShell><LoadingSpinner /></PageShell>}>
      <SearchResultsContent />
    </Suspense>
  );
}
