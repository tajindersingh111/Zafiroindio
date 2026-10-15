import Link from "next/link";
import { Fragment } from "react";

/**
 * Plain text with working links: `[[label|url]]` markers (kept from <a> tags by the description
 * parser), bare http(s):// and www. URLs, e-mail addresses and Indian phone numbers.
 */
const TOKEN = /\[\[([^|\]]+)\|([^\]]+)\]\]|((?:https?:\/\/|www\.)[^\s<>"')\]]+[^\s<>"')\].,;:!?])|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)|(?<![\d+])((?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5})(?!\d)/gi;

const SITE_HOST = /^(?:https?:\/\/)?(?:www\.)?zafiroindio\.com(?=\/|$)/i;

function anchor(href: string, label: string, key: number) {
  // Links back to this store open in place; everything else opens in a new tab.
  const internal = href.startsWith("/") || SITE_HOST.test(href);
  if (internal) {
    // Old WooCommerce product URLs (/product/<slug>) live at /products/<slug> here.
    const path = (href.replace(SITE_HOST, "") || "/").replace(/^\/product\//, "/products/");
    return <Link key={key} href={path} className="rich-link">{label}</Link>;
  }
  return <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="rich-link">{label}</a>;
}

function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (/^(mailto|tel):/i.test(href)) return href;
  if (/^www\./i.test(href)) return `https://${href}`;
  return /^https?:\/\//i.test(href) ? href : null;
}

export default function RichText({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(<Fragment key={k++}>{text.slice(last, at)}</Fragment>);
    const [whole, label, markHref, url, email, phone] = m;
    const href = markHref ? safeHref(markHref) : url ? safeHref(url) : email ? `mailto:${email}` : `tel:+91${phone.replace(/\D/g, "").slice(-10)}`;
    out.push(href ? anchor(href, label || whole, k++) : <Fragment key={k++}>{label || whole}</Fragment>);
    last = at + whole.length;
  }
  if (last < text.length) out.push(<Fragment key={k++}>{text.slice(last)}</Fragment>);
  return <>{out}</>;
}
