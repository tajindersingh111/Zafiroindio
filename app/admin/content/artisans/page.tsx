"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, Btn, useToast, LoadingSpinner, ConfirmDialog, EmptyState } from "@/components/admin/Shared";
import ImageUploader from "@/components/admin/ImageUploader";
import type { Artisan } from "@/lib/storefront/artisans";

const inputCls = "w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-madder/40";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5";

type Form = { id?: string; name: string; craft: string; place: string; years: string; story: string; photo: string; active: boolean };
const EMPTY: Form = { name: "", craft: "", place: "", years: "", story: "", photo: "", active: true };

export default function ArtisansPage() {
  const { addToast } = useToast();
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Artisan | null>(null);
  // Remounts the uploader so its preview follows the form.
  const [formKey, setFormKey] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/content/artisans");
    const d = await res.json().catch(() => ({}));
    setArtisans(d.artisans ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const reset = () => { setForm(EMPTY); setFormKey((k) => k + 1); };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/content/artisans", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, years: form.years ? Number(form.years) : undefined }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { addToast(d.error || "Could not save.", "error"); return; }
    addToast(form.id ? "Artisan updated." : "Artisan added. It now shows on product pages.");
    reset();
    load();
  }

  async function move(a: Artisan, dir: "up" | "down") {
    await fetch("/api/admin/content/artisans", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, move: dir }) });
    load();
  }

  async function remove(a: Artisan) {
    setDeleting(null);
    const res = await fetch(`/api/admin/content/artisans?id=${encodeURIComponent(a.id)}`, { method: "DELETE" });
    if (res.ok) { addToast("Artisan removed."); if (form.id === a.id) reset(); load(); }
    else addToast("Could not remove.", "error");
  }

  const edit = (a: Artisan) => {
    setForm({ id: a.id, name: a.name, craft: a.craft, place: a.place ?? "", years: a.years ? String(a.years) : "", story: a.story, photo: a.photo, active: a.active !== false });
    setFormKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <PageShell>
      <PageHeader title="Artisans" subtitle="The makers shown in “Meet the Makers” on every product page. Use real people, real photos and their own words." />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <SectionCard title={form.id ? "Edit Artisan" : "Add Artisan"} className="lg:col-span-2">
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className={labelCls}>Photo</label>
              <ImageUploader key={formKey} label="Portrait (4:5 works best)" currentImage={form.photo} onImageUploaded={(url) => setForm((f) => ({ ...f, photo: url }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Name</label><input required maxLength={80} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Craft</label><input required maxLength={80} value={form.craft} onChange={(e) => setForm((f) => ({ ...f, craft: e.target.value }))} className={inputCls} placeholder="e.g. Block printer" /></div>
              <div><label className={labelCls}>Place</label><input maxLength={80} value={form.place} onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))} className={inputCls} placeholder="e.g. Sanganer, Jaipur" /></div>
              <div><label className={labelCls}>Years in craft</label><input type="number" min={1} max={99} value={form.years} onChange={(e) => setForm((f) => ({ ...f, years: e.target.value }))} className={inputCls} /></div>
            </div>
            <div>
              <label className={labelCls}>Story <span className="normal-case font-normal">({form.story.length}/900)</span></label>
              <textarea required maxLength={900} rows={5} value={form.story} onChange={(e) => setForm((f) => ({ ...f, story: e.target.value }))} className={inputCls} placeholder="Two or three lines in their words: how they learned the craft, what they love about it." />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
              Show on product pages
            </label>
            <div className="flex gap-2">
              <Btn type="submit" disabled={saving} className="flex-1 justify-center">{saving ? "Saving…" : form.id ? "Save Changes" : "Add Artisan"}</Btn>
              {form.id && <Btn variant="secondary" onClick={reset}>Cancel</Btn>}
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Artisans" subtitle={`${artisans.length} added · shown in this order`} className="lg:col-span-3">
          {loading ? <LoadingSpinner /> : artisans.length === 0 ? (
            <EmptyState title="No artisans yet" description="Until you add one, product pages show a short “How it’s made” section instead." />
          ) : (
            <ul className="divide-y divide-stone/10">
              {artisans.map((a, i) => (
                <li key={a.id} className="flex items-center gap-4 py-3">
                  <img src={a.photo} alt="" className="w-14 h-16 object-cover rounded-sm border border-stone/20" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink text-sm">{a.name} {a.active === false && <span className="text-[10px] uppercase tracking-wide text-stone ml-1">Hidden</span>}</div>
                    <div className="text-xs text-stone">{[a.craft, a.place, a.years ? `${a.years} yrs` : ""].filter(Boolean).join(" · ")}</div>
                    <div className="text-xs text-ink-soft truncate mt-0.5">{a.story}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Btn size="sm" variant="ghost" disabled={i === 0} onClick={() => move(a, "up")}>↑</Btn>
                    <Btn size="sm" variant="ghost" disabled={i === artisans.length - 1} onClick={() => move(a, "down")}>↓</Btn>
                    <Btn size="sm" variant="secondary" onClick={() => edit(a)}>Edit</Btn>
                    <Btn size="sm" variant="danger" onClick={() => setDeleting(a)}>Delete</Btn>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
      <ConfirmDialog
        open={!!deleting}
        title="Remove artisan?"
        message={`${deleting?.name ?? ""} will no longer appear on product pages.`}
        confirmLabel="Remove"
        danger
        onConfirm={() => deleting && remove(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </PageShell>
  );
}
