"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, DataTable, Column } from "@/components/admin/Shared";

interface SegmentData {
  name: string;
  count: number;
  revenue: number;
  orders: number;
  aov: number;
  customers: { id: string; name: string; email: string; company?: string; spent: number; orders: number }[];
}

interface SegmentsResponse {
  highValue: SegmentData;
  newCustomers: SegmentData;
  inactive: SegmentData;
  frequent: SegmentData;
  abandoners: SegmentData;
}

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }

export default function SegmentsPage() {
  const [data, setData] = useState<SegmentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<keyof SegmentsResponse>("highValue");

  useEffect(() => {
    fetch("/api/admin/customers/segments")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading || !data) return <PageShell><LoadingSpinner /></PageShell>;

  const activeData = data[activeSegment];

  const customerCols: Column<any>[] = [
    { key: "name", label: "Customer", render: (c) => (
      <div>
        <p className="font-semibold text-indigo">{c.name}</p>
        {c.company && <p className="text-[10px] text-stone uppercase tracking-wider font-semibold">{c.company}</p>}
      </div>
    )},
    { key: "email", label: "Email Address" },
    { key: "orders", label: "Total Orders", render: (c) => <span className="font-semibold">{c.orders}</span> },
    { key: "spent", label: "Lifetime Spend", render: (c) => <span className="font-bold text-green-700">{fmt(c.spent)}</span> }
  ];

  return (
    <PageShell>
      <PageHeader title="Customer Segments" subtitle="Target your marketing and loyalty efforts using auto-updating dynamic customer lists." />

      {/* Segment Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {(Object.keys(data) as Array<keyof SegmentsResponse>).map((key) => {
          const seg = data[key];
          const active = activeSegment === key;
          return (
            <button
              key={key}
              onClick={() => setActiveSegment(key)}
              className={`p-4 rounded-sm border text-left transition-all ${
                active ? "bg-indigo text-paper border-indigo shadow-md" : "bg-cream-card text-ink border-stone/20 hover:border-indigo/50"
              }`}
            >
              <p className={`text-[9px] uppercase tracking-wider font-bold ${active ? "text-paper/70" : "text-stone"}`}>{seg.name}</p>
              <p className="text-2xl font-display font-semibold mt-1">{seg.count}</p>
            </button>
          );
        })}
      </div>

      {/* Active Segment details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SectionCard title={`${activeData.name} Overview`} className="md:col-span-1">
          <div className="space-y-4">
            <div className="border-b border-stone/10 pb-3">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Total Segment Revenue</p>
              <p className="text-xl font-display font-semibold mt-1">{fmt(activeData.revenue)}</p>
            </div>
            <div className="border-b border-stone/10 pb-3">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Average Order Value (AOV)</p>
              <p className="text-xl font-display font-semibold mt-1">{fmt(activeData.aov)}</p>
            </div>
            <div>
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Total Orders</p>
              <p className="text-xl font-display font-semibold mt-1">{activeData.orders} orders</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Target customer list" className="md:col-span-2">
          <DataTable columns={customerCols} rows={activeData.customers} emptyMessage="No customers matched in this segment." />
        </SectionCard>
      </div>
    </PageShell>
  );
}
