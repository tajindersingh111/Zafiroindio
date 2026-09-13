"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, StatusBadge, Btn, useToast } from "@/components/admin/Shared";

interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  quantity: number;
  refundAmount: number;
  reason: string;
  notes: string;
  status: "requested" | "under_review" | "approved" | "rejected" | "refunded" | "completed";
  createdAt: string;
}

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }

export default function ReturnsPage() {
  const { addToast } = useToast();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);

  useEffect(() => {
    fetchReturns();
  }, []);

  function fetchReturns() {
    setLoading(true);
    fetch("/api/admin/returns")
      .then((r) => r.json())
      .then((data) => {
        setReturns(data);
        setLoading(false);
      });
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/returns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      addToast(`Return request status updated to: ${status.replace(/_/g, " ")}`);
      setSelectedReturn(null);
      fetchReturns();
    }
  }

  // Analytics
  const totalReturns = returns.length;
  const totalRefundAmount = returns.reduce((s, r) => s + r.refundAmount, 0);
  const pendingCount = returns.filter((r) => r.status === "requested" || r.status === "under_review").length;

  return (
    <PageShell>
      <PageHeader title="Return & Refund requests" subtitle="Process customer refund inquiries, inspect return reasons, and adjust order receipts." />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Quick Analytics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Total Return Requests</p>
              <p className="text-xl font-display font-semibold mt-1">{totalReturns} requests</p>
            </div>
            <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Total Refund Amount</p>
              <p className="text-xl font-display font-semibold mt-1">{fmt(totalRefundAmount)}</p>
            </div>
            <div className="bg-cream-card border border-stone/20 p-4 rounded-sm">
              <p className="text-[10px] text-stone font-semibold uppercase tracking-wider">Pending Attention</p>
              <p className="text-xl font-display font-semibold mt-1 text-madder">{pendingCount} pending</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SectionCard title="Return requests" className="lg:col-span-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone/20 bg-paper/50">
                    {["Order / Date", "Customer", "Product", "Refund", "Status"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {returns.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedReturn(r)}
                      className={`border-b border-stone/10 last:border-0 hover:bg-paper/40 cursor-pointer ${
                        selectedReturn?.id === r.id ? "bg-paper/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-indigo font-bold">{r.orderNumber}</p>
                        <p className="text-[10px] text-stone">{new Date(r.createdAt).toLocaleDateString("en-IN")}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink">{r.customerName}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-xs">{r.productName} (x{r.quantity})</td>
                      <td className="px-4 py-3 font-bold text-madder">{fmt(r.refundAmount)}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>

            <SectionCard title="Return request Detail">
              {selectedReturn ? (
                <div className="space-y-4 text-sm text-ink-soft">
                  <div>
                    <p className="text-[10px] text-stone font-semibold uppercase">Order Number</p>
                    <p className="font-mono text-indigo font-bold">{selectedReturn.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-stone font-semibold uppercase">Customer Details</p>
                    <p className="font-semibold text-ink">{selectedReturn.customerName}</p>
                    <p className="text-xs text-stone">{selectedReturn.customerEmail}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-stone font-semibold uppercase">Product Description</p>
                    <p className="font-medium text-ink">{selectedReturn.productName}</p>
                    <p className="text-xs text-stone">Quantity: {selectedReturn.quantity}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-stone font-semibold uppercase">Requested Refund Amount</p>
                    <p className="font-bold text-madder">{fmt(selectedReturn.refundAmount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-stone font-semibold uppercase">Reason for Return</p>
                    <p className="text-ink font-semibold">{selectedReturn.reason}</p>
                    <p className="text-xs text-stone italic mt-1">"{selectedReturn.notes}"</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-stone font-semibold uppercase mb-1">Current Status</p>
                    <StatusBadge status={selectedReturn.status} />
                  </div>

                  {/* Actions */}
                  {(selectedReturn.status === "requested" || selectedReturn.status === "under_review") && (
                    <div className="flex gap-2 pt-4 border-t border-stone/10">
                      <Btn size="sm" onClick={() => updateStatus(selectedReturn.id, "approved")}>Approve</Btn>
                      <Btn size="sm" variant="secondary" onClick={() => updateStatus(selectedReturn.id, "rejected")}>Reject</Btn>
                    </div>
                  )}
                  {selectedReturn.status === "approved" && (
                    <div className="pt-4 border-t border-stone/10">
                      <Btn size="sm" onClick={() => updateStatus(selectedReturn.id, "completed")}>Process Refund & Complete</Btn>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-stone text-center py-10">Select a return request from the list to manage and process refunds.</p>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </PageShell>
  );
}
