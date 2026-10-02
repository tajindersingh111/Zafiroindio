"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, UserRound, Heart, ShoppingBag, Menu, X, PackageCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { useStore } from "./StoreProvider";
import BulkOrderModal from "./BulkOrderModal";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<string[]>([
    "🚚 FREE SHIPPING on orders above ₹999",
    "🎁 10% OFF on your first order | Use code: WELCOME10",
    "↻ Easy Returns within 7 days"
  ]);
  const { cartCount, wishlist } = useStore();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Fetch live announcements from admin banners API
  useEffect(() => {
    fetch("/api/banners")
      .then((res) => res.json())
      .then((data) => {
        if (data.banners && Array.isArray(data.banners)) {
          const annList = data.banners
            .filter((b: any) => b.type === "announcement" && b.isActive !== false)
            .map((b: any) => b.heading || b.subheading)
            .filter(Boolean);
          if (annList.length > 0) {
            setAnnouncements(annList);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Close drawer when navigating
  useEffect(() => { setOpen(false); }, [pathname]);

  if (pathname?.startsWith("/admin")) return null;

  const navLinks = [
    { href: "/shop", label: "SHOP" },
    { href: "/collections", label: "COLLECTIONS" },
    { href: "/shop?badge=new", label: "NEW ARRIVALS" },
    { href: "/shop?badge=bestseller", label: "BESTSELLERS" },
    { href: "/bulk-order", label: "BULK ORDERS", isBulk: true },
    { href: "/about", label: "ABOUT US" },
  ];

  return (
    <>
      {/* ── Dynamic Announcement Bar ─────────────────────────── */}
      <div className="announcement">
        {announcements.slice(0, 3).map((text, idx) => (
          <span key={idx}>{text}</span>
        ))}
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
          <Link href="/" className="logo" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/zafiro-logo-dark.png" alt="Zafiro Indio" style={{ height: 42, width: "auto", objectFit: "contain" }} />
          </Link>

          {/* Desktop nav */}
          <nav className="menu">
            {navLinks.map((l) => (
              l.isBulk ? (
                <button
                  key={l.label}
                  type="button"
                  onClick={() => setBulkModalOpen(true)}
                  className="bulk-nav-link"
                  style={{
                    background: "none",
                    border: "none",
                    font: "inherit",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    color: "#a67c37",
                    fontWeight: 700,
                    fontSize: "12px",
                    letterSpacing: "1px"
                  }}
                >
                  <PackageCheck size={16} /> BULK ORDERS
                </button>
              ) : (
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
              )
            ))}
          </nav>

          {/* Action icons */}
          <div className="actions">
            {/* Bulk Order Icon Button */}
            <button
              type="button"
              onClick={() => setBulkModalOpen(true)}
              className="iconbtn"
              title="Bulk Order Inquiry"
              aria-label="Bulk Order Inquiry"
              style={{
                color: "#a67c37",
                background: "rgba(166, 124, 55, 0.08)",
                borderRadius: "50%",
                padding: "6px"
              }}
            >
              <PackageCheck size={20} />
            </button>

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
            <Link href="/" style={{ display: "flex", alignItems: "center" }}>
              <img src="/zafiro-logo-dark.png" alt="Zafiro Indio" style={{ height: 36, width: "auto", objectFit: "contain" }} />
            </Link>
            <button className="iconbtn" onClick={() => setOpen(false)} aria-label="Close menu">
              <X size={22} />
            </button>
          </div>
          {navLinks.map((l) => (
            l.isBulk ? (
              <button
                key={l.label}
                onClick={() => {
                  setOpen(false);
                  setBulkModalOpen(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#a67c37",
                  padding: "12px 0",
                  cursor: "pointer"
                }}
              >
                <PackageCheck size={18} /> BULK ORDERS &amp; WHOLESALE
              </button>
            ) : (
              <Link key={l.href} href={l.href}>{l.label}</Link>
            )
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

      {/* ── Bulk Order Modal ──────────────────────────────────── */}
      <BulkOrderModal isOpen={bulkModalOpen} onClose={() => setBulkModalOpen(false)} />
    </>
  );
}

export { Header };

