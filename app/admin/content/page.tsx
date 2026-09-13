"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, LoadingSpinner, Btn, useToast } from "@/components/admin/Shared";

interface ContentAsset {
  id: string;
  type: string;
  heading: string;
  subheading: string;
  ctaText: string;
  ctaUrl: string;
  isActive: boolean;
}

export default function ContentManagementPage() {
  const { addToast } = useToast();
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(true);

  useEffect(() => {
    fetchAssets();
  }, []);

  function fetchAssets() {
    setLoading(true);
    fetch("/api/admin/banners")
      .then((r) => r.json())
      .then((data) => {
        setAssets(data);
        const ann = data.find((a: any) => a.type === "announcement");
        if (ann) {
          setAnnouncementText(ann.heading);
          setAnnouncementActive(ann.isActive);
        }
        setLoading(false);
      });
  }

  async function handleUpdateAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    const ann = assets.find((a) => a.type === "announcement");
    if (!ann) return;

    const res = await fetch("/api/admin/banners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ann.id, heading: announcementText, isActive: announcementActive })
    });
    if (res.ok) {
      addToast("Announcement bar updated successfully.");
      fetchAssets();
    }
  }

  return (
    <PageShell>
      <PageHeader title="Content & Announcement Manager" subtitle="Manage homepage promotional sliders, site-wide announcements, and layout blocks." />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          {/* Announcement Bar */}
          <SectionCard title="Announcement Bar Config">
            <form onSubmit={handleUpdateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-1.5">Announcement Banner Text</label>
                <input
                  type="text"
                  required
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className="w-full px-3 py-2 border border-stone/30 bg-paper text-sm text-ink focus:outline-none focus:ring-1 focus:ring-madder"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ann-active"
                  checked={announcementActive}
                  onChange={(e) => setAnnouncementActive(e.target.checked)}
                  className="rounded-sm border-stone/30 text-indigo focus:ring-indigo/40"
                />
                <label htmlFor="ann-active" className="text-xs font-semibold text-ink uppercase tracking-wider">Show announcement bar on website</label>
              </div>

              <Btn type="submit">Update Announcement</Btn>
            </form>
          </SectionCard>

          {/* Banner items */}
          <SectionCard title="Promotional Banners List">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone/20 bg-paper/50">
                  {["Banner Heading", "Type", "CTA Destination", "Status"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.filter((a) => a.type !== "announcement").map((asset) => (
                  <tr key={asset.id} className="border-b border-stone/10 last:border-0">
                    <td className="px-4 py-3 font-semibold text-ink">{asset.heading}</td>
                    <td className="px-4 py-3 capitalize text-xs text-stone font-semibold">{asset.type}</td>
                    <td className="px-4 py-3 text-xs font-mono">{asset.ctaUrl || "N/A"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${asset.isActive ? "bg-green-700/10 text-green-800" : "bg-stone/20 text-stone"}`}>
                        {asset.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </div>
      )}
    </PageShell>
  );
}
