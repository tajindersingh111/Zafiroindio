"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, VideoOff } from "lucide-react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, Btn, FilterSelect, useToast } from "@/components/admin/Shared";
import type { ReturnRecord } from "@/lib/db/types";

type Status = ReturnRecord["status"];

const STATUS_STYLE: Record<Status, [string, string]> = {
  RETURN_REQUESTED: ["Awaiting review", "bg-turmeric/15 text-[#8a6519] border border-turmeric/20"],
  RETURN_APPROVED: ["Accepted", "bg-green-700/10 text-green-800 border border-green-700/20"],
  RETURN_REJECTED: ["Rejected", "bg-madder/10 text-madder border border-madder/20"],
  RECEIVED: ["Product received", "bg-indigo/10 text-indigo border border-indigo/20"],
  COMPLETED: ["Completed", "bg-stone/15 text-ink-soft border border-stone/20"],
};

function Badge({ status }: { status: Status }) {
  const [label, cls] = STATUS_STYLE[status] ?? [status, "bg-stone/15 text-ink-soft border border-stone/20"];
  return <span className={`inline-flex px-2 py-0.5 rounded-sm text-[10px] font-medium uppercase tracking-wider whitespace-nowrap ${cls}`}>{label}</span>;
}

const kindLabel = (k?: ReturnRecord["kind"]) => (k === "exchange" ? "Exchange" : k === "return" ? "Return (damaged)" : "Return");
const fmt = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "");

