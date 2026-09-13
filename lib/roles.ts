export type Role =
  | "Super Admin"
  | "Inventory Manager"
  | "Order Manager"
  | "Marketing"
  | "B2B Sales";

export type Section =
  | "overview"
  | "orders"
  | "inventory"
  | "customers"
  | "analytics"
  | "marketing"
  | "b2b"
  | "users"
  | "settings";

/** Which sections each role can see. Super Admin always has everything. */
const PERMISSIONS: Record<Role, Section[]> = {
  "Super Admin": [
    "overview",
    "orders",
    "inventory",
    "customers",
    "analytics",
    "marketing",
    "b2b",
    "users",
    "settings",
  ],
  "Inventory Manager": ["overview", "inventory"],
  "Order Manager": ["overview", "orders", "customers"],
  Marketing: ["overview", "marketing", "analytics"],
  "B2B Sales": ["overview", "b2b", "customers"],
};

export function can(role: Role, section: Section): boolean {
  return PERMISSIONS[role]?.includes(section) ?? false;
}

export const ALL_ROLES: Role[] = [
  "Super Admin",
  "Inventory Manager",
  "Order Manager",
  "Marketing",
  "B2B Sales",
];

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  "Super Admin": "Full access — users & roles, financial reports, site settings",
  "Inventory Manager": "Products, stock levels, categories, bulk CSV upload",
  "Order Manager": "Order processing, shipping status, returns & refunds",
  Marketing: "Blog, banners, discounts, SEO fields, sales analytics",
  "B2B Sales": "Bulk order enquiries, custom quotes, client history",
};

export const NAV_ITEMS: { section: Section; label: string; href: string; icon: string }[] = [
  { section: "overview", label: "Overview", href: "/admin", icon: "grid" },
  { section: "orders", label: "Orders", href: "/admin/orders", icon: "box" },
  { section: "inventory", label: "Inventory", href: "/admin/inventory", icon: "layers" },
  { section: "customers", label: "Customers", href: "/admin/customers", icon: "users" },
  { section: "analytics", label: "Analytics", href: "/admin/analytics", icon: "chart" },
  { section: "marketing", label: "Marketing", href: "/admin/marketing", icon: "tag" },
  { section: "b2b", label: "Bulk / B2B", href: "/admin/b2b", icon: "briefcase" },
  { section: "users", label: "Users & Roles", href: "/admin/users", icon: "shield" },
  { section: "settings", label: "Settings", href: "/admin/settings", icon: "settings" },
];
