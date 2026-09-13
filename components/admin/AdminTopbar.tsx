"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SearchResult {
  type: "product" | "order" | "customer" | "coupon";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export function AdminTopbar({ onMenuClick }: { onMenuClick: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setSearchOpen(false); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const q = encodeURIComponent(searchQuery.trim());
        const res = await fetch(`/api/admin/search?q=${q}`);
        const data = await res.json();
        const results: SearchResult[] = [
          ...(data.products ?? []).map((p: any) => ({ type: "product" as const, id: p.id, title: p.name, subtitle: `Product · SKU: ${p.sku}`, href: `/admin/products/${p.id}` })),
          ...(data.orders ?? []).map((o: any) => ({ type: "order" as const, id: o.id, title: `Order #${o.orderNumber}`, subtitle: `Order · ${o.customerName} · ₹${o.total.toLocaleString("en-IN")}`, href: `/admin/orders/${o.id}` })),
          ...(data.customers ?? []).map((c: any) => ({ type: "customer" as const, id: c.id, title: c.name, subtitle: `Customer · ${c.email}${c.company ? ` (${c.company})` : ""}`, href: `/admin/customers/${c.id}` })),
          ...(data.coupons ?? []).map((cp: any) => ({ type: "coupon" as const, id: cp.id, title: cp.code, subtitle: `Coupon · ${cp.type === "percent" ? `${cp.amount}%` : `₹${cp.amount}`}`, href: `/admin/coupons` })),
        ];
        setSearchResults(results.slice(0, 8));
        setSearchOpen(results.length > 0);
      } catch { /**/ } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) { if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const typeColors: Record<string, string> = {
    product: "bg-indigo/10 text-indigo",
    order: "bg-turmeric/20 text-[#8a6519]",
    customer: "bg-green-700/10 text-green-800",
    coupon: "bg-madder/10 text-madder",
  };

  return (
    <header className="h-16 shrink-0 border-b border-stone/20 bg-cream-card flex items-center gap-4 px-4 md:px-6">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-sm text-ink-soft hover:bg-paper transition-colors cursor-pointer"
        aria-label="Open menu"
      >
         <svg width="20" height="20" style={{ width: "20px", height: "20px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>

      {/* Search */}
      <div className="flex-1 max-w-lg" ref={searchRef}>
        <div className="relative">
          <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                setSearchOpen(false);
                router.push(`/admin/search?q=${encodeURIComponent(searchQuery.trim())}`);
              }
            }}
            placeholder="Search products, orders, customers, coupons…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-paper border border-stone/30 rounded-sm text-ink placeholder-stone focus:outline-none focus:ring-2 focus:ring-madder/40 focus:border-madder transition-colors"
          />
          {searching && (
            <svg width="14" height="14" style={{ width: "14px", height: "14px", flexShrink: 0 }} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-stone" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          )}

          {/* Dropdown */}
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-cream-card border border-stone/30 rounded-sm shadow-xl z-50">
              {searchResults.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={r.href}
                  onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-paper transition-colors"
                >
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${typeColors[r.type]}`}>{r.type}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{r.title}</p>
                    <p className="text-xs text-stone truncate">{r.subtitle}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 ml-auto">
        <Link
          href="/admin/orders?status=pending_payment"
          className="relative p-2 rounded-sm text-ink-soft hover:bg-paper transition-colors"
          title="Pending orders"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
        </Link>

        <Link
          href="/admin/settings"
          className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-indigo-deep/5 hover:bg-indigo-deep/10 transition-colors"
        >
          <div className="w-6 h-6 rounded-full bg-indigo text-white flex items-center justify-center text-xs font-bold">A</div>
          <span className="hidden sm:block text-xs font-medium text-ink-soft">Admin</span>
        </Link>
      </div>
    </header>
  );
}