export default function ReturnsPage() {
  const { addToast } = useToast();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "" | Status>("open");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/returns");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load requests.");
      setReturns(data.returns || []);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not load requests.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = useMemo(() => {
    const rows = !filter ? returns : filter === "open" ? returns.filter((r) => r.status === "RETURN_REQUESTED") : returns.filter((r) => r.status === filter);
    return [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [returns, filter]);
  const selected = returns.find((r) => r.id === selectedId) ?? null;

  function select(r: ReturnRecord) {
    setSelectedId(r.id);
    setNotes(r.adminNotes || "");
  }

  async function updateStatus(status: Status) {
    if (!selected) return;
    if (status === "RETURN_REJECTED" && !notes.trim()) {
      addToast("Add a short reason for the customer before rejecting.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/returns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnId: selected.id, status, adminNotes: notes.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed.");
      addToast(`Request ${STATUS_STYLE[status][0].toLowerCase()}.`);
      await load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Update failed.", "error");
    } finally {
      setSaving(false);
    }
  }

  const pendingCount = returns.filter((r) => r.status === "RETURN_REQUESTED").length;
  const exchangeCount = returns.filter((r) => r.kind === "exchange").length;

  return (
    <PageShell>
      <PageHeader
        title="Returns & Exchanges"
        subtitle="Watch the customer's unboxing video, then accept or reject. Policy: only damaged products are returned, everything else is exchange, and no video means no request."
        action={<Link href="/return-policy" target="_blank" className="text-xs text-indigo underline">View policy</Link>}
      />

      {loading && !returns.length ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Awaiting review</p>
              <p className="text-xl font-semibold mt-1 text-madder">{pendingCount}</p>
            </div>
            <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">All requests</p>
              <p className="text-xl font-semibold mt-1">{returns.length}</p>
            </div>
            <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Exchanges / Returns</p>
              <p className="text-xl font-semibold mt-1">{exchangeCount} / {returns.length - exchangeCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <SectionCard
              title="Requests"
              className="lg:col-span-2"
              action={
                <FilterSelect
                  value={filter}
                  placeholder="All requests"
                  onChange={(v) => setFilter(v as typeof filter)}
                  options={[
                    { value: "open", label: "Awaiting review" },
                    ...(Object.keys(STATUS_STYLE) as Status[]).filter((s) => s !== "RETURN_REQUESTED").map((s) => ({ value: s, label: STATUS_STYLE[s][0] })),
                  ]}
                />
              }
            >
              {list.length === 0 ? (
                <p className="text-stone text-sm text-center py-10">No requests here.</p>
              ) : (
                <ul className="divide-y divide-stone/10 -my-2">
                  {list.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => select(r)}
                        className={`w-full text-left py-3 px-2 rounded-sm hover:bg-paper/50 ${selectedId === r.id ? "bg-paper/60" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-xs text-indigo font-bold">{r.orderNumber}</span>
                          <Badge status={r.status} />
                        </div>
                        <div className="flex items-center justify-between gap-3 mt-1">
                          <span className="text-sm text-ink truncate">{r.customerName}</span>
                          <span className="text-[11px] text-stone whitespace-nowrap">{kindLabel(r.kind)}{r.video ? "" : " · no video"}</span>
                        </div>
                        <p className="text-[10px] text-stone mt-0.5">{when(r.createdAt)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Request detail" className="lg:col-span-3">
              {!selected ? (
                <p className="text-stone text-center py-10 text-sm">Select a request to watch the video and decide.</p>
              ) : (
                <div className="space-y-5 text-sm text-ink-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-indigo font-bold">{selected.orderNumber}</p>
                      <p className="font-semibold text-ink">{selected.customerName}</p>
                      <p className="text-xs text-stone">{selected.customerEmail}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge status={selected.status} />
                      <p className="text-xs font-semibold text-ink">{kindLabel(selected.kind)}</p>
                      {selected.kind !== "exchange" && <p className="text-xs text-stone">Order value {fmt(selected.refundAmount)}</p>}
                    </div>
                  </div>

                  {selected.video ? (
                    <div>
                      <video
                        key={selected.id}
                        src={`/api/admin/returns/${encodeURIComponent(selected.id)}/video`}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full max-h-[460px] bg-black rounded-sm"
                      />
                      <div className="flex items-center justify-between mt-1.5 text-[11px] text-stone">
                        <span>{selected.video.name || "Unboxing video"} · {mb(selected.video.size)}</span>
                        <a href={`/api/admin/returns/${encodeURIComponent(selected.id)}/video?download=1`} className="inline-flex items-center gap-1 text-indigo underline">
                          <Download size={12} /> Download
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 border border-madder/30 bg-madder/5 text-madder rounded-sm text-xs">
                      <VideoOff size={16} /> No unboxing video. Under the policy this request cannot be accepted.
                    </div>
                  )}

                  {!!selected.items?.length && (
                    <div>
                      <p className="text-[10px] text-stone font-semibold uppercase mb-1">Items</p>
                      <ul className="list-disc pl-5 text-ink">{selected.items.map((n) => <li key={n}>{n}</li>)}</ul>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] text-stone font-semibold uppercase mb-1">Customer&apos;s description</p>
                    <p className="text-ink whitespace-pre-wrap">{selected.reason}</p>
                  </div>

                  {selected.decidedAt && (
                    <p className="text-xs text-stone">Decided by {selected.decidedBy} on {when(selected.decidedAt)}</p>
                  )}

                  <label className="block">
                    <span className="text-[10px] text-stone font-semibold uppercase">Note to customer (required to reject)</span>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Video does not show the sealed parcel"
                      className="mt-1 w-full border border-stone/30 rounded-sm px-3 py-2 text-sm bg-paper focus:outline-none focus:border-indigo"
                    />
                  </label>

                  <div className="flex flex-wrap gap-2 pt-3 border-t border-stone/10">
                    {selected.status === "RETURN_REQUESTED" && (
                      <>
                        <Btn size="sm" disabled={saving || !selected.video} onClick={() => updateStatus("RETURN_APPROVED")}>Accept</Btn>
                        <Btn size="sm" variant="danger" disabled={saving} onClick={() => updateStatus("RETURN_REJECTED")}>Reject</Btn>
                      </>
                    )}
                    {selected.status === "RETURN_APPROVED" && (
                      <Btn size="sm" disabled={saving} onClick={() => updateStatus("RECEIVED")}>Mark product received</Btn>
                    )}
                    {(selected.status === "RETURN_APPROVED" || selected.status === "RECEIVED") && (
                      <Btn size="sm" variant="secondary" disabled={saving} onClick={() => updateStatus("COMPLETED")}>
                        {selected.kind === "exchange" ? "Exchange sent · complete" : "Complete"}
                      </Btn>
                    )}
                    <Link href={`/admin/orders/${encodeURIComponent(selected.orderId)}`} className="ml-auto text-xs text-indigo underline self-center">Open order</Link>
                  </div>
                  {selected.kind !== "exchange" && selected.status !== "RETURN_REQUESTED" && selected.status !== "RETURN_REJECTED" && (
                    <p className="text-[11px] text-stone">Refunds are issued from the order page (Refund), after the product is received.</p>
                  )}
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </PageShell>
  );
}
