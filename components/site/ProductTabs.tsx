"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/data";

export type ProductTab = { id: string; label: string; href: string; products: Product[] };

/**
 * Bestsellers / New arrivals / On sale, one grid with tabs.
 *
 * One strip of products that changes on demand shows more of the range in the same space than three
 * stacked sections would, and keeps the page short. The tab lists are built on the server from real
 * data (sales rank, date added, price versus list price), so nothing here is hand-picked or invented.
 */
export default function ProductTabs({ tabs }: { tabs: ProductTab[] }) {
  const [active, setActive] = useState(0);
  const uid = useId();
  const visible = tabs.filter((t) => t.products.length > 0);
  if (!visible.length) return null;
  const current = visible[Math.min(active, visible.length - 1)];

  // Arrow keys move between tabs, as people expect from a tab list.
  function onKey(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : -1) + visible.length) % visible.length;
    setActive(next);
    document.getElementById(`${uid}-tab-${next}`)?.focus();
  }

  return (
    <div className="hm-tabs">
      <div className="hm-tablist" role="tablist" aria-label="Browse products">
        {visible.map((t, i) => (
          <button
            key={t.id}
            id={`${uid}-tab-${i}`}
            type="button"
            role="tab"
            aria-selected={current.id === t.id}
            aria-controls={`${uid}-panel`}
            tabIndex={current.id === t.id ? 0 : -1}
            className={`hm-tab${current.id === t.id ? " isActive" : ""}`}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={current.id} id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${visible.indexOf(current)}`} className="hm-products hm-panel">
        {current.products.map((p) => (
          <ProductCard key={p.slug} p={p} />
        ))}
      </div>

      <div className="hm-more">
        <Link className="btn dark" href={current.href}>
          Explore all {current.label.toLowerCase()} <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
