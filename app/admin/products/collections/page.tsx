"use client";

import { useState, useEffect, useCallback } from "react";
import { PageShell, PageHeader, SectionCard, Btn, useToast, LoadingSpinner } from "@/components/admin/Shared";
import ImageUploader from "@/components/admin/ImageUploader";
import { Layers, Plus, Trash2, Edit3, Image as ImageIcon, ExternalLink } from "lucide-react";

interface Collection {
  id?: string;
  name: string;
  slug: string;
  desc?: string;
  image?: string;
}

export default function CollectionsPage() {
  const { addToast } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    desc: "",
    image: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85"
  });
  const [saving, setSaving] = useState(false);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/collections");
      const data = await res.json();
      if (data.collections) {
        setCollections(data.collections);
      }
    } catch {
      addToast("Failed to load collections", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleNameChange = (nameVal: string) => {
    setForm((prev) => ({
      ...prev,
      name: nameVal,
      slug: editingId ? prev.slug : nameVal.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      addToast("Collection name is required.", "error");
      return;
    }

    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const payload = editingId ? { id: editingId, ...form } : form;

      const res = await fetch("/api/admin/collections", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        addToast(editingId ? "Collection updated!" : "Collection created successfully!");
        setForm({
          name: "",
          slug: "",
          desc: "",
          image: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85"
        });
        setEditingId(null);
        fetchCollections();
      } else {
        addToast(data.error || "Failed to save collection.", "error");
      }
    } catch {
      addToast("Network error saving collection.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (col: Collection) => {
    setEditingId(col.id || col.slug);
    setForm({
      name: col.name,
      slug: col.slug,
      desc: col.desc || "",
      image: col.image || "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85"
    });
  };

  const handleDelete = async (col: Collection) => {
    const targetId = col.id || col.slug;
    if (!confirm(`Are you sure you want to delete collection "${col.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/collections?id=${encodeURIComponent(targetId)}`, { method: "DELETE" });
      if (res.ok) {
        addToast("Collection deleted.", "warning");
        fetchCollections();
      } else {
        addToast("Failed to delete collection.", "error");
      }
    } catch {
      addToast("Network error deleting collection.", "error");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Collections Manager"
        subtitle="Create &amp; manage featured store collections displayed on homepage and storefront"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create / Edit Form */}
        <SectionCard title={editingId ? "Edit Collection" : "Add New Collection"}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">
                Collection Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Floral Luxury Collection"
                className="w-full px-3 py-2 border border-stone-300 rounded-md bg-stone-50 text-sm focus:outline-hidden focus:border-amber-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">
                URL Slug *
              </label>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                placeholder="e.g. floral"
                className="w-full px-3 py-2 border border-stone-300 rounded-md bg-stone-50 text-xs font-mono focus:outline-hidden focus:border-amber-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={form.desc}
                onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))}
                placeholder="Bring nature's beauty into your bedroom with our stunning floral designs..."
                className="w-full px-3 py-2 border border-stone-300 rounded-md bg-stone-50 text-xs focus:outline-hidden focus:border-amber-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">
                Collection Cover Image
              </label>
              <ImageUploader
                currentImage={form.image}
                onImageUploaded={(url: string) => setForm((p) => ({ ...p, image: url }))}
                label="Upload Collection Image"
              />
            </div>

            <div className="flex gap-2 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      name: "",
                      slug: "",
                      desc: "",
                      image: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85"
                    });
                  }}
                  className="px-4 py-2 text-xs font-bold border border-stone-300 rounded-md text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex-1 justify-center px-4 py-2 text-xs font-bold bg-[#12192c] text-white rounded-md hover:bg-[#1c2744] disabled:opacity-50"
              >
                {saving ? "Saving…" : editingId ? "Update Collection" : "Create Collection"}
              </button>
            </div>
          </form>
        </SectionCard>

        {/* All Collections List */}
        <SectionCard title="All Collections" className="lg:col-span-2">
          {loading ? (
            <LoadingSpinner />
          ) : collections.length === 0 ? (
            <div className="py-12 text-center text-stone-500 text-sm">
              No collections found. Use the form on the left to create your first collection.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {collections.map((c) => (
                <div
                  key={c.id || c.slug}
                  className="bg-stone-50 border border-stone-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="relative h-40 bg-stone-200">
                    <img
                      src={c.image || "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85"}
                      alt={c.name}
                      className="w-full h-full object-cover"
                    />
                    <a
                      href={`/collections/${c.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-md text-xs backdrop-blur-xs transition-colors"
                      title="Preview on Storefront"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-serif font-bold text-stone-900 text-base">{c.name}</h3>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                          /{c.slug}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2">{c.desc || "No description provided."}</p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200/60 mt-3">
                      <button
                        onClick={() => handleEdit(c)}
                        className="px-3 py-1 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-md text-xs font-semibold flex items-center gap-1"
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="p-1.5 text-stone-400 hover:text-red-600 rounded-md transition-colors"
                        title="Delete collection"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}
