import { notFound, permanentRedirect } from "next/navigation";
import { legacyProductTarget } from "@/lib/seo/legacy";

/**
 * The old WordPress shop kept products at /product/<slug>/. Google has those URLs indexed, so each one
 * is sent permanently to where the product lives now, which tells search engines to move the page's
 * ranking across with it. A slug the old shop never had is a plain 404.
 */
export default async function LegacyProduct({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const target = legacyProductTarget(slug);
  if (!target) notFound();
  permanentRedirect(target);
}
