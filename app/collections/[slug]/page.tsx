import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { getCatalogCollections, getCatalogProducts, productsIn } from "@/lib/storefront/catalog";

// Cached page (ISR): rebuilt in the background at most once a minute, and right after admin edits.
export const revalidate = 60;

/** No pages at build time: each collection is rendered on its first visit, then served from cache. */
export async function generateStaticParams() {
  return [];
}

async function load(slug: string) {
  const [collections, products] = await Promise.all([getCatalogCollections(), getCatalogProducts()]);
  const collection = collections.find((c) => c.slug === slug);
  if (!collection) return null;
  const items = productsIn(products, collection).map((p) => ({ ...p, description: "" })); // cards never show it
  return { collection, items };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const data = await load((await params).slug);
  if (!data) return { title: "Collection not found" };
  return { title: data.collection.name, description: data.collection.desc };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const data = await load((await params).slug);
  if (!data) notFound();
  const { collection, items } = data;

  return (
    <main className="blockprint-bg">
      <div className="container section">
        <div className="breadcrumb">
          <Link href="/">Home</Link> / <Link href="/collections">Collections</Link> / <span>{collection.name}</span>
        </div>
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 40px" }}>
          <span className="eyebrow">Collection</span>
          <h1 className="serif" style={{ fontSize: "clamp(34px,5vw,54px)", margin: "10px 0 0" }}>{collection.name}</h1>
          <div className="ornament"><i /></div>
          {collection.desc && <p style={{ color: "var(--ink-soft)" }}>{collection.desc}</p>}
        </div>
        {items.length ? (
          <div className="productGrid">{items.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
        ) : (
          <div className="lux-card" style={{ textAlign: "center", padding: "56px 24px" }}>
            <p style={{ color: "var(--muted)", marginBottom: 20 }}>New pieces for this collection are being block-printed. Please check back soon.</p>
            <Link className="btn gold" href="/shop">Browse all bedsheets</Link>
          </div>
        )}
      </div>
    </main>
  );
}
