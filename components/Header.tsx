"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, UserRound, Heart, ShoppingBag, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useStore } from "./StoreProvider";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cartCount, wishlist } = useStore();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close drawer when navigating
  useEffect(() => { setOpen(false); }, [pathname]);

  if (pathname?.startsWith("/admin")) return null;

  const navLinks = [
    { href: "/shop", label: "SHOP" },
    { href: "/collections", label: "COLLECTIONS" },
    { href: "/shop?badge=new", label: "NEW ARRIVALS" },
    { href: "/shop?badge=bestseller", label: "BESTSELLERS" },
    { href: "/about", label: "ABOUT US" },
  ];

  return (
    <>
      {/* ── Announcement Bar ─────────────────────────────────── */}
      <div className="announcement">
        <span>🚚 FREE SHIPPING on orders above ₹999</span>
        <span>🎁 10% OFF on your first order &nbsp;|&nbsp; Use code: WELCOME10</span>
        <span>↻ Easy Returns within 7 days</span>
      </div>

      {/* ── Main Header ──────────────────────────────────────── */}
      <header className={`header${scrolled ? " scrolled" : ""}`}>
        <div className="container nav">
          {/* Mobile hamburger */}
          <button
            className="iconbtn mobileMenu"
            onClick={() => setOpen(!open)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          {/* Logo */}
          <Link href="/" className="logo">ZAFIRO</Link>

          {/* Desktop nav */}
          <nav className="menu">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  pathname === l.href ||
                  (l.href === "/shop" && pathname?.startsWith("/shop")) ||
                  (l.href === "/collections" && pathname?.startsWith("/collections"))
                    ? "active"
                    : ""
                }
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Action icons */}
          <div className="actions">
            <Link className="iconbtn" href="/search" aria-label="Search">
              <Search size={20} />
            </Link>
            <Link className="iconbtn" href="/account" aria-label="Account">
              <UserRound size={20} />
            </Link>
            <Link className="iconbtn" href="/wishlist" aria-label="Wishlist" style={{ position: "relative" }}>
              <Heart size={20} />
              {wishlist.length > 0 && (
                <span className="badge">{wishlist.length}</span>
              )}
            </Link>
            <Link className="iconbtn" href="/cart" aria-label="Cart" style={{ position: "relative" }}>
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="badge">{cartCount}</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ─────────────────────────────────────── */}
      <div
        className={`mobileDrawer${open ? " open" : ""}`}
        onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      >
        <div className="mobileDrawerInner">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <span className="logo" style={{ fontSize: 22, letterSpacing: 5 }}>ZAFIRO</span>
            <button className="iconbtn" onClick={() => setOpen(false)} aria-label="Close menu">
              <X size={22} />
            </button>
          </div>
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)", display: "flex", gap: 14 }}>
            <Link href="/account" style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6, border: "none", padding: 0, textTransform: "none", letterSpacing: 0 }}>
              <UserRound size={16} /> Account
            </Link>
            <Link href="/wishlist" style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6, border: "none", padding: 0, textTransform: "none", letterSpacing: 0 }}>
              <Heart size={16} /> Wishlist {wishlist.length > 0 && `(${wishlist.length})`}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export { Header };
