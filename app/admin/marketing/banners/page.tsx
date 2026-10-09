"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, Btn, useToast } from "@/components/admin/Shared";
import ImageUploader from "@/components/admin/ImageUploader";

interface Banner {
  id: string;
  type: string;
  image: string;
  heading: string;
  subheading: string;
  ctaText: string;
  ctaUrl: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

type Form = Omit<Banner, "id" | "isActive">;
const EMPTY: Form = { type: "banner", image: "", heading: "", subheading: "", ctaText: "", ctaUrl: "", startDate: "", endDate: "" };
const inputCls = "w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder";
const labelCls = "block text-xs font-semibold uppercase tracking-wider text-stone mb-1";

function statusOf(b: Banner, today: string): { label: string; cls: string } {
  if (!b.isActive) return { label: "Disabled", cls: "bg-stone/20 text-stone" };
  if (b.endDate && b.endDate < today) return { label: "Expired", cls: "bg-madder/10 text-madder" };
  if (b.startDate && b.startDate > today) return { label: "Scheduled", cls: "bg-amber-500/15 text-amber-800" };
  return { label: "Live", cls: "bg-green-700/10 text-green-800" };
}

export default function BannersPage() {
  const { addToast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const fetchBanners = useCallback(() => {
    fetch("/api/admin/banners")
      .then((r) => r.json())
      .then((data) => setBanners(Array.isArray(data) ? data : []))
      .catch(() => addToast("Could not load banners.", "error"))
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  async function send(method: "POST" | "PATCH" | "DELETE", body?: object, query = "") {
    const res = await fetch(`/api/admin/banners${query}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) addToast(data.error || "Something went wrong.", "error");
    return res.ok;
  }

  function startEdit(b?: Banner) {
    setEditing(b ? b.id : "new");
    setForm(b ? { type: b.type === "announcement" ? "announcement" : "banner", image: b.image || "", heading: b.heading || "", subheading: b.subheading || "", ctaText: b.ctaText || "", ctaUrl: b.ctaUrl || "", startDate: b.startDate || "", endDate: b.endDate || "" } : EMPTY);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = editing === "new" ? await send("POST", form) : await send("PATCH", { id: editing, ...form });
    setSaving(false);
    if (ok) {
      addToast(editing === "new" ? "Banner published." : "Banner updated.");
      setEditing(null);
      fetchBanners();
    }
  }

  async function act(b: Banner, action: "toggle" | "up" | "down" | "delete") {
    if (action === "delete" && !window.confirm(`Delete "${b.heading}"? This cannot be undone.`)) return;
    const ok =
      action === "toggle" ? await send("PATCH", { id: b.id, isActive: !b.isActive })
      : action === "delete" ? await send("DELETE", undefined, `?id=${encodeURIComponent(b.id)}`)
      : await send("PATCH", { id: b.id, move: action });
    if (ok) fetchBanners();
  }

  const isBanner = form.type === "banner";

  return (
    <PageShell>
      <PageHeader
        title="Banners & Announcements"
        subtitle="Homepage slider banners (shown in this order) and the announcement bar at the top of every page."
        action={editing ? <Btn size="sm" variant="secondary" onClick={() => setEditing(null)}>← Back to list</Btn> : <Btn size="sm" onClick={() => startEdit()}>+ New banner</Btn>}
      />

      {loading ? (
        <LoadingSpinner />
      ) : editing ? (
        <SectionCard title={editing === "new" ? "New banner" : "Edit banner"}>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                  <option value="banner">Homepage slider banner</option>
                  <option value="announcement">Announcement bar text</option>
                </select>
              </div>
              <div />
              {isBanner && (
                <div className="md:col-span-2">
                  <ImageUploader label="Banner image (auto-converted to WebP)" currentImage={form.image} onImageUploaded={(url) => setForm({ ...form, image: url })} />
                  <p className="text-xs text-stone mt-1.5">Best: 1920 × 800 px landscape with the product on the <strong>right</strong> half. The left side is covered by the heading text.</p>
                </div>
              )}
              <div className={isBanner ? "" : "md:col-span-2"}>
                <label className={labelCls}>{isBanner ? "Heading" : "Announcement text"}</label>
                <input type="text" required maxLength={200} value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} className={inputCls} />
              </div>
              {isBanner && (
                <>
                  <div>
                    <label className={labelCls}>Subheading</label>
                    <input type="text" maxLength={300} value={form.subheading} onChange={(e) => setForm({ ...form, subheading: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Button text</label>
                    <input type="text" placeholder="Shop Collection" value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Button link</label>
                    <input type="text" placeholder="/collections/quilted-bedcovers" value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} className={inputCls} />
                    <p className="text-[11px] text-stone mt-1">e.g. /shop, /collections/&lt;slug&gt;, /products/&lt;slug&gt;. A link to a page that doesn&apos;t exist sends visitors to /shop.</p>
                  </div>
                </>
              )}
              <div>
                <label className={labelCls}>Show from</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Show until</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2">
              <Btn type="submit" disabled={saving}>{saving ? "Saving…" : editing === "new" ? "Publish" : "Save changes"}</Btn>
              <Btn variant="secondary" onClick={() => setEditing(null)}>Cancel</Btn>
            </div>
          </form>
        </SectionCard>
      ) : (
        <SectionCard title={`${banners.length} item${banners.length === 1 ? "" : "s"}`}>
          {banners.length === 0 ? (
            <p className="text-sm text-stone">No banners yet. The homepage shows the default brand photo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone/20 bg-paper/50">
                    {["Order", "Image", "Heading", "Type", "Button link", "Dates", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {banners.map((b, i) => {
                    const st = statusOf(b, today);
                    return (
                      <tr key={b.id} className="border-b border-stone/10 last:border-0 align-middle">
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => act(b, "up")} className="text-stone hover:text-ink disabled:opacity-30 leading-none">▲</button>
                            <button type="button" aria-label="Move down" disabled={i === banners.length - 1} onClick={() => act(b, "down")} className="text-stone hover:text-ink disabled:opacity-30 leading-none">▼</button>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {b.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={b.image} alt="" className="w-24 h-10 object-cover rounded-sm border border-stone/20" />
                          ) : (
                            <span className="text-[10px] text-stone">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-semibold text-ink max-w-[260px]">{b.heading}</td>
                        <td className="px-3 py-2 capitalize text-xs text-stone font-semibold">{b.type}</td>
                        <td className="px-3 py-2 text-xs font-mono">{b.ctaUrl || "—"}</td>
                        <td className="px-3 py-2 text-xs text-stone whitespace-nowrap">{b.startDate || "Always"} → {b.endDate || "Always"}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap space-x-3">
                          <button type="button" onClick={() => startEdit(b)} className="text-xs text-indigo hover:underline font-semibold">Edit</button>
                          <button type="button" onClick={() => act(b, "toggle")} className="text-xs text-indigo hover:underline font-semibold">{b.isActive ? "Disable" : "Enable"}</button>
                          <button type="button" onClick={() => act(b, "delete")} className="text-xs text-madder hover:underline font-semibold">Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}
    </PageShell>
  );
}
