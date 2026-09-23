"use client";

import { useEffect, useState, useCallback } from "react";
import { PageShell, PageHeader, SectionCard, Btn, useToast, LoadingSpinner } from "@/components/admin/Shared";
import { Trash2 } from "lucide-react";

interface Attribute { id: string; name: string; values: string[]; }

const inputCls = "w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-madder/40";

export default function AttributesPage() {
  const { addToast } = useToast();
  const [attrs, setAttrs] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", values: "" });
  const [saving, setSaving] = useState(false);

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/admin/products/attributes");
    const d = await res.json();
    setAttrs(d.attributes ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function save() {
    if (!form.name.trim()) { addToast("Name is required.", "error"); return; }
    setSaving(true);
    const values = form.values.split(",").map((v) => v.trim()).filter(Boolean);
    const res = await fetch("/api/admin/products/attributes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, values }) });
    if (res.ok) { addToast("Attribute created."); setForm({ name: "", values: "" }); fetch_(); }
    else addToast("Failed.", "error");
    setSaving(false);
  }

  async function del(id: string) {
    if (!confirm("Are you sure you want to delete this attribute?")) return;
    const res = await fetch(`/api/admin/products/attributes/${id}`, { method: "DELETE" });
    if (res.ok) {
      addToast("Attribute deleted.", "warning");
      fetch_();
    } else {
      addToast("Failed to delete attribute.", "error");
    }
  }

  return (
    <PageShell>
      <PageHeader title="Attributes" subtitle="Define product attributes like size, color, material" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Add Attribute">
          <div className="space-y-4">
            <div><label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Name</label><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="e.g. Size" /></div>
            <div><label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Values (comma separated)</label><input value={form.values} onChange={(e) => setForm((p) => ({ ...p, values: e.target.value }))} className={inputCls} placeholder="Queen, King, 2x3 ft" /></div>
            <Btn onClick={save} disabled={saving} className="w-full justify-center">{saving ? "Saving…" : "Add Attribute"}</Btn>
          </div>
        </SectionCard>
        <SectionCard title="All Attributes" className="lg:col-span-2">
          {loading ? <LoadingSpinner /> : (
            <div className="space-y-4">
              {attrs.map((a) => (
                <div key={a.id} className="border border-stone/20 rounded-sm p-4 flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-ink mb-2">{a.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {a.values.map((v) => (
                        <span key={v} className="px-2.5 py-1 bg-paper border border-stone/30 rounded-full text-xs text-stone">{v}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => del(a.id)}
                    className="p-1.5 text-stone hover:text-madder transition-colors"
                    title="Delete Attribute"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {attrs.length === 0 && <p className="text-center text-stone py-6">No attributes yet.</p>}
            </div>
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}
