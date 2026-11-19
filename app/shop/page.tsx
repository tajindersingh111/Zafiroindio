import { Suspense } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getCatalogProducts } from "@/lib/storefront/catalog";
import ShopClient from "./ShopClient";

// Rebuilt in the background at most once a minute, and straight after admin edits.
export const revalidate = 60;

/**
 * The shop page. The interactive part (filters, sorting, the sale view) lives in ShopClient and reads the
 * URL, which makes it render in the browser, so on its own the HTML a search engine receives holds no
 * products at all. The Suspense fallback is the answer: it is rendered here on the server, with the full
 * catalogue as plain links and cards, so that HTML is a complete page; ShopClient replaces it as soon as it
 * has loaded.
 */
export default async function ShopPage() {
  const products = (await getCatalogProducts()).map((p) => ({ ...p, description: "" })); // cards never show it

  return (
    <Suspense
      fallback={
        <main style={{ background: "#faf8f5", minHeight: "100vh" }}>
          <div className="container section">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <Link href="/">Home</Link> / <span>Shop</span>
            </nav>
            <h1 className="serif" style={{ fontSize: 34, fontWeight: 600, margin: "0 0 6px" }}>
              Shop Handblock Home Textiles
            </h1>
            <p style={{ fontSize: 14, color: "#66625d", margin: "0 0 28px" }}>Timeless designs. Premium comfort.</p>
            <div className="productGrid">
              {products.map((p) => (
                <ProductCard key={p.slug} p={p} />
              ))}
            </div>
          </div>
        </main>
      }
    >
      <ShopClient />
    </Suspense>
  );
}
