"use client";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/data";

let cache: Product[] | null = null;
let inflight: Promise<Product[]> | null = null;

function load(): Promise<Product[]> {
  if (cache) return Promise.resolve(cache);
  inflight ??= fetch("/api/products")
    .then((r) => r.json())
    .then((d) => (cache = Array.isArray(d.products) ? (d.products as Product[]) : []))
    .catch(() => [] as Product[])
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Live catalogue for client components (cached per page load). */
export function useCatalog(): { products: Product[]; loading: boolean } {
  const [products, setProducts] = useState<Product[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);
  useEffect(() => {
    let alive = true;
    load().then((p) => {
      if (!alive) return;
      setProducts(p);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);
  return { products, loading };
}
