import data from "./legacy-redirects.json";

/**
 * Where the old WordPress shop's pages live now. The table is built by scripts/build-legacy-redirects.mjs;
 * see there for why these exist. Looked up at request time rather than listed in next.config, because an
 * old slug can carry percent-encoded characters (a 112" mark is %e2%80%b3) that a path pattern
 * would mangle.
 */
const products = data.products as Record<string, string>;
const categories = data.categories as Record<string, string>;
export const legacyPages = data.pages as [string, string][];

const decode = (v: string) => {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};

/** The new path for an old /product/<slug>/ URL, or null if the old shop never had it. */
export function legacyProductTarget(slug: string): string | null {
  return products[decode(slug).toLowerCase()] ?? null;
}

/** The new path for an old /product-category/<a>/<b>/ URL, or null. A nested category falls back to its last segment. */
export function legacyCategoryTarget(segments: string[]): string | null {
  const full = segments.map((s) => decode(s).toLowerCase()).join("/");
  if (categories[full]) return categories[full];
  const last = full.split("/").pop() as string;
  const hit = Object.keys(categories).find((k) => k.split("/").pop() === last);
  return hit ? categories[hit] : null;
}
