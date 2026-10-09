"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Instagram, Facebook, Twitter, Youtube, CheckCircle2 } from "lucide-react";

/** Contact details and social profiles shown in the footer. Empty entries are not rendered. */
const CONTACT = { email: "hello@zafiroindio.com", phone: "", hours: "Mon–Sat · 10AM–7PM IST" };
const SOCIAL = [
  { label: "Instagram", href: "", Icon: Instagram },
  { label: "Facebook", href: "", Icon: Facebook },
  { label: "Twitter", href: "", Icon: Twitter },
  { label: "Youtube", href: "", Icon: Youtube },
].filter((x) => x.href);

export default function Footer() {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (pathname?.startsWith("/admin")) return null;

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
          <h2 className="serif">A Little More Beautiful in Your Inbox.</h2>
          <p>Get first access to new collections, special offers and bedroom inspiration.</p>
          
          {message ? (
            <div className={`p-4 rounded-sm max-w-md mx-auto text-sm font-medium flex items-center justify-center gap-2 ${
              message.type === "success" ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40" : "bg-red-950/80 text-red-300 border border-red-500/40"
            }`}>
              <CheckCircle2 size={16} /> {message.text}
            </div>
          ) : (
            <form onSubmit={handleSubscribe}>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address" 
                aria-label="Email address" 
              />
              <button type="submit" disabled={loading}>
                {loading ? "Subscribing..." : "Subscribe"}
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
            <div>
              <Link href="/" style={{ display: "inline-block", marginBottom: 14 }}>
                <img
                  src="/zafiro-logo-dark.png"
                  alt="Zafiro Indio"
                  style={{ height: 44, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)" }}
                />
              </Link>
              <p>Beautiful bedsheets for beautiful homes. Thoughtfully crafted for everyday comfort and timeless style.</p>
              {SOCIAL.length > 0 && (
                <div className="footerSocial">
                  {SOCIAL.map(({ label, href, Icon }) => (
                    <a key={label} href={href} aria-label={label} target="_blank" rel="noopener noreferrer"><Icon size={14} /></a>
                  ))}
                </div>
              )}
            </div>

            {/* Shop */}
            <div>
              <h4>Shop</h4>
              <Link href="/shop">All Bedsheets</Link>
              <Link href="/shop?badge=bestseller">Bestsellers</Link>
              <Link href="/shop?badge=new">New Arrivals</Link>
              <Link href="/collections">Collections</Link>
              <Link href="/shop">Sale</Link>
            </div>

            {/* Customer Care */}
            <div>
              <h4>Customer Care</h4>
              <Link href="/about">FAQs</Link>
              <Link href="/about">Shipping &amp; Delivery</Link>
              <Link href="/about">Returns &amp; Exchanges</Link>
              <Link href="/about">Size Guide</Link>
              <Link href="/track">Track My Order</Link>
            </div>

            {/* About */}
            <div>
              <h4>About Us</h4>
              <Link href="/about">Our Story</Link>
              <Link href="/about">Our Values</Link>
              <Link href="/about">Sustainability</Link>
              <Link href="/about">Contact Us</Link>
            </div>

            {/* Contact */}
            <div>
              <h4>Contact Us</h4>
              <p><a href={`mailto:${CONTACT.email}`}>✉ {CONTACT.email}</a></p>
              {CONTACT.phone && <p><a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}>☎ {CONTACT.phone}</a></p>}
              <p>{CONTACT.hours}</p>
              <p style={{ marginTop: 14 }}>Jaipur, Rajasthan, India</p>
            </div>
          </div>

          <div className="footerBottom">
            <span>© {new Date().getFullYear()} Zafiro Indio. All rights reserved.</span>
            <div className="footerLegalLinks">
              <Link href="/about">Privacy Policy</Link>
              <span className="dot">•</span>
              <Link href="/about">Terms &amp; Conditions</Link>
              <span className="dot">•</span>
              <Link href="/about">Shipping Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export { Footer };
