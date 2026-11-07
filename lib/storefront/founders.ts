import { readCollection } from "@/lib/db/store";
import { cached } from "@/lib/cache";

/** A founder shown on the About page (managed in Admin → Content → Founders). */
export type Founder = {
  id: string;
  name: string;
  /** Short label, e.g. "Founder" or "Co-Founder". */
  role: string;
  /** What they do, e.g. "Fashion & Design Analyst". */
  title?: string;
  /** Two or three lines about them. */
  blurb: string;
  photo: string;
  active: boolean;
};

/**
 * Placeholder founders, used until someone saves real ones in the admin.
 *
 * The photos are the ones already in `public/editorial/`. They exist so the About page is never
 * blank and so the shop owner can see exactly what they are replacing — every field here is
 * editable in Admin → Content → Founders.
 */
export const DEFAULT_FOUNDERS: Founder[] = [
  {
    id: "founder-neelu",
    name: "Neelu Singh",
    role: "Founder",
    title: "Fashion & Design Analyst",
    blurb:
      "Thirty years inside the textile industry taught her to read a fabric by hand — the weave, the dye, the way a design holds its line. Zafiro Indio is the brand she always meant to build, and she built it on her own terms.",
    photo: "/editorial/neelu.jpg",
    active: true,
  },
];

/**
 * Founders for the About page, in the admin's order.
 *
 * The placeholders stand in only when *nothing has ever been saved*. Once the admin owns the list,
 * their choices are respected: hiding every founder hides the section, rather than bringing
 * strangers' photos back onto the page as if they were the owners.
 *
 * Never throws — the About page showing placeholder founders beats it failing to render.
 */
export async function getFounders(): Promise<Founder[]> {
  try {
    // "catalog:" prefix on purpose — that is what storefrontChanged() clears on an admin save.
    const all = await cached("catalog:founders", 60_000, () => readCollection<Founder>("founders"));
    if (all.length === 0) return DEFAULT_FOUNDERS;
    return all.filter((f) => f.active !== false && f.name && f.photo);
  } catch (e) {
    console.error("[founders] unavailable:", e);
    return DEFAULT_FOUNDERS;
  }
}
