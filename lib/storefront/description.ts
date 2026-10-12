/**
 * Splits an imported (WooCommerce) product description into parts the product page can lay out:
 * a title, the opening paragraphs, groups of bullet highlights (each under its own sub-heading,
 * e.g. "Key Features", "Care Instructions") and any closing text.
 */
export type Highlight = { label?: string; text: string };
export type HighlightGroup = { heading?: string; items: Highlight[] };
export type StoryBlock = { kind: "heading" | "text"; text: string };
export type StoryParts = { title?: string; intro: string[]; groups: HighlightGroup[]; closing: StoryBlock[] };

/** Headings that only say "here is the description" and add nothing on the page. */
const NOISE_HEADING = /^(product description|description)$/i;
/** Headings that introduce a list; they never become the story's title. */
const LIST_HEADING = /^(key features|features|product (details|highlights|features)|highlights|available sizes|package includes|what'?s included|care( instructions)?|specifications)$/i;

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;|&rsquo;|&#0?39;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;|&quot;/g, '"')
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&times;/g, "×");
}

/** Leading bullets and emoji ("🌿 Fabric: …", "• Size: …"). */
const stripLead = (s: string) => s.replace(/^[\s•*\-•\p{Extended_Pictographic}️‍]+/u, "").trim();

function toHighlight(line: string): Highlight {
  const colon = line.match(/^([^:]{2,32}):\s*(.+)$/);
  if (colon) return { label: colon[1].trim(), text: colon[2].trim() };
  const dash = line.match(/^(.{3,48}?)\s+[–—-]\s+(.+)$/);
  if (dash) return { label: dash[1].trim(), text: dash[2].trim() };
  return { text: line };
}

export function parseDescription(html: string): StoryParts {
  const text = decode(
    (html || "")
      .replace(/\\[nr]/g, "\n")
      .replace(/\r/g, "")
      .replace(/<h\d[^>]*>([\s\S]*?)<\/h\d>/gi, "\n## $1\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<br\s*\/?>|<\/(li|p|div|ul|ol)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  );

  const parts: StoryParts = { intro: [], groups: [], closing: [] };
  const lastGroup = () => parts.groups[parts.groups.length - 1];
  const addHeading = (h: string) => {
    if (NOISE_HEADING.test(h)) return;
    if (!parts.title && !parts.intro.length && !parts.groups.length && !LIST_HEADING.test(h)) {
      parts.title = h;
      return;
    }
    // A heading opens the next group of bullets; if a paragraph follows instead, it moves to `closing`.
    const g = lastGroup();
    if (g && !g.items.length) g.heading = h;
    else parts.groups.push({ heading: h, items: [] });
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("## ")) {
      const h = stripLead(line.slice(3)).replace(/:$/, "");
      if (h) addHeading(h);
      continue;
    }
    const isBullet = /^[•*\-•]/.test(line) || /^\p{Extended_Pictographic}/u.test(line);
    const clean = stripLead(line);
    if (!clean) continue;
    if (isBullet) {
      if (!lastGroup()) parts.groups.push({ items: [] });
      lastGroup().items.push(toHighlight(clean));
      continue;
    }
    // Short lines with no full stop read as headings ("Hand Block Printed Rugs", "Key Features:").
    if (clean.length <= 70 && !/[.!]$/.test(clean) && !/\|/.test(clean)) {
      addHeading(clean.replace(/:$/, ""));
      continue;
    }
    if (!parts.groups.length) {
      parts.intro.push(clean);
      continue;
    }
    const g = lastGroup();
    if (g && !g.items.length) {
      parts.groups.pop();
      if (g.heading) parts.closing.push({ kind: "heading", text: g.heading });
    }
    parts.closing.push({ kind: "text", text: clean });
  }
  // A trailing heading with nothing under it is dropped.
  parts.groups = parts.groups.filter((g) => g.items.length);
  return parts;
}

/** The long description, with the short description's paragraphs as the opening when it has none. */
export function productStory(description = "", shortDescription = ""): StoryParts {
  const story = parseDescription(description || shortDescription);
  if (!story.intro.length && description && shortDescription) {
    const short = parseDescription(shortDescription);
    story.intro = short.title && !short.intro.length ? [] : short.intro;
  }
  return story;
}
