import { notFound, permanentRedirect } from "next/navigation";
import { legacyCategoryTarget } from "@/lib/seo/legacy";

/** The old shop's /product-category/<slug>/ pages, sent permanently to the matching collection. */
export default async function LegacyCategory({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const target = legacyCategoryTarget(slug);
  if (!target) notFound();
  permanentRedirect(target);
}
