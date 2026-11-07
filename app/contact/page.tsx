import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Mail, MapPin, MessageCircle, Phone, RotateCcw, Search, ShieldCheck, Truck } from "lucide-react";
import { POLICY_LINKS } from "@/components/site/PolicyPage";
import { getStoreContact, whatsappLink } from "@/lib/storefront/contact";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact Zafiro Indio: e-mail, phone, WhatsApp, support hours, business address and our grievance officer.",
  alternates: { canonical: "/contact" },
};

export const revalidate = 300;

export default async function ContactPage() {
  const c = await getStoreContact();
  const wa = whatsappLink(c, "Hi Zafiro Indio, I need help with…");
  const telHref = c.phone ? `tel:${c.phone.replace(/[^\d+]/g, "")}` : "";

  const channels = [
    { Icon: Mail, label: "E-mail", value: c.email, href: `mailto:${c.email}`, note: "We reply as soon as we can" },
    ...(c.phone ? [{ Icon: Phone, label: "Phone", value: c.phone, href: telHref, note: c.hours }] : []),
    ...(wa ? [{ Icon: MessageCircle, label: "WhatsApp", value: "Chat with us", href: wa, note: "Quickest for order questions" }] : []),
    { Icon: Clock, label: "Support hours", value: c.hours, href: "", note: "Indian Standard Time" },
  ];

  const help = [
    { Icon: Search, title: "Track an order", text: "See where your parcel is right now.", href: "/track" },
    { Icon: RotateCcw, title: "Return or exchange", text: "Start a request from My Orders.", href: "/return-policy" },
    { Icon: Truck, title: "Shipping & delivery", text: "Charges, timelines and tracking.", href: "/shipping-policy" },
    { Icon: ShieldCheck, title: "FAQs", text: "Quick answers to common questions.", href: "/faq" },
  ];

  return (
    <main className="pol">
      <header className="pol-hero">
        <div className="container">
          <nav className="pol-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> <span aria-hidden="true">/</span> <span>Contact Us</span>
          </nav>
          <p className="eyebrow">We are here to help</p>
          <h1 className="serif">Contact Us</h1>
          <div className="ornament">
            <i />
          </div>
          <div className="pol-intro">
            <p>Questions about an order, a product or a return? Write to us and a real person will answer.</p>
          </div>
        </div>
      </header>

      <div className="container pol-contact">
        <div className="pol-channels">
          {channels.map(({ Icon, label, value, href, note }) => {
            const inner = (
              <>
                <span className="pol-highlight-icon" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.6} />
                </span>
                <span className="pol-channel-label">{label}</span>
                <strong>{value}</strong>
                <span className="pol-channel-note">{note}</span>
              </>
            );
            return href ? (
              <a key={label} className="pol-channel" href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {inner}
              </a>
            ) : (
              <div key={label} className="pol-channel">
                {inner}
              </div>
            );
          })}
        </div>

        <div className="pol-contact-grid">
          <section className="pol-card">
            <h2 className="serif">
              <MapPin size={18} aria-hidden="true" /> Business details
            </h2>
            <dl className="pol-dl">
              <div>
                <dt>Business name</dt>
                <dd>{c.businessName}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{c.address}</dd>
              </div>
              {c.gstin && (
                <div>
                  <dt>GSTIN</dt>
                  <dd>{c.gstin}</dd>
                </div>
              )}
              <div>
                <dt>Website</dt>
                <dd>zafiroindio.com</dd>
              </div>
            </dl>
          </section>

          <section className="pol-card">
            <h2 className="serif">
              <ShieldCheck size={18} aria-hidden="true" /> Grievance officer
            </h2>
            <dl className="pol-dl">
              <div>
                <dt>Name</dt>
                <dd>{c.grievanceOfficer || "Customer Care"}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>
                  <a href={`mailto:${c.email}`}>{c.email}</a>
                </dd>
              </div>
              <div>
                <dt>Response</dt>
                <dd>We acknowledge every complaint within 48 hours and aim to resolve it within one month.</dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="pol-quick">
          <h2 className="serif">Looking for something specific?</h2>
          <div className="pol-quick-grid">
            {help.map(({ Icon, title, text, href }) => (
              <Link key={href} href={href} className="pol-quick-card">
                <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
                <strong>{title}</strong>
                <span>{text}</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            ))}
          </div>
          <p className="pol-quick-policies">
            {POLICY_LINKS.filter((l) => l.href !== "/contact").map((l, i, arr) => (
              <span key={l.href}>
                <Link href={l.href}>{l.label}</Link>
                {i < arr.length - 1 && <span aria-hidden="true"> · </span>}
              </span>
            ))}
          </p>
        </section>
      </div>
    </main>
  );
}
