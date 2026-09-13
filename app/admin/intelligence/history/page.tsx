"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, FilterSelect } from "@/components/admin/Shared";

interface HistoryLog {
  id: string;
  recommendation: string;
  date: string;
  category: string;
  evidence: string;
  status: string;
}

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "New / Pending", value: "New" },
  { label: "Approved Actions", value: "Approved" },
  { label: "Rejected / Dismissed", value: "Rejected" },
  { label: "Completed Updates", value: "Completed" }
];

export default function AIHistoryPage() {
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchHistory();
  }, []);

  function fetchHistory() {
    setLoading(true);
    // Simple fetch of seeded history data (which is in data/ai-history.json)
    fetch("/api/admin/ai/recommendations") // Or read from static settings/logs helper
      .then(() => {
        // Read directly from static seeds for immediate display
        const logs: HistoryLog[] = [
          {
            id: "rec-1",
            recommendation: "Increase daily budget for 'Mughal & Jaipuri Linens Sales' by ₹500.",
            date: "2026-08-28",
            category: "marketing",
            evidence: "Campaign maintained a high ROAS of 9.54x over the last 14 days, compared to other active campaigns.",
            status: "Approved"
          },
          {
            id: "rec-2",
            recommendation: "Restock Cleopatra Golden Bloom Bedsheet (Recommended Quantity: 50 units).",
            date: "2026-08-29",
            category: "inventory",
            evidence: "Current stock is 42 units. Sales velocity is 4.2/day. Estimated stock-out is in 10 days.",
            status: "New"
          },
          {
            id: "rec-3",
            recommendation: "Launch Inactive Re-engagement email to 420 single-purchase buyers.",
            date: "2026-08-30",
            category: "retention",
            evidence: "420 customers have not purchased for 90 days. Estimated recovery revenue is ₹1,42,000.",
            status: "New"
          }
        ];
        setHistory(logs);
        setLoading(false);
      });
  }

  const filtered = statusFilter ? history.filter((h) => h.status === statusFilter) : history;

  return (
    <PageShell>
      <div className="flex justify-between items-center">
        <PageHeader title="AI Recommendation History & Log" subtitle="Review previous AI outputs, approval configurations, and marketing operations." />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} placeholder="" />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <SectionCard title="Recommendation Logs history">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone/20 bg-paper/50">
                {["Date", "Category", "Recommendation Detail", "Supporting Evidence", "Action Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/40">
                  <td className="px-4 py-3 text-xs text-stone font-mono">{log.date}</td>
                  <td className="px-4 py-3 text-xs text-stone uppercase font-semibold">{log.category}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{log.recommendation}</td>
                  <td className="px-4 py-3 text-xs text-stone leading-relaxed max-w-sm">{log.evidence}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      log.status === "Approved" ? "bg-green-700/10 text-green-800" : log.status === "New" ? "bg-indigo/10 text-indigo animate-pulse" : "bg-stone/20 text-stone"
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-stone">No matching recommendation log events.</td>
                </tr>
              )}
            </tbody>
          </table>
        </SectionCard>
      )}
    </PageShell>
  );
}
