"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Address } from "@/lib/db/types";

export interface CustomerProfile {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  shipping: Address | null;
  billing: Address | null;
  totalOrders: number;
}

interface AuthValue {
  customer: CustomerProfile | null;
  /** True until the first /api/account/me answer, so the header can avoid a signed-out flash. */
  loading: boolean;
  refresh: () => Promise<CustomerProfile | null>;
  signOut: () => Promise<void>;
  setCustomer: (customer: CustomerProfile | null) => void;
}

const AuthContext = createContext<AuthValue>({
  customer: null,
  loading: true,
  refresh: async () => null,
  signOut: async () => {},
  setCustomer: () => {},
});

/**
 * Who is signed in, for the storefront.
 *
 * The session itself is an httpOnly cookie the browser cannot read, so this only mirrors what the
 * server says. Nothing here is a security boundary — every protected route re-checks the cookie.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/account/me", { cache: "no-store" });
      if (!res.ok) {
        setCustomer(null);
        return null;
      }
      const data = await res.json();
      const next: CustomerProfile | null = data?.customer ?? null;
      setCustomer(next);
      return next;
    } catch {
      setCustomer(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Clearing the local view is the important part; the cookie expires regardless.
    }
    setCustomer(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthValue>(() => ({ customer, loading, refresh, signOut, setCustomer }), [customer, loading, refresh, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  return useContext(AuthContext);
}
