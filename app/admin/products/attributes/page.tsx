"use client";

import { useEffect, useState, useCallback } from "react";
import { PageShell, PageHeader, SectionCard, Btn, useToast, LoadingSpinner } from "@/components/admin/Shared";
import { Trash2, Pencil, X, Plus, Check } from "lucide-react";

interface Attribute { id: string; name: string; values: string[]; }

const inputCls = "w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-madder/40";
const tagInputCls = "flex-1 min-w-[120px] px-2 py-1 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-indigo/40";

interface EditState {
  name: string;
  values: string[];
  newVal: string;
}

export default function AttributesPage() {
  const { addToast } = useToast();
  const [attrs, setAttrs] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", values: "" });
  const [saving, setSaving] = useState(false);
  // editId → which attribute is being edited
  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: "", values: [], newVal: "" });
  const [editSaving, setEditSaving] = useState(false);

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
    const res = await fetch("/api/admin/products/attributes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, values }),
    });
    if (res.ok) { addToast("Attribute created."); setForm({ name: "", values: "" }); fetch_(); }
    else addToast("Failed.", "error");
    setSaving(false);
  }

  async function del(id: string) {
    if (!confirm("Are you sure you want to delete this attribute?")) return;
    const res = await fetch(`/api/admin/products/attributes/${id}`, { method: "DELETE" });
    if (res.ok) { addToast("Attribute deleted.", "warning"); fetch_(); }
    else addToast("Failed to delete attribute.", "error");
  }

  function startEdit(a: Attribute) {
    setEditId(a.id);
    setEditState({ name: a.name, values: [...a.values], newVal: "" });
  }

  function cancelEdit() {
    setEditId(null);
    setEditState({ name: "", values: [], newVal: "" });
  }

  function addEditValue() {
    const v = editState.newVal.trim();
    if (!v) return;
    if (editState.values.includes(v)) { addToast(`"${v}" already exists.`, "error"); return; }
    setEditState((p) => ({ ...p, values: [...p.values, v], newVal: "" }));
  }

  function removeEditValue(v: string) {
    setEditState((p) => ({ ...p, values: p.values.filter((x) => x !== v) }));
  }

  async function saveEdit() {
    if (!editState.name.trim()) { addToast("Name is required.", "error"); return; }
    setEditSaving(true);
    const res = await fetch(`/api/admin/products/attributes/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editState.name.trim(), values: editState.values }),
    });
    if (res.ok) {
      addToast("Attribute updated.");
      cancelEdit();
      fetch_();
    } else {
      addToast("Failed to update attribute.", "error");
    }
    setEditSaving(false);
  }

  return (
    <PageShell>
      <PageHeader title="Attributes" subtitle="Define product attributes like size, color, material" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Attribute */}
        <SectionCard title="Add Attribute">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className={inputCls}
                placeholder="e.g. Size"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Values (comma separated)</label>
              <input
                value={form.values}
                onChange={(e) => setForm((p) => ({ ...p, values: e.target.value }))}
                className={inputCls}
                placeholder="S, M, L, XL"
              />
            </div>
            <Btn onClick={save} disabled={saving} className="w-full justify-center">
              {saving ? "Saving…" : "Add Attribute"}
            </Btn>
          </div>
        </SectionCard>

        {/* All Attributes */}
        <SectionCard title="All Attributes" className="lg:col-span-2">
          {loading ? <LoadingSpinner /> : (
            <div className="space-y-4">
              {attrs.map((a) => (
                <div key={a.id} className="border border-stone/20 rounded-sm p-4">
                  {editId === a.id ? (
                    /* ── EDIT MODE ── */
                    <div className="space-y-4">
                      {/* Name */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">Attribute Name</label>
                        <input
                          value={editState.name}
                          onChange={(e) => setEditState((p) => ({ ...p, name: e.target.value }))}
                          className={inputCls}
                          autoFocus
                        />
                      </div>

                      {/* Values as removable chips */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-2">Values</label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {editState.values.map((v) => (
                            <span
                              key={v}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo/10 border border-indigo/30 rounded-full text-xs text-ink"
                            >
                              {v}
                              <button
                                onClick={() => removeEditValue(v)}
                                className="text-stone hover:text-madder transition-colors ml-0.5"
                                title={`Remove ${v}`}
                              >
                                <X size={11} />
                              </button>
                            </span>
                          ))}
                          {editState.values.length === 0 && (
                            <span className="text-xs text-stone italic">No values yet — add some below</span>
                          )}
                        </div>

                        {/* Add new value input */}
                        <div className="flex gap-2">
                          <input
                            value={editState.newVal}
                            onChange={(e) => setEditState((p) => ({ ...p, newVal: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEditValue(); } }}
                            className={tagInputCls}
                            placeholder="Add value… (press Enter)"
                          />
                          <button
                            onClick={addEditValue}
                            className="flex items-center gap-1 px-3 py-1 border border-stone/30 rounded-sm text-xs text-ink hover:bg-paper-deep transition-colors"
                          >
                            <Plus size={13} /> Add
                          </button>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-1">
                        <Btn size="sm" onClick={saveEdit} disabled={editSaving}>
                          <Check size={13} /> {editSaving ? "Saving…" : "Save Changes"}
                        </Btn>
                        <Btn size="sm" variant="secondary" onClick={cancelEdit} disabled={editSaving}>
                          Cancel
                        </Btn>
                      </div>
                    </div>
                  ) : (
                    /* ── VIEW MODE ── */
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink mb-2">{a.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {a.values.map((v) => (
                            <span key={v} className="px-2.5 py-1 bg-paper border border-stone/30 rounded-full text-xs text-stone">
                              {v}
                            </span>
                          ))}
                          {a.values.length === 0 && <span className="text-xs text-stone italic">No values</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(a)}
                          className="p-1.5 text-stone hover:text-indigo transition-colors"
                          title="Edit Attribute"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => del(a.id)}
                          className="p-1.5 text-stone hover:text-madder transition-colors"
                          title="Delete Attribute"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )}
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
