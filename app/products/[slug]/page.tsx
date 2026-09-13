import { notFound } from "next/navigation";
import { getStorefrontProducts } from "@/lib/data";
import ProductClient from "@/components/ProductClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const allProducts = getStorefrontProducts();
  const p = allProducts.find(x => x.slug === slug || x.slug.toLowerCase() === slug.toLowerCase());
  return p ? { title: p.name, description: p.description, openGraph: { images: [p.images[0]] } } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const allProducts = getStorefrontProducts();
  const p = allProducts.find(x => x.slug === slug || x.slug.toLowerCase() === slug.toLowerCase());
  if (!p) notFound();
  return <ProductClient p={p} />;
}

