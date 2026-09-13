"use client";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Product } from "@/lib/data";
import { useStore } from "./StoreProvider";

export default function ProductCard({ p }: { p: Product }) {
  const { add, wishlist, toggleWish } = useStore();
  const wished = wishlist.includes(p.slug);
  const isOutOfStock = p.badge === "OUT OF STOCK";

  // Badge color variant
  const badgeCls =
    p.badge === "NEW"
      ? "productBadge new"
      : p.badge === "SALE"
      ? "productBadge sale"
      : "productBadge";

  // Star rendering
  const stars = Math.round(p.rating);
  const starStr = "★".repeat(stars) + "☆".repeat(5 - stars);

  return (
    <article className="card">
      <div className="cardImage">
        <Link href={`/products/${p.slug}`}>
          <img
            src={p.images[0]}
            alt={`${p.name} bedsheet`}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85";
            }}
          />
        </Link>

        {p.badge && (
          <span className={badgeCls}>
            {p.badge}
          </span>
        )}

        <button
          className="wish"
          onClick={() => toggleWish(p.slug)}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            size={16}
            fill={wished ? "#b88221" : "none"}
            color={wished ? "#b88221" : "#181714"}
          />
        </button>

        <button
          className="btn gold full quick"
          disabled={isOutOfStock}
          onClick={() =>
            !isOutOfStock && add(p, p.sizes[0], p.colors[0])
          }
          style={
            isOutOfStock
              ? { opacity: 0.6, cursor: "not-allowed", background: "#888", borderColor: "#888" }
              : undefined
          }
        >
          {isOutOfStock ? "Out of Stock" : "Quick Add"}
        </button>
      </div>

      <div className="cardInfo">
        <Link href={`/products/${p.slug}`} className="cardName">
          {p.name}
        </Link>

        <div className="priceRow">
          <span className="price">₹{p.price.toLocaleString("en-IN")}</span>
          <span className="old">₹{p.oldPrice.toLocaleString("en-IN")}</span>
          <span className="discount">{p.discount}% OFF</span>
        </div>

        <div className="rating">
          <span style={{ color: "#b88221" }}>{starStr}</span>
          <span className="reviews">({p.reviews})</span>
        </div>
      </div>
    </article>
  );
}
