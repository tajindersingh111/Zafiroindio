"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner } from "@/components/admin/Shared";
import { MetaWrapper } from "@/components/admin/MetaWrapper";

interface PixelEvent {
  name: string;
  source: string;
  status: string;
  lastReceived: string;
  count: number;
}

export default function MetaTrackingPage() {
  const [events, setEvents] = useState<PixelEvent[]>([]);
  const [capiStatus, setCapiStatus] = useState("Not Connected");
  const [deduplicationRate, setDeduplicationRate] = useState("N/A");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/meta/diagnostics")
      .then((r) => r.json())
      .then((data) => {
        setEvents(data?.events ?? []);
        setCapiStatus(data?.conversionsApiStatus ?? "Not Connected");
        setDeduplicationRate(data?.deduplicationRate ?? "N/A");
        setLoading(false);
      });
  }, []);

  return (
    <MetaWrapper>
      <PageShell>
        <PageHeader title="Pixel & Conversions API Diagnostics" subtitle="Monitor real-time event logs, check deduplication status, and diagnose browser/server event logs." />

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-6">
            {/* Meta diagnostics summaries */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
                <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Browser Pixel Connection</p>
                <p className="text-xl font-display font-semibold mt-1 text-green-800">Active & Tracking</p>
              </div>
              <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
                <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Server Conversions API (CAPI)</p>
                <p className="text-xl font-display font-semibold mt-1 text-green-800">{capiStatus}</p>
              </div>
              <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
                <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">CAPI Event Deduplication Rate</p>
                <p className="text-xl font-display font-semibold mt-1 text-indigo">{deduplicationRate}</p>
              </div>
            </div>

            {/* Events Logs List */}
            <SectionCard title="Active Diagnostic Events Logs">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone/20 bg-paper/50">
                    {["Event Name", "Data Source Channel", "Last Event Received", "Total Count", "Status"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.name} className="border-b border-stone/10 last:border-0 hover:bg-paper/40">
                      <td className="px-4 py-3 font-semibold text-ink">{e.name}</td>
                      <td className="px-4 py-3 text-xs text-stone font-semibold uppercase">{e.source}</td>
                      <td className="px-4 py-3 text-xs text-stone">{e.lastReceived}</td>
                      <td className="px-4 py-3 font-semibold">{e.count.toLocaleString()} events</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-700/10 text-green-800 uppercase">
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          </div>
        )}
      </PageShell>
    </MetaWrapper>
  );
}
