import { prisma } from "@/lib/db/prisma";
import { cached } from "@/lib/cache";

export type FeaturedReview = {
  /** "Priya S." — first name and last initial only; never an e-mail address. */
  name: string;
  rating: number;
  title: string;
  text: string;
  product: string;
};

/** "Priya Sharma" → "Priya S."; blank → "Zafiro customer". */
function publicName(raw: string | null): string {
  const parts = String(raw ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Zafiro customer";
  const first = parts[0].replace(/[^\p{L}'’-]/gu, "");
  const last = parts.length > 1 ? parts[parts.length - 1][0]?.toUpperCase() : "";
  return first ? (last ? `${first} ${last}.` : first) : "Zafiro customer";
}

/** Below this many qualifying reviews the section is hidden rather than looking thin. */
export const MIN_FEATURED_REVIEWS = 3;

/**
 * Real, approved customer reviews for the home page.
 *
 * Only genuine reviews from the review system: approved, 4 stars or more, and long enough to say
 * something. Nothing is invented and nothing is padded — with too few good reviews the section
 * simply does not show. Photos and e-mail addresses never leave the database.
 */
export function getFeaturedReviews(limit = 6): Promise<FeaturedReview[]> {
  // "catalog:" prefix, so an admin edit (which clears that prefix) refreshes it.
  return cached(`catalog:home-reviews:${limit}`, 60_000, async () => {
    try {
      const rows = await prisma.$queryRaw<{ name: string | null; rating: number; title: string | null; text: string; product: string | null }[]>`
        SELECT data->>'customerName' AS name,
               (data->>'rating')::int AS rating,
               data->>'title' AS title,
               data->>'review' AS text,
               data->>'productName' AS product
        FROM documents
        WHERE collection = 'reviews'
          AND data->>'status' = 'approved'
          AND jsonb_typeof(data->'rating') = 'number'
          AND (data->>'rating')::int >= 4
          AND length(trim(coalesce(data->>'review', ''))) >= 40
        ORDER BY data->>'createdAt' DESC
        LIMIT ${limit}`;
      if (rows.length < MIN_FEATURED_REVIEWS) return [];
      return rows.map((r) => ({
        name: publicName(r.name),
        rating: Math.min(5, Math.max(1, Math.round(Number(r.rating)))),
        title: String(r.title ?? "").trim().slice(0, 90),
        text: String(r.text).trim().slice(0, 320),
        product: String(r.product ?? "").trim().slice(0, 90),
      }));
    } catch (e) {
      console.error("[reviews] featured reviews unavailable:", e);
      return [];
    }
  });
}
