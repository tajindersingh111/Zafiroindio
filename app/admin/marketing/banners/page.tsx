"use client";

import { useEffect, useState } from "react";
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

export default function BannersPage() {
  const { addToast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ type: "banner", image: "", heading: "", subheading: "", ctaText: "", ctaUrl: "", startDate: "", endDate: "" });

  useEffect(() => {
    fetchBanners();
  }, []);

  function fetchBanners() {
    setLoading(true);
    fetch("/api/admin/banners")
      .then((r) => r.json())
      .then((data) => {
        setBanners(data);
        setLoading(false);
      });
  }

  async function toggleStatus(ban: Banner) {
    const res = await fetch("/api/admin/banners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ban.id, isActive: !ban.isActive })
    });
    if (res.ok) {
      addToast(`Banner status updated.`);
      fetchBanners();
    }
  }

  async function handleAddBanner(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      addToast(`Banner added successfully.`);
      setForm({ type: "banner", image: "", heading: "", subheading: "", ctaText: "", ctaUrl: "", startDate: "", endDate: "" });
      setShowAddForm(false);
      fetchBanners();
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Promo Banners Manager"
        subtitle="Manage homepage slider assets, promotional sections, and CTA announcements."
        action={<Btn size="sm" onClick={() => setShowAddForm(!showAddForm)}>{showAddForm ? "View Banners" : "Create Asset"}</Btn>}
      />

      {loading ? (
        <LoadingSpinner />
      ) : showAddForm ? (
        <SectionCard title="Create New Banner Asset">
          <form onSubmit={handleAddBanner} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">Asset Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder"
                >
                  <option value="banner">Homepage Main Slider Banner</option>
                  <option value="announcement">Announcement Bar Text</option>
                  <option value="promotion">Promo Grid Image</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <ImageUploader
                  label="Banner / Promo Image (Auto-Converted to WebP)"
                  currentImage={form.image}
                  onImageUploaded={(webpUrl) => setForm({ ...form, image: webpUrl })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">Heading / Text</label>
                <input
                  type="text"
                  required
                  value={form.heading}
                  onChange={(e) => setForm({ ...form, heading: e.target.value })}
                  className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">Subheading / Description</label>
                <input
                  type="text"
                  value={form.subheading}
                  onChange={(e) => setForm({ ...form, subheading: e.target.value })}
                  className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">CTA Button Text</label>
                <input
                  type="text"
                  placeholder="e.g. Shop Now"
                  value={form.ctaText}
                  onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                  className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">CTA Link Destination URL</label>
                <input
                  type="text"
                  placeholder="e.g. /shop"
                  value={form.ctaUrl}
                  onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">Active From</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1">Active To</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder"
                />
              </div>
            </div>
            <Btn type="submit">Publish Asset</Btn>
          </form>
        </SectionCard>
      ) : (
        <SectionCard title="Homepage Promo & Banner Assets">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone/20 bg-paper/50">
                {["Heading", "Type", "CTA Destination", "Active Range", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {banners.map((b) => (
                <tr key={b.id} className="border-b border-stone/10 last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">{b.heading}</td>
                  <td className="px-4 py-3 capitalize text-xs text-stone font-semibold">{b.type}</td>
                  <td className="px-4 py-3 text-xs font-mono">{b.ctaUrl || "N/A"}</td>
                  <td className="px-4 py-3 text-xs text-stone">{b.startDate || "Always"} to {b.endDate || "Always"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${b.isActive ? "bg-green-700/10 text-green-800" : "bg-stone/20 text-stone"}`}>
                      {b.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(b)} className="text-xs text-indigo hover:underline font-semibold">
                      {b.isActive ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}
    </PageShell>
  );
}
