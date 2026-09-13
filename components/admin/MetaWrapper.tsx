"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoadingSpinner, PageShell, PageHeader } from "./Shared";

interface MetaConfig {
  isConnected: boolean;
}

export function MetaWrapper({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [config, setConfig] = useState<MetaConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/meta/config")
      .then((r) => r.json())
      .then((d) => {
        setConfig(d);
        setLoading(false);
      });
  }, []);

  if (loading) return <PageShell><LoadingSpinner /></PageShell>;

  // If not connected and we are not already on the settings page, redirect or show connection card
  if (!config?.isConnected && pathname !== "/admin/meta/settings") {
    return (
      <PageShell>
        <PageHeader title="Meta Account Disconnected" subtitle="Connection required to view marketing performance campaigns." />
        <div className="border border-stone/30 rounded-sm bg-cream-card p-8 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-madder/15 flex items-center justify-center text-madder mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h3 className="font-display text-lg font-semibold text-ink">Account Connection Required</h3>
          <p className="text-xs text-stone leading-relaxed">Your store is not linked to any Meta Business Asset yet. Please configure your developer access tokens to unlock campaign tracking diagnostics.</p>
          <button onClick={() => router.push("/admin/meta/settings")} className="bg-indigo text-paper text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-sm hover:opacity-95">
            Configure Meta Settings
          </button>
        </div>
      </PageShell>
    );
  }

  return <>{children}</>;
}
