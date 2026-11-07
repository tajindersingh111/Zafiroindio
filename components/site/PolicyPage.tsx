import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Mail, MessageCircle, Phone } from "lucide-react";
import { getStoreContact, whatsappLink } from "@/lib/storefront/contact";

export type PolicySection = { id: string; title: string; body: ReactNode };
export type PolicyHighlight = { icon: ReactNode; title: string; text: string };

/** Every policy page, in the order they appear in the footer and in "Other policies". */
export const POLICY_LINKS = [
  { href: "/return-policy", label: "Return, Exchange & Refund" },
  { href: "/shipping-policy", label: "Shipping & Delivery" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/faq", label: "FAQs" },
  { href: "/contact", label: "Contact Us" },
] as const;

/**
 * One layout for every policy page, so they read as a single, professional set: a header with the
 * last-updated date, a table of contents that stays in view, numbered sections, and a contact card
 * at the end. The contact details come from Admin → Settings, never from the page text.
 */
export default async function PolicyPage({
  current,
  eyebrow,
  title,
  intro,
  updated,
  highlights,
  sections,
}: {
  /** Path of this page, so it is left out of "Other policies". */
  current: string;
  eyebrow: string;
  title: string;
  intro: ReactNode;
  /** Plain-language date, e.g. "7 November 2026". */
  updated: string;
  highlights?: PolicyHighlight[];
  sections: PolicySection[];
}) {
  const contact = await getStoreContact();
  const wa = whatsappLink(contact, "Hi, I have a question.");
  const others = POLICY_LINKS.filter((l) => l.href !== current);

  const toc = (
    <ol>
      {sections.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            {s.title}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <main className="pol">
      <header className="pol-hero">
        <div className="container">
          <nav className="pol-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> <span aria-hidden="true">/</span> <span>{title}</span>
          </nav>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="serif">{title}</h1>
          <div className="ornament">
            <i />
          </div>
          <div className="pol-intro">{intro}</div>
          <p className="pol-meta">
            <span>Last updated {updated}</span>
            <span aria-hidden="true">•</span>
            <span>{contact.businessName}</span>
          </p>
        </div>
      </header>

      {highlights && highlights.length > 0 && (
        <div className="container pol-highlights">
          {highlights.map((h) => (
            <div key={h.title} className="pol-highlight">
              <span className="pol-highlight-icon" aria-hidden="true">
                {h.icon}
              </span>
              <h2>{h.title}</h2>
              <p>{h.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="container pol-layout">
        <aside className="pol-toc" aria-label="On this page">
          <p className="pol-toc-title">On this page</p>
          <nav>{toc}</nav>
          <p className="pol-toc-title pol-toc-other-title">Other policies</p>
          <ul className="pol-toc-other">
            {others.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="pol-content">
          <details className="pol-toc-mobile">
            <summary>On this page</summary>
            <nav>{toc}</nav>
          </details>

          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="pol-section">
              <h2>
                <span className="pol-num">{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </h2>
              <div className="pol-body">{s.body}</div>
            </section>
          ))}

          <div className="pol-help">
            <div>
              <h2 className="serif">Still have a question?</h2>
              <p>Write to us and a real person will reply. We are available {contact.hours}.</p>
            </div>
            <div className="pol-help-actions">
              <a className="btn dark" href={`mailto:${contact.email}`}>
                <Mail size={14} /> {contact.email}
              </a>
              {contact.phone && (
                <a className="btn outline" href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>
                  <Phone size={14} /> {contact.phone}
                </a>
              )}
              {wa && (
                <a className="btn outline" href={wa} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={14} /> WhatsApp
                </a>
              )}
              <Link className="pol-help-more" href="/contact">
                All contact details <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
