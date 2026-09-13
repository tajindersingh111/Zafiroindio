"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartContext";
import { Product } from "@/lib/products";

export function AddToCartForm({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [size, setSize] = useState(product.sizes[0]);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const router = useRouter();

  function handleAdd() {
    addToCart(
      {
        slug: product.slug,
        name: product.name,
        price: product.price,
        size,
        colorway: product.colorway,
        motif: product.motif,
      },
      qty
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  }

  function handleBuyNow() {
    handleAdd();
    router.push("/checkout");
  }

  return (
    <div className="mt-8 space-y-6">
      <div>
        <label className="text-sm font-medium text-ink block mb-2">Size</label>
        <div className="flex flex-wrap gap-2">
          {product.sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`px-4 py-2 rounded-sm text-sm border transition-colors ${
                size === s
                  ? "bg-indigo text-paper border-indigo"
                  : "border-stone/50 text-ink-soft hover:border-indigo"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-ink block mb-2">Quantity</label>
        <div className="inline-flex items-center border border-stone/50 rounded-sm">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center text-ink-soft hover:text-madder"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="w-10 h-10 flex items-center justify-center text-ink-soft hover:text-madder"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={handleAdd}
          className="flex-1 bg-indigo hover:bg-indigo-deep text-paper px-6 py-3.5 rounded-sm text-sm tracking-wide uppercase transition-colors"
        >
          {justAdded ? "Added to cart ✓" : "Add to cart"}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          className="flex-1 bg-madder hover:bg-madder-deep text-cream-card px-6 py-3.5 rounded-sm text-sm tracking-wide uppercase transition-colors"
        >
          Buy it now
        </button>
      </div>
    </div>
  );
}
