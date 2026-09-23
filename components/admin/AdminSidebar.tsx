"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  section: string;
  children?: { label: string; href: string }[];
}

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["overview", "orders", "inventory", "customers", "analytics", "marketing", "b2b", "users", "settings"],
  "Super Admin": ["overview", "orders", "inventory", "customers", "analytics", "marketing", "b2b", "users", "settings"],
  order_manager: ["overview", "orders", "customers"],
  inventory_manager: ["overview", "inventory"],
  marketing: ["overview", "marketing", "analytics"],
  b2b_sales: ["overview", "b2b", "customers"],
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" style={{ width: "14px", height: "14px", flexShrink: 0 }} className={`transition-transform ${open ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
    </svg>
  );
}

const NAV: NavItem[] = [
  {
    label: "Dashboard", href: "/admin", section: "overview",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  },
  {
    label: "Zafiro Insights", href: "/admin/intelligence", section: "analytics",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  },
  {
    label: "Orders", href: "/admin/orders", section: "orders",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 022 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>,
  },
  {
    label: "Products", section: "inventory",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>,
    children: [
      { label: "All Products", href: "/admin/products" },
      { label: "Add Product", href: "/admin/products/new" },
      { label: "Categories", href: "/admin/products/categories" },
      { label: "Brands", href: "/admin/products/brands" },
      { label: "Attributes", href: "/admin/products/attributes" },
      { label: "Inventory", href: "/admin/products/inventory" },
      { label: "Smart Inventory", href: "/admin/products/smart-inventory" },
      { label: "Stock History", href: "/admin/products/stock-history" },
    ],
  },
  {
    label: "Customers", section: "customers",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
    children: [
      { label: "All Customers", href: "/admin/customers" },
      { label: "Customer Segments", href: "/admin/customers/segments" },
    ]
  },
  {
    label: "Abandoned Carts", href: "/admin/abandoned-carts", section: "orders",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  },
  {
    label: "Profitability Analytics", href: "/admin/analytics/profitability", section: "analytics",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 12v-2m0 0c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  },
  {
    label: "Expense Management", href: "/admin/expenses", section: "analytics",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  },
  {
    label: "Advanced Analytics", href: "/admin/analytics/advanced", section: "analytics",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>,
  },
  {
    label: "Marketing Center", section: "marketing",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>,
    children: [
      { label: "Coupons", href: "/admin/coupons" },
      { label: "Campaigns", href: "/admin/marketing/campaigns" },
      { label: "Banners", href: "/admin/marketing/banners" },
      { label: "Email Campaigns", href: "/admin/marketing/email" },
    ]
  },
  {
    label: "Content Manager", href: "/admin/content", section: "marketing",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  },
  {
    label: "Returns & Refunds", href: "/admin/returns", section: "orders",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 15v-6a4 4 0 00-4-4H4m0 0l4 4m-4-4l4-4m4 12v3a3 3 0 01-3 3H6a3 3 0 01-3-3v-3a3 3 0 013-3h3a3 3 0 013 3z"/></svg>,
  },
  {
    label: "Customer Reviews", href: "/admin/reviews", section: "customers",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
  },
  {
    label: "Reports", section: "analytics",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
    children: [
      { label: "Sales", href: "/admin/reports/sales" },
      { label: "Products", href: "/admin/reports/products" },
      { label: "Customers", href: "/admin/reports/customers" },
      { label: "Orders", href: "/admin/reports/orders" },
      { label: "Coupons", href: "/admin/reports/coupons" },
      { label: "Taxes", href: "/admin/reports/taxes" },
    ],
  },
  {
    label: "System Alerts", href: "/admin/notifications", section: "settings",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>,
  },
  {
    label: "Activity Log", href: "/admin/activity-log", section: "settings",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  },
  {
    label: "Settings", href: "/admin/settings", section: "settings",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z\"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  },
  {
    label: "Security Center", section: "users",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
    children: [
      { label: "Security Overview", href: "/admin/security-center" },
      { label: "Active Sessions", href: "/admin/security-center/sessions" },
      { label: "Recycle Bin", href: "/admin/recycle-bin" },
    ]
  },
  {
    label: "Users & Roles", section: "users",
    icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m16-10a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
    children: [
      { label: "Admin Users", href: "/admin/users" },
      { label: "Permission Matrix", href: "/admin/users/roles" },
    ]
  },
];


function NavGroup({ item, pathname }: { item: NavItem; pathname: string }) {
  const isChildActive = item.children?.some((c) => pathname.startsWith(c.href));
  const [open, setOpen] = useState(isChildActive ?? false);

  if (!item.children) {
    const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href ?? "___");
    return (
      <Link
        href={item.href ?? "#"}
        style={
          active
            ? { background: "#f4ecd8", color: "#12192c", fontWeight: 700, borderRadius: "4px", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }
            : { color: "rgba(255, 253, 249, 0.85)", fontWeight: 500, borderRadius: "4px" }
        }
        className="flex items-center gap-3 px-3 py-2 text-xs transition-all hover:bg-white/10 hover:text-white"
      >
        <span style={{ color: active ? "#12192c" : "rgba(255, 253, 249, 0.65)" }} className="flex shrink-0">
          {item.icon}
        </span>
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        style={{ color: isChildActive ? "#ffffff" : "rgba(255, 253, 249, 0.85)", fontWeight: isChildActive ? 700 : 500, borderRadius: "4px" }}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-xs transition-all hover:bg-white/10 hover:text-white cursor-pointer"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span style={{ color: isChildActive ? "#dca134" : "rgba(255, 253, 249, 0.65)" }} className="flex shrink-0">
            {item.icon}
          </span>
          <span className="truncate">{item.label}</span>
        </span>
        <span style={{ color: "rgba(255, 253, 249, 0.5)" }} className="flex shrink-0">
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && (
        <div style={{ borderColor: "rgba(255, 255, 255, 0.12)" }} className="ml-7 mt-1 space-y-0.5 border-l pl-3">
          {item.children.map((child) => {
            const active = pathname === child.href || (child.href !== "/admin/products" && pathname.startsWith(child.href));
            return (
              <Link
                key={child.href}
                href={child.href}
                style={
                  active
                    ? { color: "#dca134", fontWeight: 700, background: "rgba(255, 255, 255, 0.08)", borderRadius: "4px" }
                    : { color: "rgba(255, 253, 249, 0.75)", borderRadius: "4px" }
                }
                className="block py-1.5 px-2.5 text-xs transition-colors hover:text-white hover:bg-white/10 truncate"
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setCurrentUser(d.user);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const allowedSections: string[] =
    currentUser?.allowedSections ||
    DEFAULT_PERMISSIONS[currentUser?.role] ||
    ["overview", "orders", "inventory", "customers", "analytics", "marketing", "b2b", "users", "settings"];

  const isSuperAdmin = currentUser?.role === "super_admin" || currentUser?.role === "Super Admin";

  function isSectionAllowed(sectionKey: string) {
    if (isSuperAdmin || sectionKey === "overview") return true;
    return allowedSections.includes(sectionKey);
  }

  const filteredNav = NAV.filter((item) => isSectionAllowed(item.section));
  const showMetaAds = isSectionAllowed("marketing");
  const showGrowthEngine = isSectionAllowed("analytics");

  const sidebarContent = (
    <div
      className="flex flex-col h-full select-none"
      style={{
        background: "linear-gradient(180deg, #12192c 0%, #16203a 100%)",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Brand Header */}
      <div style={{ borderColor: "rgba(255, 255, 255, 0.1)" }} className="h-16 flex items-center justify-between px-5 border-b shrink-0">
        <Link href="/admin" className="flex items-center gap-2.5">
          <img
            src="/zafiro-logo-dark.png"
            alt="Zafiro Admin"
            style={{ height: 38, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)" }}
          />
          <span style={{ color: "#dca134" }} className="text-xs font-bold uppercase tracking-wider ml-1">
            Admin
          </span>
        </Link>
        <button onClick={onClose} style={{ color: "rgba(255, 253, 249, 0.5)" }} className="md:hidden hover:text-white p-1 cursor-pointer">
          <svg width="20" height="20" style={{ width: "20px", height: "20px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => (
          <NavGroup key={item.label} item={item} pathname={pathname} />
        ))}

        {showMetaAds && (
          <div style={{ borderColor: "rgba(255, 255, 255, 0.1)" }} className="pt-3 mt-3 border-t">
            <p style={{ color: "rgba(220, 161, 52, 0.85)" }} className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5">Meta</p>
            <NavGroup
              item={{
                label: "Meta Ads",
                section: "marketing",
                icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6"/></svg>,
                children: [
                  { label: "Overview", href: "/admin/meta/overview" },
                  { label: "Campaigns", href: "/admin/meta/campaigns" },
                  { label: "Ad Sets", href: "/admin/meta/adsets" },
                  { label: "Ads", href: "/admin/meta/ads" },
                  { label: "Audiences", href: "/admin/meta/audiences" },
                  { label: "Catalog", href: "/admin/meta/catalog" },
                  { label: "Pixel & Tracking", href: "/admin/meta/tracking" },
                  { label: "Settings", href: "/admin/meta/settings" },
                ]
              }}
              pathname={pathname}
            />
          </div>
        )}

        {showGrowthEngine && (
          <div style={{ borderColor: "rgba(255, 255, 255, 0.1)" }} className="pt-3 mt-3 border-t">
            <p style={{ color: "rgba(220, 161, 52, 0.85)" }} className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5">Growth Engine</p>
            <NavGroup
              item={{
                label: "Zafiro AI",
                section: "analytics",
                icon: <svg width="16" height="16" style={{ width: "16px", height: "16px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0012 18.75c-.304 0-.603-.04-.89-.12l-.547-.547z"/></svg>,
                children: [
                  { label: "AI Dashboard", href: "/admin/intelligence/overview" },
                  { label: "AI Forecasting", href: "/admin/intelligence/forecast" },
                  { label: "Recommendations", href: "/admin/intelligence/recommendations" },
                  { label: "Customer Journeys", href: "/admin/intelligence/journeys" },
                  { label: "Opportunities", href: "/admin/intelligence/opportunities" },
                  { label: "AI Settings", href: "/admin/intelligence/settings" },
                ]
              }}
              pathname={pathname}
            />
          </div>
        )}
      </nav>

      {/* Footer User Info & Actions */}
      <div style={{ borderColor: "rgba(255, 255, 255, 0.1)" }} className="p-3.5 border-t shrink-0 space-y-2">
        {currentUser && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "6px",
            }}
            className="flex items-center gap-2.5 px-3 py-2"
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                background: "rgba(220, 161, 52, 0.2)",
                border: "1px solid rgba(220, 161, 52, 0.4)",
                color: "#dca134",
                borderRadius: "50%",
              }}
              className="flex items-center justify-center text-xs font-bold shrink-0"
            >
              {currentUser.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p style={{ color: "#ffffff" }} className="text-xs font-semibold leading-tight truncate">{currentUser.name}</p>
              <p style={{ color: "#dca134" }} className="text-[10px] font-mono mt-0.5 uppercase tracking-wider truncate">
                {currentUser.role?.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between px-1 pt-1">
          <Link href="/" target="_blank" style={{ color: "rgba(255, 253, 249, 0.7)" }} className="text-[11px] hover:text-[#dca134] transition-colors flex items-center gap-1.5">
            <svg width="14" height="14" style={{ width: "14px", height: "14px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            View Store
          </Link>
          <button
            onClick={handleLogout}
            style={{ color: "rgba(255, 253, 249, 0.7)" }}
            className="text-[11px] hover:text-[#e5533d] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <svg width="14" height="14" style={{ width: "14px", height: "14px", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside className={`md:hidden fixed inset-y-0 left-0 z-40 w-64 flex flex-col transform transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {sidebarContent}
      </aside>
    </>
  );
}
