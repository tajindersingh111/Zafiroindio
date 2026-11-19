/**
 * Turns the HTML a product description or a collection blurb is stored as into the plain sentence a
 * search result shows.
 *
 * Product copy came across from WordPress still wrapped in its page-builder markup, and an unescaped
 * `<h1 class="...">` ended up as the meta description of the live product pages, so a Google snippet was
 * a run of attribute names. A description for a search result has to be text: tags removed, entities
 * decoded, the literal "\n" sequences the import left behind turned into spaces, whitespace collapsed,
 * and cut on a word boundary rather than mid-word.
 */

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"',
  ndash: "-", mdash: "-", hellip: "...", times: "x", deg: "°", copy: "©", reg: "®", trade: "™",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED[name.toLowerCase()] ?? m);
}

/** Plain text of `html`, at most `max` characters, ending on a whole word. */
export function plainText(html: unknown, max = 155): string {
  let s = String(html ?? "");
  // The tags can themselves arrive entity-encoded (&lt;h1&gt;), so decode once, then strip, then decode again.
  s = decodeEntities(s);
  s = s.replace(/<(br|\/p|\/li|\/h[1-6]|\/div)\b[^>]*>/gi, " ");
  s = s.replace(/<[^>]*>/g, " ");
  s = decodeEntities(s);
  s = s.replace(/\\[rnt]/g, " "); // literal backslash-n sequences left by the import
  s = s.replace(/[ ​]/g, " ").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, "")}…`;
}
