"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Instagram, Facebook, Youtube, CheckCircle2, Mail, MapPin, Phone, MessageCircle, Clock, ShieldCheck } from "lucide-react";
import { useStoreContact, waLink } from "@/components/useStoreContact";

/** Where each footer column leads. Every entry is a real page. */
const SHOP_LINKS = [
  { href: "/shop", label: "All Bedsheets" },
  { href: "/shop?badge=bestseller", label: "Bestsellers" },
  { href: "/shop?badge=new", label: "New Arrivals" },
  { href: "/collections", label: "Collections" },
  { href: "/shop?badge=sale", label: "Sale" },
];

const CARE_LINKS = [
  { href: "/account", label: "My Orders" },
  { href: "/track", label: "Track My Order" },
  // The lookup on /account is where an order is actually cancelled or returned; the policy page
  // only explains the rules, so both need their own line here.
  { href: "/account", label: "Cancel or Return an Order" },
  { href: "/return-policy", label: "Returns & Exchanges" },
  { href: "/shipping-policy", label: "Shipping & Delivery" },
  { href: "/faq", label: "FAQs" },
  { href: "/bulk-order", label: "Bulk Orders" },
];

const COMPANY_LINKS = [
  { href: "/about#story", label: "Our Story" },
  { href: "/about#values", label: "Our Values" },
  { href: "/contact", label: "Contact Us" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
];

const PAYMENT_METHODS = ["UPI", "Cards", "Net Banking", "Wallets", "Cash on Delivery"];

export default function Footer() {
  const pathname = usePathname();
  const contact = useStoreContact();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (pathname?.startsWith("/admin")) return null;

  // Shown until the real settings load, so the footer is never empty or jumpy.
  const supportEmail = contact?.email || "info@zafiroindio.com";
  const hours = contact?.hours || "Mon–Sat · 10AM–7PM IST";
  const address = contact?.address || "Jaipur, Rajasthan, India";
  const wa = waLink(contact, "Hi Zafiro Indio, I need some help.");
  const social = [
    { label: "Instagram", href: contact?.social.instagram, Icon: Instagram },
    { label: "Facebook", href: contact?.social.facebook, Icon: Facebook },
    { label: "YouTube", href: contact?.social.youtube, Icon: Youtube },
  ].filter((x): x is { label: string; href: string; Icon: typeof Instagram } => !!x.href);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: data.message });
        setEmail("");
      } else {
        setMessage({ type: "error", text: data.error || "Subscription failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Unable to subscribe right now. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Newsletter ──────────────────────────────────────── */}
      <section className="newsletter">
        <div className="container">
          <p className="eyebrow">Stay in touch</p>
          <h2 className="serif">A Little More Beautiful in Your Inbox.</h2>
          <p className="newsletter-sub">First access to new collections, special offers and bedroom inspiration. No spam, unsubscribe any time.</p>

          {message ? (
            <div
              role="status"
              className={`newsletter-msg ${message.type === "success" ? "is-success" : "is-error"}`}
            >
              <CheckCircle2 size={16} /> {message.text}
            </div>
          ) : (
            <form onSubmit={handleSubscribe}>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" aria-label="Email address" autoComplete="email" />
              <button type="submit" disabled={loading}>
                {loading ? "Subscribing…" : "Subscribe"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="footer">
        <div className="container">
          <div className="footerGrid">
            {/* Brand */}
            <div className="footerBrand">
              <Link href="/" style={{ display: "inline-block", marginBottom: 16 }} aria-label="Zafiro Indio home">
                <img src="/zafiro-logo-dark.png" alt="Zafiro Indio" style={{ height: 46, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
              </Link>
              <p>Hand block printed bedding and home textiles, designed and made with care in Jaipur.</p>
              {social.length > 0 && (
                <div className="footerSocial">
                  {social.map(({ label, href, Icon }) => (
                    <a key={label} href={href} aria-label={label} target="_blank" rel="noopener noreferrer">
                      <Icon size={15} />
                    </a>
                  ))}
                </div>
              )}
              <div className="footerPay" aria-label="Payment methods">
                {PAYMENT_METHODS.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
              <p className="footerSecure">
                <ShieldCheck size={13} aria-hidden="true" /> Secure payments by Razorpay
              </p>
            </div>

            <nav aria-label="Shop">
              <h4>Shop</h4>
              {SHOP_LINKS.map((l) => (
                <Link key={l.label} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </nav>

            <nav aria-label="Customer care">
              <h4>Customer Care</h4>
              {CARE_LINKS.map((l) => (
                <Link key={l.label} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </nav>

            <nav aria-label="Company">
              <h4>Company</h4>
              {COMPANY_LINKS.map((l) => (
                <Link key={l.label} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </nav>

            <div>
              <h4>Get in touch</h4>
              <a href={`mailto:${supportEmail}`} className="footerContact">
                <Mail size={14} aria-hidden="true" /> {supportEmail}
              </a>
              {contact?.phone && (
                <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="footerContact">
                  <Phone size={14} aria-hidden="true" /> {contact.phone}
                </a>
              )}
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="footerContact">
                  <MessageCircle size={14} aria-hidden="true" /> WhatsApp us
                </a>
              )}
              <p className="footerContact">
                <Clock size={14} aria-hidden="true" /> {hours}
              </p>
              <p className="footerContact">
                <MapPin size={14} aria-hidden="true" /> {address}
              </p>
            </div>
          </div>

          <div className="footerBottom">
            <span>© {new Date().getFullYear()} {contact?.businessName || "Zafiro Indio"}. All rights reserved.</span>
            <div className="footerLegalLinks">
              <Link href="/privacy-policy">Privacy Policy</Link>
              <span className="dot">•</span>
              <Link href="/terms">Terms &amp; Conditions</Link>
              <span className="dot">•</span>
              <Link href="/shipping-policy">Shipping Policy</Link>
              <span className="dot">•</span>
              <Link href="/return-policy">Return &amp; Refund Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export { Footer };
