"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Product } from "@/lib/products";

export type CartLine = {
  slug: string;
  name: string;
  price: number;
  size: string;
  qty: number;
  colorway: [string, string, string];
  motif: Product["motif"];
};

type CartContextType = {
  lines: CartLine[];
  addToCart: (line: Omit<CartLine, "qty">, qty?: number) => void;
  removeLine: (slug: string, size: string) => void;
  updateQty: (slug: string, size: string, qty: number) => void;
  clearCart: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "zafiro-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const addToCart: CartContextType["addToCart"] = (line, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.slug === line.slug && l.size === line.size);
      if (existing) {
        return prev.map((l) =>
          l.slug === line.slug && l.size === line.size ? { ...l, qty: l.qty + qty } : l
        );
      }
      return [...prev, { ...line, qty }];
    });
  };

  const removeLine: CartContextType["removeLine"] = (slug, size) => {
    setLines((prev) => prev.filter((l) => !(l.slug === slug && l.size === size)));
  };

  const updateQty: CartContextType["updateQty"] = (slug, size, qty) => {
    setLines((prev) =>
      prev.map((l) => (l.slug === slug && l.size === size ? { ...l, qty: Math.max(1, qty) } : l))
    );
  };

  const clearCart = () => setLines([]);

  const count = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);
  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.qty * l.price, 0), [lines]);

  return (
    <CartContext.Provider value={{ lines, addToCart, removeLine, updateQty, clearCart, count, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
