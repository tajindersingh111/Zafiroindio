"use client";

import { useEffect, useState, useCallback } from "react";
import { PageShell, PageHeader, SectionCard, Btn, useToast, LoadingSpinner } from "@/components/admin/Shared";

interface Category { id: string; name: string; slug: string; description?: string; }
interface Brand { id: string; name: string; description?: string; }
interface Attribute { id: string; name: string; values: string[]; }

const inputCls = "w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-madder/40";

export default function CategoriesPage() {
  const { addToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/admin/products/categories");
    const d = await res.json();
    setCategories(d.categories ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function save() {
    if (!form.name.trim()) { addToast("Name is required.", "error"); return; }
    setSaving(true);
    const res = await fetch("/api/admin/products/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { addToast("Category created."); setForm({ name: "", description: "" }); fetch_(); }
    else addToast("Failed.", "error");
    setSaving(false);
  }

  async function del(id: string) {
    await fetch(`/api/admin/products/categories/${id}`, { method: "DELETE" });
    addToast("Category deleted.", "warning"); fetch_();
  }

  return (
    <PageShell>
      <PageHeader title="Categories" subtitle={`${categories.length} categories`} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Add Category">
          <div className="space-y-4">
            <div><label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Name</label><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="e.g. Bedsheets" /></div>
            <div><label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Description</label><textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className={inputCls} placeholder="Optional…" /></div>
            <Btn onClick={save} disabled={saving} className="w-full justify-center">{saving ? "Saving…" : "Add Category"}</Btn>
          </div>
        </SectionCard>
        <SectionCard title="All Categories" className="lg:col-span-2">
          {loading ? <LoadingSpinner /> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-stone/20 bg-paper/50">{["Name", "Slug", ""].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>)}</tr></thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/50">
                    <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-stone">{c.slug}</td>
                    <td className="px-4 py-3"><button onClick={() => del(c.id)} className="text-xs text-madder hover:underline">Delete</button></td>
                  </tr>
                ))}
                {categories.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-stone">No categories yet.</td></tr>}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}
