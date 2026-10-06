"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Role } from "@/lib/roles";

type RoleContextType = {
  role: Role;
  /** Kept for API compatibility. The role is owned by the server session and cannot be changed here. */
  setRole: (r: Role) => void;
  loaded: boolean;
};

const RoleContext = createContext<RoleContextType | null>(null);

const FROM_SERVER: Record<string, Role> = {
  super_admin: "Super Admin",
  admin: "Super Admin", // UI only; the server still enforces the user's real sections
  inventory_manager: "Inventory Manager",
  order_manager: "Order Manager",
  manager: "Order Manager",
  marketing: "Marketing",
  b2b_sales: "B2B Sales",
};

export function RoleProvider({ children }: { children: ReactNode }) {
  // Least-privilege UI until the session is confirmed by the server.
  const [role, setRole] = useState<Role>("Marketing");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.user) return;
        const key = String(d.user.role || "").toLowerCase().replace(/[\s-]+/g, "_");
        setRole(FROM_SERVER[key] ?? "Marketing");
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return <RoleContext.Provider value={{ role, setRole: () => {}, loaded }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
