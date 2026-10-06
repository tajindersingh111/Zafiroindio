/**
 * Single source of truth for "which admin section may touch which URL".
 * Used by proxy.ts (optimistic redirect) and lib/auth/guard.ts (authoritative check).
 * Unknown admin API paths fail CLOSED: only Super Admin may use them.
 */
export type Section =
  | "overview" | "orders" | "inventory" | "customers" | "analytics"
  | "marketing" | "b2b" | "users" | "settings";

export const ALL_SECTIONS: Section[] = [
  "overview", "orders", "inventory", "customers", "analytics", "marketing", "b2b", "users", "settings",
];

/** Default sections per role (when the user has no explicit allowedSections). */
export const ROLE_SECTIONS: Record<string, Section[]> = {
  super_admin: ALL_SECTIONS,
  inventory_manager: ["overview", "inventory"],
  order_manager: ["overview", "orders", "customers"],
  marketing: ["overview", "marketing", "analytics"],
  b2b_sales: ["overview", "b2b", "customers"],
  admin: ["overview", "orders", "inventory", "customers", "analytics", "marketing", "settings"],
  manager: ["overview", "orders", "inventory", "customers"],
  staff: ["overview"],
};

export function normalizeRoleKey(role: string | undefined): string {
  return (role || "").toLowerCase().replace(/[\s-]+/g, "_");
}

export function defaultSectionsForRole(role: string | undefined): Section[] {
  return ROLE_SECTIONS[normalizeRoleKey(role)] ?? ["overview"];
}

/** First path segment after /admin/ or /api/admin/ -> section. `null` = unknown (super admin only). */
const SEGMENT_SECTION: Record<string, Section> = {
  // orders & fulfilment
  orders: "orders", returns: "orders", refunds: "orders", payments: "orders", shipping: "settings", "bulk-orders": "b2b",
  // catalogue
  products: "inventory", inventory: "inventory", upload: "inventory", collections: "inventory",
  // people
  customers: "customers", reviews: "customers", "abandoned-carts": "customers",
  // analytics
  analytics: "analytics", reports: "analytics", expenses: "analytics", goals: "analytics", intelligence: "analytics", ai: "analytics",
  // marketing
  marketing: "marketing", banners: "marketing", campaigns: "marketing", coupons: "marketing", ads: "marketing", meta: "marketing", content: "marketing",
  b2b: "b2b",
  // administration
  users: "users", "security-center": "users", security: "users", "activity-log": "users", "recycle-bin": "users",
  settings: "settings", taxes: "settings",
  // everyone logged in
  search: "overview", notifications: "overview", auth: "overview", export: "overview",
};

export function sectionForPath(pathname: string): Section | null {
  const parts = pathname.split("/").filter(Boolean);
  const adminIdx = parts.indexOf("admin");
  if (adminIdx < 0) return null;
  const seg = parts[adminIdx + 1];
  if (!seg) return "overview"; // /admin dashboard
  return SEGMENT_SECTION[seg] ?? null;
}

export function canAccessSection(
  role: string | undefined,
  allowedSections: string[] | undefined,
  section: Section | null
): boolean {
  const key = normalizeRoleKey(role);
  if (key === "super_admin") return true;
  if (section === null) return false; // fail closed on unknown admin paths
  if (section === "overview") return true;
  const allowed = allowedSections && allowedSections.length ? allowedSections : defaultSectionsForRole(role);
  return allowed.includes(section);
}
