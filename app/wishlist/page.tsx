"use client";
import Link from "next/link";
import { Heart } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { useStore } from "@/components/StoreProvider";
import { useCatalog } from "@/lib/storefront/useCatalog";

export default function Wishlist() {
  const { wishlist } = useStore();
  const { products } = useCatalog();
  const items = products.filter((p) => wishlist.includes(p.slug));
  return (
    <main className="blockprint-bg">
      <div className="container section">
        <div className="breadcrumb">Home / Wishlist</div>
        <h1 className="serif" style={{ fontSize: "clamp(32px,5vw,46px)" }}>Your Wishlist</h1>
        <div className="ornament" style={{ justifyContent: "flex-start", margin: "6px 0 28px" }}><i /></div>
        {!items.length ? (
          <div className="lux-card" style={{ textAlign: "center", padding: "64px 24px" }}>
            <Heart size={34} style={{ color: "var(--gold-dark)" }} />
            <h2 className="serif" style={{ fontSize: 28, margin: "12px 0 6px" }}>Save pieces you love.</h2>
            <p style={{ color: "var(--muted)", marginBottom: 22 }}>Tap the heart on any product to keep it here.</p>
            <Link className="btn gold" href="/shop">Explore Bedsheets</Link>
          </div>
        ) : (
          <div className="productGrid">{items.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
        )}
      </div>
    </main>
  );
}
