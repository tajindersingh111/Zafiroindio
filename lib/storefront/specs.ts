/**
 * Product specifications for the product page's spec grid. An admin-entered `specs` list wins; otherwise
 * they are read out of the description text (imported from WooCommerce, so the wording varies by category).
 */
export type Spec = { key: SpecKey; label: string; value: string };
export type SpecKey = "fabric" | "weight" | "craft" | "size" | "includes" | "dye" | "care";

const LABELS: Record<SpecKey, string> = {
  fabric: "Fabric",
  weight: "Thread Count",
  craft: "Craft",
  size: "Size",
  includes: "In the Box",
  dye: "Dyes",
  care: "Care",
};

/** HTML description -> plain lines (the WordPress export left literal "\n" sequences in the text). */
export function descriptionLines(html: string): string[] {
  return (html || "")
    .replace(/\\[nr]/g, "\n")
    .replace(/\r/g, "")
    .replace(/<br\s*\/?>|<\/(li|p|h\d|div|ul)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;|&rsquo;/g, "'")
    .split("\n")
    // Leading bullets and emoji ("🌿 Fabric: …", "• Size: …").
    .map((l) => l.replace(/^[\s•*\-•\p{Extended_Pictographic}️‍]+/u, "").trim())
    .filter(Boolean);
}

/** "Fabric: 100% Pure Percale Cotton – soft, breathable…" -> the part before the sales copy. */
const head = (v: string) => v.split(/\s+[–—-]\s+|\.\s/)[0].replace(/\.$/, "").trim();

const SIZE_RE = /(\d+(?:\.\d+)?)\s*(?:"|”|in(?:ch(?:es)?)?\b|ft\b|feet\b)?\s*[x×*]\s*(\d+(?:\.\d+)?)\s*("|”|inch(?:es)?\b|in\b|ft\b|feet\b)/gi;

function sizes(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(SIZE_RE)) {
    const unit = /ft|feet/i.test(m[3]) ? "ft" : "in";
    const s = `${m[1]} × ${m[2]} ${unit}`;
    if (!out.includes(s)) out.push(s);
  }
  return out;
}

const title = (s: string) => s.replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\bTnt\b/, "TNT");

export function deriveSpecs(description: string, shortDescription = ""): Spec[] {
  const lines = [...descriptionLines(description), ...descriptionLines(shortDescription)];
  const text = lines.join("\n");
  const labelled = new Map<string, string>();
  for (const l of lines) {
    const m = l.match(/^([A-Za-z][A-Za-z ()&/]{1,28}?)\s*:\s*(.+)$/);
    if (m && !labelled.has(m[1].toLowerCase())) labelled.set(m[1].toLowerCase(), m[2].trim());
  }
  const pick = (...keys: string[]) => keys.map((k) => labelled.get(k)).find(Boolean);
  const specs: Partial<Record<SpecKey, string>> = {};

  // Fabric
  const fabric = pick("fabric", "material");
  if (fabric) specs.fabric = head(fabric);
  else {
    const m = text.match(/(100%\s*)?(pure\s+|premium\s+)?(percale cotton|mal cotton|canvas cotton|tnt jute|jute|cotton)\b/i);
    if (m) specs.fabric = title(`${m[1] ? "100% " : ""}${m[3].toLowerCase()}`);
  }

  // Thread count for sheets, filling weight for quilts.
  const tc = text.match(/\b(\d{3})\s*TC\b/i);
  const gsm = text.match(/\b(\d{2,4})\s*GSM\b/i);
  if (tc) specs.weight = `${tc[1]} TC`;
  else if (gsm) specs.weight = `${gsm[1]} GSM filling`;

  // Craft
  const craft = pick("print", "craft");
  if (/hand\s*-?\s*block/i.test(craft || text)) specs.craft = "Hand-block print";
  else if (/digital print/i.test(text)) specs.craft = "Digital print";
  else if (craft) specs.craft = head(craft);

  // Size: the explicit "Size:" line when there is one, else the sizes in the text (pillow covers excluded).
  const runner = sizes(pick("table runner size") || "")[0];
  const mat = sizes(pick("placemat size") || "")[0];
  const sizeLine = sizes(pick("size") || "");
  const found = sizeLine.length ? sizeLine : sizes(lines.filter((l) => !/pillow|placemat/i.test(l)).join("\n"));
  if (runner && mat) specs.size = `Runner ${runner} · Mats ${mat}`;
  else if (found.length) specs.size = found.slice(0, 3).join(", ");

  // What's in the box
  const includes = pick("set includes", "includes");
  const pillows = text.match(/\b(\d)\s*(?:matching\s+|lace[- ]detail\s+)?pillow\s*covers?/i) || pick("pillow covers")?.match(/(\d)/);
  const piece = /\bbed\s*covers?\b|\bquilt/i.test(text) ? "Bedcover" : "Bedsheet";
  if (pillows) specs.includes = `1 ${piece} + ${pillows[1]} pillow covers`;
  else if (includes) specs.includes = head(includes).replace(/\s+/g, " ");

  if (/azo[\s-]*free/i.test(text)) specs.dye = "Azo-free";
  const care = pick("care");
  if (care) specs.care = head(care);

  return (Object.keys(LABELS) as SpecKey[])
    .filter((k) => specs[k])
    .map((k) => ({ key: k, label: k === "weight" && specs.weight?.includes("GSM") ? "Filling" : LABELS[k], value: specs[k]! }));
}

/** Admin-entered specs ({label, value}[]) win over the derived ones. */
export function productSpecs(p: { specs?: unknown; description?: string; shortDescription?: string }): Spec[] {
  if (Array.isArray(p.specs)) {
    const own = p.specs
      .filter((s: any) => s && typeof s.label === "string" && typeof s.value === "string" && s.value.trim())
      .map((s: any) => ({ key: (s.key as SpecKey) || "fabric", label: s.label.trim(), value: s.value.trim() }));
    if (own.length) return own;
  }
  return deriveSpecs(p.description || "", p.shortDescription || "");
}
