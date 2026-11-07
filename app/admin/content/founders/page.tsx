"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, Btn, useToast, LoadingSpinner, ConfirmDialog, EmptyState } from "@/components/admin/Shared";
import ImageUploader from "@/components/admin/ImageUploader";
import type { Founder } from "@/lib/storefront/founders";

const inputCls = "w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-madder/40";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5";

type Form = { id?: string; name: string; role: string; title: string; blurb: string; photo: string; active: boolean };
const EMPTY: Form = { name: "", role: "", title: "", blurb: "", photo: "", active: true };

export default function FoundersPage() {
  const { addToast } = useToast();
  const [founders, setFounders] = useState<Founder[]>([]);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Founder | null>(null);
  // Remounts the uploader so its preview follows the form.
  const [formKey, setFormKey] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/content/founders");
    const d = await res.json().catch(() => ({}));
    setFounders(d.founders ?? []);
    setUsingDefaults(!!d.usingDefaults);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const reset = () => { setForm(EMPTY); setFormKey((k) => k + 1); };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/content/founders", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { addToast(d.error || "Could not save.", "error"); return; }
    addToast(form.id ? "Founder updated. The About page refreshes within a minute." : "Founder added.");
    reset();
    load();
  }

  async function move(f: Founder, dir: "up" | "down") {
    await fetch("/api/admin/content/founders", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: f.id, move: dir }) });
    load();
  }

  async function remove(f: Founder) {
    setDeleting(null);
    const res = await fetch(`/api/admin/content/founders?id=${encodeURIComponent(f.id)}`, { method: "DELETE" });
    if (res.ok) { addToast("Founder removed."); if (form.id === f.id) reset(); load(); }
    else addToast("Could not remove.", "error");
  }

  const edit = (f: Founder) => {
    setForm({ id: f.id, name: f.name, role: f.role, title: f.title ?? "", blurb: f.blurb, photo: f.photo, active: f.active !== false });
    setFormKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <PageShell>
      <PageHeader
        title="Founders"
        subtitle="The people shown on the About page. Replace the placeholder photos with your own — the first save turns the placeholders into real, editable rows."
      />

      {usingDefaults && !loading && (
        <div className="mb-6 rounded-sm border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">These are placeholders.</strong> The About page is currently showing the two
          starter founders below, using the images in <code>public/editorial/</code>. Click <em>Edit</em> on either one to
          upload a real photo and change the wording — nothing is lost, they simply become yours.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <SectionCard title={form.id ? "Edit Founder" : "Add Founder"} className="lg:col-span-2">
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className={labelCls}>Photo</label>
              <ImageUploader
                key={formKey}
                label="Portrait (4:5 works best)"
                currentImage={form.photo}
                onImageUploaded={(url) => setForm((f) => ({ ...f, photo: url }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Name</label>
                <input required maxLength={80} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="e.g. Neelu Singh" />
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <input required maxLength={60} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className={inputCls} placeholder="e.g. Founder" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Title <span className="normal-case font-normal text-stone">(optional)</span></label>
              <input maxLength={80} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="e.g. Fashion & Design Analyst" />
            </div>
            <div>
              <label className={labelCls}>Short description <span className="normal-case font-normal">({form.blurb.length}/600)</span></label>
              <textarea required maxLength={600} rows={5} value={form.blurb} onChange={(e) => setForm((f) => ({ ...f, blurb: e.target.value }))} className={inputCls} placeholder="Two or three lines: their experience, what they bring to the brand." />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
              Show on the About page
            </label>
            <div className="flex gap-2">
              <Btn type="submit" disabled={saving} className="flex-1 justify-center">{saving ? "Saving…" : form.id ? "Save Changes" : "Add Founder"}</Btn>
              {form.id && <Btn variant="secondary" onClick={reset}>Cancel</Btn>}
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Founders" subtitle={`${founders.length} shown · in this order on the About page`} className="lg:col-span-3">
          {loading ? <LoadingSpinner /> : founders.length === 0 ? (
            <EmptyState title="No founders" description="The About page hides the founders section until you add someone." />
          ) : (
            <ul className="divide-y divide-stone/10">
              {founders.map((f, i) => (
                <li key={f.id} className="flex items-center gap-4 py-3">
                  <img src={f.photo} alt="" className="w-14 h-16 object-cover rounded-sm border border-stone/20" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink text-sm">
                      {f.name} {f.active === false && <span className="text-[10px] uppercase tracking-wide text-stone ml-1">Hidden</span>}
                    </div>
                    <div className="text-xs text-stone">{[f.role, f.title].filter(Boolean).join(" · ")}</div>
                    <div className="text-xs text-ink-soft truncate mt-0.5">{f.blurb}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Btn size="sm" variant="ghost" disabled={i === 0} onClick={() => move(f, "up")}>↑</Btn>
                    <Btn size="sm" variant="ghost" disabled={i === founders.length - 1} onClick={() => move(f, "down")}>↓</Btn>
                    <Btn size="sm" variant="secondary" onClick={() => edit(f)}>Edit</Btn>
                    <Btn size="sm" variant="danger" onClick={() => setDeleting(f)}>Delete</Btn>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Remove founder?"
        message={`${deleting?.name ?? ""} will no longer appear on the About page.`}
        confirmLabel="Remove"
        danger
        onConfirm={() => deleting && remove(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </PageShell>
  );
}
