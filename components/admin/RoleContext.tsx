"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Role } from "@/lib/roles";

type RoleContextType = {
  role: Role;
  setRole: (r: Role) => void;
};

const RoleContext = createContext<RoleContextType | null>(null);
const STORAGE_KEY = "zafiro-admin-role-demo";

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("Super Admin");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Role | null;
    if (saved) setRole(saved);
  }, []);

  function updateRole(r: Role) {
    setRole(r);
    window.localStorage.setItem(STORAGE_KEY, r);
  }

  return <RoleContext.Provider value={{ role, setRole: updateRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
