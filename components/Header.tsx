"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, UserRound, Heart, ShoppingBag, Menu, X, Truck, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cartCount, wishlist } = useStore();
  const { customer } = useAuth();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close drawer when navigating
  useEffect(() => { setOpen(false); }, [pathname]);

  if (pathname?.startsWith("/admin")) return null;

  // "BULK ORDERS" is an ordinary navigation link to the Bulk Orders page (which carries the enquiry
  // form), so the whole item is clickable and shares the typography of every other link. Its only
  // distinction is a small gold diamond before the label.
  const navLinks = [
    { href: "/shop", label: "SHOP" },
    { href: "/collections", label: "COLLECTIONS" },
    { href: "/shop?badge=new", label: "NEW ARRIVALS" },
    { href: "/shop?badge=bestseller", label: "BESTSELLERS" },
    { href: "/bulk-order", label: "BULK ORDERS", accent: true },
    { href: "/about", label: "ABOUT US" },
  ];

  const isActive = (href: string) =>
    pathname === href ||
    (href === "/shop" && pathname?.startsWith("/shop")) ||
    (href === "/collections" && pathname?.startsWith("/collections")) ||
    (href === "/bulk-order" && pathname?.startsWith("/bulk-order"));

  return (
    <>
      {/* ── Main Header ──────────────────────────────────────── */}
      <header className={`header${scrolled ? " scrolled" : ""}`}>
        <div className="container nav">
          {/* Mobile hamburger */}
          <button
            className="iconbtn mobileMenu"
            onClick={() => setOpen(!open)}
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu size={20} />
          </button>

          {/* Logo */}
          <Link href="/" className="logo" aria-label="Zafiro Indio — home">
            <img src="/zafiro-logo-dark.png" alt="Zafiro Indio" />
          </Link>

          {/* Desktop nav */}
          <nav className="menu" aria-label="Main">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`${l.accent ? "menu-accent" : ""}${isActive(l.href) ? " active" : ""}`.trim()}
                aria-current={isActive(l.href) ? "page" : undefined}
              >
                {l.accent && <i className="menu-diamond" aria-hidden="true" />}
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Action icons — one shared .iconbtn box keeps every icon on the same baseline */}
          <div className="actions">
            <Link className="iconbtn" href="/search" aria-label="Search">
              <Search size={20} />
            </Link>
            <Link
              className="iconbtn desktopOnly"
              href={customer ? "/account/orders" : "/login"}
              aria-label={customer ? `Account — signed in as ${customer.name}` : "Sign in"}
              title={customer ? customer.name : "Sign in"}
            >
              <UserRound size={20} />
              {customer && <span className="iconDot" aria-hidden="true" />}
            </Link>
            <Link className="iconbtn" href="/wishlist" aria-label={`Wishlist${wishlist.length > 0 ? ` (${wishlist.length} items)` : ""}`}>
              <Heart size={20} />
              {wishlist.length > 0 && <span className="badge">{wishlist.length}</span>}
            </Link>
            <Link className="iconbtn" href="/cart" aria-label={`Cart${cartCount > 0 ? ` (${cartCount} items)` : ""}`}>
              <ShoppingBag size={20} />
              {cartCount > 0 && <span className="badge">{cartCount}</span>}
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
          <div className="mobileDrawerTop">
            <Link href="/" className="logo" aria-label="Zafiro Indio — home">
              <img src="/zafiro-logo-dark.png" alt="Zafiro Indio" />
            </Link>
            <button className="iconbtn" onClick={() => setOpen(false)} aria-label="Close menu">
              <X size={20} />
            </button>
          </div>
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className={l.accent ? "menu-accent" : undefined}>
              {l.accent && <i className="menu-diamond" aria-hidden="true" />}
              {l.label}
            </Link>
          ))}
          <div className="mobileDrawerUtil">
            {[
              customer
                ? { href: "/account/orders", label: "My orders", Icon: UserRound }
                : { href: "/login", label: "Sign in", Icon: UserRound },
              { href: "/wishlist", label: `Wishlist${wishlist.length > 0 ? ` (${wishlist.length})` : ""}`, Icon: Heart },
              { href: "/track", label: "Track order", Icon: Truck },
              { href: "/account", label: "Cancel or return", Icon: RotateCcw },
            ].map(({ href, label, Icon }) => (
              <Link key={href} href={href}>
                <Icon size={16} /> {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export { Header };
