import { readCollection } from "@/lib/db/store";
import { cached } from "@/lib/cache";

/** A maker shown in "Meet the Makers" on product pages (managed in Admin → Artisans). */
export type Artisan = {
  id: string;
  name: string;
  /** What they do, e.g. "Block printer" or "Block carver". */
  craft: string;
  /** Where they work, e.g. "Sanganer, Jaipur". */
  place?: string;
  years?: number;
  story: string;
  photo: string;
  active: boolean;
};

/** Active artisans in the admin's order. Never throws: the product page simply hides the section. */
export async function getArtisans(): Promise<Artisan[]> {
  try {
    const all = await cached("catalog:artisans", 60_000, () => readCollection<Artisan>("artisans"));
    return all.filter((a) => a.active !== false && a.name && a.photo);
  } catch (e) {
    console.error("[artisans] unavailable:", e);
    return [];
  }
}
