import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { getCatalogCollections, getCatalogProducts, productsIn } from "@/lib/storefront/catalog";
import { plainText } from "@/lib/seo/text";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://zafiroindio.com";
const abs = (u: string) => (/^https?:\/\//i.test(u) ? u : `${BASE}${u.startsWith("/") ? "" : "/"}${u}`);

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
  const { collection, items } = data;
  const url = `${BASE}/collections/${collection.slug}`;
  // A collection with no blurb of its own used to get "15 hand-block printed pieces, made in Jaipur." (45
  // characters); say what it is and what is in it.
  const blurb = plainText(collection.desc, 155);
  const description =
    blurb.length >= 80
      ? blurb
      : `Shop ${items.length} hand block printed ${collection.name.toLowerCase()}, made by artisans in Jaipur. Easy 7-day exchanges and secure checkout.`;
  const image = collection.image ? abs(collection.image) : items[0]?.images?.[0] ? abs(items[0].images[0]) : undefined;
  return {
    title: collection.name,
    description,
    alternates: { canonical: url },
    openGraph: { title: collection.name, description, type: "website", url, images: image ? [{ url: image, alt: collection.name }] : undefined },
    twitter: { card: "summary_large_image", title: collection.name, description, images: image ? [image] : undefined },
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const data = await load((await params).slug);
  if (!data) notFound();
  const { collection, items } = data;
  const url = `${BASE}/collections/${collection.slug}`;
  const ld = (o: unknown) => JSON.stringify(o).replace(/</g, "\\u003c");
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.name,
    url,
    ...(collection.desc ? { description: plainText(collection.desc, 300) } : {}),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.slice(0, 24).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${BASE}/products/${p.slug}`, name: p.name })),
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      { "@type": "ListItem", position: 2, name: "Collections", item: `${BASE}/collections` },
      { "@type": "ListItem", position: 3, name: collection.name, item: url },
    ],
  };

  return (
    <main className="blockprint-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(collectionLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(breadcrumbLd) }} />
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
