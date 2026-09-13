"use client";

import { useEffect, useState, useCallback } from "react";
import { PageShell, PageHeader, SectionCard, Btn, useToast, LoadingSpinner } from "@/components/admin/Shared";

interface Brand { id: string; name: string; slug: string; description?: string; }

const inputCls = "w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-madder/40";

export default function BrandsPage() {
  const { addToast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/admin/products/brands");
    const d = await res.json();
    setBrands(d.brands ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function save() {
    if (!form.name.trim()) { addToast("Name is required.", "error"); return; }
    setSaving(true);
    const res = await fetch("/api/admin/products/brands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { addToast("Brand created."); setForm({ name: "", description: "" }); fetch_(); }
    else addToast("Failed.", "error");
    setSaving(false);
  }

  return (
    <PageShell>
      <PageHeader title="Brands" subtitle={`${brands.length} brands`} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Add Brand">
          <div className="space-y-4">
            <div><label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Name</label><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="e.g. Zafiro Indio" /></div>
            <div><label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Description</label><textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className={inputCls} placeholder="Optional…" /></div>
            <Btn onClick={save} disabled={saving} className="w-full justify-center">{saving ? "Saving…" : "Add Brand"}</Btn>
          </div>
        </SectionCard>
        <SectionCard title="All Brands" className="lg:col-span-2">
          {loading ? <LoadingSpinner /> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-stone/20 bg-paper/50">{["Name", "Slug"].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>)}</tr></thead>
              <tbody>
                {brands.map((b) => (
                  <tr key={b.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/50">
                    <td className="px-4 py-3 font-medium text-ink">{b.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-stone">{b.slug}</td>
                  </tr>
                ))}
                {brands.length === 0 && <tr><td colSpan={2} className="px-4 py-8 text-center text-stone">No brands yet.</td></tr>}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}
