"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageShell, PageHeader, DataTable, Pagination, SearchBar, FilterSelect, StatusBadge, Column, ConfirmDialog, Btn, LoadingSpinner, useToast, SectionCard } from "@/components/admin/Shared";

interface Coupon {
  id: string; code: string; type: string; amount: number; minimumSpend?: number;
  usageLimit?: number; usageCount: number; expiryDate?: string;
  isActive: boolean; createdAt: string;
}

export default function CouponsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isActive, setIsActive] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", type: "fixed_cart", amount: "", minimumSpend: "", usageLimit: "", expiryDate: "", isActive: true });
  const [saving, setSaving] = useState(false);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (search) params.set("search", search);
    if (isActive) params.set("isActive", isActive);
    const res = await fetch(`/api/admin/coupons?${params}`);
    const data = await res.json();
    setCoupons(data.coupons ?? []);
    setTotal(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [page, search, isActive]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);
  useEffect(() => { setPage(1); }, [search, isActive]);

  async function saveCoupon() {
    if (!form.code || !form.amount) { addToast("Code and amount are required.", "error"); return; }
    setSaving(true);
    const payload = {
      code: form.code,
      type: form.type,
      amount: Number(form.amount),
      minimumSpend: form.minimumSpend ? Number(form.minimumSpend) : undefined,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      expiryDate: form.expiryDate || undefined,
      isActive: form.isActive,
    };
    const res = await fetch("/api/admin/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { addToast("Coupon created."); setShowModal(false); setForm({ code: "", type: "fixed_cart", amount: "", minimumSpend: "", usageLimit: "", expiryDate: "", isActive: true }); fetchCoupons(); }
    else { const d = await res.json(); addToast(d.error ?? "Failed.", "error"); }
    setSaving(false);
  }

  async function toggleActive(coupon: Coupon) {
    await fetch(`/api/admin/coupons/${coupon.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !coupon.isActive }) });
    addToast(`Coupon ${coupon.isActive ? "deactivated" : "activated"}.`);
    fetchCoupons();
  }

  async function deleteCoupon(id: string) {
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    addToast("Coupon deleted.", "warning");
    setConfirmDelete(null);
    fetchCoupons();
  }

  const columns: Column<Coupon>[] = [
    { key: "code", label: "Code", render: (c) => <span className="font-mono font-bold text-indigo text-sm tracking-wider">{c.code}</span> },
    { key: "type", label: "Type", render: (c) => <span className="text-xs text-stone capitalize">{c.type.replace(/_/g, " ")}</span> },
    { key: "amount", label: "Amount", render: (c) => <span className="font-semibold">{c.type === "percent" ? `${c.amount}%` : `₹${c.amount}`}</span> },
    { key: "minimumSpend", label: "Min. Spend", render: (c) => <span className="text-stone text-sm">{c.minimumSpend ? `₹${c.minimumSpend.toLocaleString("en-IN")}` : "None"}</span> },
    { key: "usageCount", label: "Used", render: (c) => <span>{c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</span> },
    { key: "expiryDate", label: "Expiry", render: (c) => <span className="text-xs text-stone">{c.expiryDate ? new Date(c.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Never"}</span> },
    { key: "isActive", label: "Active", render: (c) => <StatusBadge status={String(c.isActive)} /> },
    {
      key: "actions", label: "", render: (c) => (
        <div className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => toggleActive(c)} className="text-indigo hover:underline">{c.isActive ? "Disable" : "Enable"}</button>
          <button onClick={() => setConfirmDelete(c.id)} className="text-madder hover:underline">Del</button>
        </div>
      )
    },
  ];

  const inputCls = "w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-madder/40 focus:border-madder transition-colors";

  return (
    <PageShell>
      <PageHeader
        title="Coupons & Discounts"
        subtitle={`${total} coupons`}
        action={<Btn onClick={() => setShowModal(true)}>+ Add Coupon</Btn>}
      />

      <div className="flex gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search coupon code…" className="w-64" />
        <FilterSelect value={isActive} onChange={setIsActive} options={[{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }]} placeholder="All statuses" />
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          <DataTable columns={columns} rows={coupons} emptyMessage="No coupons found." />
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}

      {/* Create Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40">
          <div className="bg-cream-card rounded-sm border border-stone/30 shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone/20">
              <h3 className="font-display text-lg text-indigo">New Coupon</h3>
              <button onClick={() => setShowModal(false)} className="text-stone hover:text-ink">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: "Coupon Code", key: "code", placeholder: "SAVE20", type: "text" },
                { label: "Amount", key: "amount", placeholder: "e.g. 200 or 15", type: "number" },
                { label: "Minimum Spend (₹)", key: "minimumSpend", placeholder: "e.g. 1500", type: "number" },
                { label: "Usage Limit", key: "usageLimit", placeholder: "Leave empty for unlimited", type: "number" },
                { label: "Expiry Date", key: "expiryDate", placeholder: "", type: "date" },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">{label}</label>
                  <input type={type} value={(form as Record<string, string | boolean>)[key] as string} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} className={inputCls} placeholder={placeholder} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Type</label>
                <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className={inputCls}>
                  <option value="fixed_cart">Fixed Amount</option>
                  <option value="percent">Percentage</option>
                  <option value="fixed_product">Fixed per Product</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="accent-indigo" />
                Active immediately
              </label>
            </div>
            <div className="flex gap-3 justify-end px-6 py-4 border-t border-stone/20">
              <Btn variant="secondary" size="sm" onClick={() => setShowModal(false)}>Cancel</Btn>
              <Btn size="sm" onClick={saveCoupon} disabled={saving}>{saving ? "Saving…" : "Create Coupon"}</Btn>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete coupon?"
        message="This will permanently delete this coupon. It cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => confirmDelete && deleteCoupon(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </PageShell>
  );
}
