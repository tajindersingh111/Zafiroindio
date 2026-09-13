"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Instagram, Facebook, Twitter, Youtube } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      {/* ── Newsletter ──────────────────────────────────────── */}
      <section className="newsletter">
        <div className="container">
          <h2 className="serif">A Little More Beautiful in Your Inbox.</h2>
          <p>Get first access to new collections, special offers and bedroom inspiration.</p>
          <form onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Enter your email address" aria-label="Email address" />
            <button type="submit">Subscribe</button>
          </form>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="footer">
        <div className="container">
          <div className="footerGrid">
            {/* Brand */}
            <div>
              <div className="footerLogo">ZAFIRO</div>
              <p>Beautiful bedsheets for beautiful homes. Thoughtfully crafted for everyday comfort and timeless style.</p>
              <div className="footerSocial">
                <a href="#" aria-label="Instagram"><Instagram size={14} /></a>
                <a href="#" aria-label="Facebook"><Facebook size={14} /></a>
                <a href="#" aria-label="Twitter"><Twitter size={14} /></a>
                <a href="#" aria-label="Youtube"><Youtube size={14} /></a>
              </div>
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
              <Link href="/about">Track My Order</Link>
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
              <p>✉ hello@zafiro.in</p>
              <p>☎ +91 98765 43210</p>
              <p>Mon–Sat · 10AM–7PM IST</p>
              <p style={{ marginTop: 14 }}>Jaipur, Rajasthan, India</p>
            </div>
          </div>

          <div className="footerBottom">
            <span>© 2026 Zafiro. All rights reserved.</span>
            <span>
              <Link href="/about" style={{ color: "inherit" }}>Privacy Policy</Link>
              &nbsp; · &nbsp;
              <Link href="/about" style={{ color: "inherit" }}>Terms &amp; Conditions</Link>
              &nbsp; · &nbsp;
              <Link href="/about" style={{ color: "inherit" }}>Shipping Policy</Link>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}

export { Footer };
