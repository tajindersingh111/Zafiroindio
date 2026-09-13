"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner } from "@/components/admin/Shared";

interface LogEntry {
  id: string;
  user: string;
  action: string;
  description: string;
  createdAt: string;
}

export default function StockHistoryPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/products/stock-history")
      .then((r) => r.json())
      .then((data) => {
        setLogs(data);
        setLoading(false);
      });
  }, []);

  return (
    <PageShell>
      <PageHeader title="Inventory Adjustment Logs" subtitle="Audit trail tracking stock updates, manual overrides, and quantity changes." />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <SectionCard title="Stock Adjustments Audit Trail">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone/20 bg-paper/50">
                {["Date & Time", "Action Performed", "Adjusted By", "Description"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/40">
                  <td className="px-4 py-3 text-xs text-stone">
                    {new Date(log.createdAt).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 font-semibold text-indigo">{log.action}</td>
                  <td className="px-4 py-3 font-medium text-ink">{log.user}</td>
                  <td className="px-4 py-3 text-stone">{log.description}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-stone">No stock adjustments logged yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </SectionCard>
      )}
    </PageShell>
  );
}
