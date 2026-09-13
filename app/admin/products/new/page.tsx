"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { PageShell, PageHeader, Btn, SectionCard, useToast, LoadingSpinner, FilterSelect } from "@/components/admin/Shared";
import ImageUploader from "@/components/admin/ImageUploader";
import { v4 as uuidv4 } from "uuid";

interface Category { id: string; name: string; }
interface Brand { id: string; name: string; }
interface Attribute { id: string; name: string; values: string[]; }
interface Variation {
  id: string; sku: string; price: number; salePrice?: number;
  stock: number; stockStatus: string; weight?: number;
  attributes: { name: string; value: string }[];
}
interface ProductForm {
  name: string; slug: string; type: string; status: string;
  description: string; shortDescription: string; sku: string;
  price: number; salePrice?: number; mrp?: number; costPrice?: number;
  costBreakdown?: { fabricCost?: number; printingCost?: number; stitchingCost?: number; packagingCost?: number; otherCost?: number };
  images: string[];
  categoryId: string; brandId?: string; tags: string;
  weight?: number; stock: number; stockStatus: string; lowStockThreshold: number;
  taxClass: string; manageStock: boolean; backordersAllowed: boolean;
  codAllowed?: boolean; codShippingCharge?: number; freeShipping?: boolean;
  attributes: Record<string, string[]>;
  variations: Variation[];
}

const DEFAULT_FORM: ProductForm = {
  name: "", slug: "", type: "simple", status: "draft",
  description: "", shortDescription: "", sku: "",
  price: 0, stock: 0, stockStatus: "in_stock", lowStockThreshold: 10,
  taxClass: "standard", manageStock: true, backordersAllowed: false,
  codAllowed: true, codShippingCharge: undefined, freeShipping: false,
  images: [],
  categoryId: "", tags: "",
  attributes: {}, variations: [],
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-stone mb-1.5">
        {label}{required && <span className="text-madder ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-madder/40 focus:border-madder transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

export default function ProductFormPage({ params }: { params: Promise<{ id: string }> | undefined }) {
  const resolvedParams = params ? use(params) : null;
  const isEdit = !!resolvedParams?.id;
  const id = resolvedParams?.id;

  const router = useRouter();
  const { addToast } = useToast();
  const [form, setForm] = useState<ProductForm>(DEFAULT_FORM);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [allAttrs, setAllAttrs] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeAttr, setActiveAttr] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/products/categories").then((r) => r.json()),
      fetch("/api/admin/products/brands").then((r) => r.json()),
      fetch("/api/admin/products/attributes").then((r) => r.json()),
    ]).then(([catData, brandData, attrData]) => {
      setCategories(catData.categories ?? []);
      setBrands(brandData.brands ?? []);
      setAllAttrs(attrData.attributes ?? []);
    });

    if (isEdit && id) {
      fetch(`/api/admin/products/${id}`).then((r) => r.json()).then((d) => {
        if (d.product) {
          const p = d.product;
          setForm({
            name: p.name, slug: p.slug, type: p.type, status: p.status,
            description: p.description, shortDescription: p.shortDescription,
            sku: p.sku, price: p.price, salePrice: p.salePrice, mrp: p.mrp, costPrice: p.costPrice, costBreakdown: p.costBreakdown, images: p.images ?? [],
            categoryId: p.categoryId, brandId: p.brandId, tags: p.tags.join(", "),
            weight: p.weight, stock: p.stock, stockStatus: p.stockStatus,
            lowStockThreshold: p.lowStockThreshold, taxClass: p.taxClass,
            manageStock: p.manageStock, backordersAllowed: p.backordersAllowed,
            codAllowed: p.codAllowed ?? true, codShippingCharge: p.codShippingCharge, freeShipping: p.freeShipping ?? false,
            attributes: p.attributes, variations: p.variations,
          });
        }
        setLoading(false);
      });
    }
  }, [id, isEdit]);

  function set<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !isEdit) {
        next.slug = String(value).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      }
      return next;
    });
  }

  function addAttributeValues(attrName: string, values: string[]) {
    setForm((prev) => ({
      ...prev,
      attributes: { ...prev.attributes, [attrName]: values },
    }));
  }

  function removeAttribute(attrName: string) {
    setForm((prev) => {
      const attrs = { ...prev.attributes };
      delete attrs[attrName];
      return { ...prev, attributes: attrs };
    });
  }

  function generateVariations() {
    const attrKeys = Object.keys(form.attributes);
    if (!attrKeys.length) return;
    const combos: { name: string; value: string }[][] = [];
    function recurse(depth: number, current: { name: string; value: string }[]) {
      if (depth === attrKeys.length) { combos.push([...current]); return; }
      const key = attrKeys[depth];
      for (const v of form.attributes[key]) {
        recurse(depth + 1, [...current, { name: key, value: v }]);
      }
    }
    recurse(0, []);
    const variations: Variation[] = combos.map((combo) => ({
      id: uuidv4(),
      sku: `${form.sku}-${combo.map((a) => a.value.slice(0, 3).toUpperCase()).join("-")}`,
      price: form.price,
      stock: 0,
      stockStatus: "out_of_stock",
      attributes: combo,
    }));
    setForm((prev) => ({ ...prev, variations }));
  }

  async function handleSave() {
    if (!form.name || !form.sku || !form.categoryId) {
      addToast("Name, SKU and Category are required.", "error"); return;
    }
    setSaving(true);
    const payload = {
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      price: Number(form.price),
      salePrice: form.salePrice ? Number(form.salePrice) : undefined,
      mrp: form.mrp ? Number(form.mrp) : undefined,
      costPrice: form.costPrice ? Number(form.costPrice) : undefined,
      stock: Number(form.stock),
      lowStockThreshold: Number(form.lowStockThreshold),
      weight: form.weight ? Number(form.weight) : undefined,
    };
    const url = isEdit ? `/api/admin/products/${id}` : "/api/admin/products";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (res.ok) {
      addToast(isEdit ? "Product updated." : "Product created.");
      router.push("/admin/products");
    } else {
      addToast(data.error ?? "Failed to save product.", "error");
    }
    setSaving(false);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <PageShell>
      <PageHeader
        title={isEdit ? "Edit Product" : "Add Product"}
        action={
          <div className="flex gap-2">
            <Btn variant="secondary" size="sm" onClick={() => router.push("/admin/products")}>Cancel</Btn>
            <Btn size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Product"}</Btn>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Main fields */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Basic Information">
            <div className="grid grid-cols-1 gap-5">
              <Field label="Product Name" required>
                <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="e.g. Cleopatra Golden Bloom Bedsheet" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="URL Slug" required>
                  <input value={form.slug} onChange={(e) => set("slug", e.target.value)} className={inputCls} placeholder="auto-generated" />
                </Field>
                <Field label="SKU" required>
                  <input value={form.sku} onChange={(e) => set("sku", e.target.value)} className={inputCls} placeholder="ZI-BS-001" />
                </Field>
              </div>
              <Field label="Short Description">
                <input value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} className={inputCls} placeholder="Brief product summary…" />
              </Field>
              <Field label="Description">
                <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={5} className={inputCls} placeholder="Full product description…" />
              </Field>
              <Field label="Tags (comma separated)">
                <input value={form.tags} onChange={(e) => set("tags", e.target.value)} className={inputCls} placeholder="cotton, block-print, bedsheet" />
              </Field>

              {/* Product Media Image Upload (Auto WebP Conversion) */}
              <div className="pt-2">
                <ImageUploader
                  label="Product Primary Image (Auto-Converted to WebP)"
                  currentImage={form.images[0] || ""}
                  onImageUploaded={(webpUrl) => {
                    if (webpUrl) {
                      setForm((prev) => ({ ...prev, images: [webpUrl, ...prev.images.slice(1)] }));
                    } else {
                      setForm((prev) => ({ ...prev, images: prev.images.slice(1) }));
                    }
                  }}
                />
              </div>
            </div>
          </SectionCard>

          {/* Pricing */}
          <SectionCard title="Pricing">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Regular Price (₹)", key: "price" as const },
                { label: "Sale Price (₹)", key: "salePrice" as const },
                { label: "MRP (₹)", key: "mrp" as const },
              ].map(({ label, key }) => (
                <Field key={key} label={label} required={key === "price"}>
                  <input type="number" min={0} value={form[key] ?? ""} onChange={(e) => set(key, e.target.value ? Number(e.target.value) : undefined)} className={inputCls} placeholder="0" />
                </Field>
              ))}
            </div>
          </SectionCard>

          {/* Cost & Profitability Section */}
          <SectionCard title="Cost & Profitability Breakdown">
            <div className="space-y-4">
              <div className="flex items-center gap-4 border-b border-stone/20 pb-3">
                <span className="text-xs font-semibold uppercase text-stone">Costing Mode:</span>
                <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                  <input
                    type="radio"
                    name="costMode"
                    checked={!form.costBreakdown}
                    onChange={() => setForm((prev) => ({ ...prev, costBreakdown: undefined }))}
                    className="accent-indigo"
                  />
                  Simple Mode (Single Cost)
                </label>
                <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                  <input
                    type="radio"
                    name="costMode"
                    checked={!!form.costBreakdown}
                    onChange={() => setForm((prev) => ({ ...prev, costBreakdown: { fabricCost: 400, printingCost: 150, stitchingCost: 150, packagingCost: 100, otherCost: 50 } }))}
                    className="accent-indigo"
                  />
                  Detailed Cost Mode
                </label>
              </div>

              {!form.costBreakdown ? (
                <Field label="Product / Manufacturing Cost (₹)">
                  <input
                    type="number"
                    min={0}
                    value={form.costPrice ?? ""}
                    onChange={(e) => set("costPrice", e.target.value ? Number(e.target.value) : undefined)}
                    className={inputCls}
                    placeholder="e.g. 850"
                  />
                </Field>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-paper p-3 rounded border border-stone/20">
                  <Field label="Fabric (₹)">
                    <input
                      type="number"
                      min={0}
                      value={form.costBreakdown?.fabricCost ?? 0}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const newBk = { ...form.costBreakdown, fabricCost: val };
                        const total = Object.values(newBk).reduce((a, b) => a + (Number(b) || 0), 0);
                        setForm((prev) => ({ ...prev, costBreakdown: newBk, costPrice: total }));
                      }}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Printing (₹)">
                    <input
                      type="number"
                      min={0}
                      value={form.costBreakdown?.printingCost ?? 0}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const newBk = { ...form.costBreakdown, printingCost: val };
                        const total = Object.values(newBk).reduce((a, b) => a + (Number(b) || 0), 0);
                        setForm((prev) => ({ ...prev, costBreakdown: newBk, costPrice: total }));
                      }}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Labour/Stitching (₹)">
                    <input
                      type="number"
                      min={0}
                      value={form.costBreakdown?.stitchingCost ?? 0}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const newBk = { ...form.costBreakdown, stitchingCost: val };
                        const total = Object.values(newBk).reduce((a, b) => a + (Number(b) || 0), 0);
                        setForm((prev) => ({ ...prev, costBreakdown: newBk, costPrice: total }));
                      }}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Packaging (₹)">
                    <input
                      type="number"
                      min={0}
                      value={form.costBreakdown?.packagingCost ?? 0}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const newBk = { ...form.costBreakdown, packagingCost: val };
                        const total = Object.values(newBk).reduce((a, b) => a + (Number(b) || 0), 0);
                        setForm((prev) => ({ ...prev, costBreakdown: newBk, costPrice: total }));
                      }}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Other (₹)">
                    <input
                      type="number"
                      min={0}
                      value={form.costBreakdown?.otherCost ?? 0}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const newBk = { ...form.costBreakdown, otherCost: val };
                        const total = Object.values(newBk).reduce((a, b) => a + (Number(b) || 0), 0);
                        setForm((prev) => ({ ...prev, costBreakdown: newBk, costPrice: total }));
                      }}
                      className={inputCls}
                    />
                  </Field>
                </div>
              )}

              {/* Live Profit Preview */}
              {(() => {
                const sellPrice = form.salePrice || form.price || 0;
                const cost = form.costPrice || 0;
                const profit = sellPrice - cost;
                const margin = sellPrice > 0 ? Math.round((profit / sellPrice) * 1000) / 10 : 0;
                return (
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-md flex flex-wrap items-center justify-between font-mono text-xs">
                    <div>
                      <span>Total Unit Cost: </span>
                      <strong className="text-amber-400">₹{cost.toLocaleString("en-IN")}</strong>
                    </div>
                    <div>
                      <span>Initial Gross Profit: </span>
                      <strong className="text-cyan-400">₹{profit.toLocaleString("en-IN")}</strong>
                    </div>
                    <div>
                      <span>Gross Margin %: </span>
                      <strong className={margin >= 30 ? "text-emerald-400" : margin >= 0 ? "text-amber-400" : "text-rose-400"}>
                        {margin}%
                      </strong>
                    </div>
                  </div>
                );
              })()}
            </div>
          </SectionCard>

          {/* Inventory */}
          <SectionCard title="Inventory & Stock">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <Field label="Stock Quantity">
                <input type="number" min={0} value={form.stock} onChange={(e) => set("stock", Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Low Stock Threshold">
                <input type="number" min={0} value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Stock Status">
                <select value={form.stockStatus} onChange={(e) => set("stockStatus", e.target.value)} className={selectCls}>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </Field>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                <input type="checkbox" checked={form.manageStock} onChange={(e) => set("manageStock", e.target.checked)} className="accent-indigo" />
                Manage Stock
              </label>
              <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                <input type="checkbox" checked={form.backordersAllowed} onChange={(e) => set("backordersAllowed", e.target.checked)} className="accent-indigo" />
                Allow Backorders
              </label>
            </div>
          </SectionCard>

          {/* Payment & Shipping Rules */}
          <SectionCard title="Payment & Shipping Rules">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Custom COD Shipping Charge (₹)">
                  <input
                    type="number"
                    min={0}
                    value={form.codShippingCharge ?? ""}
                    onChange={(e) => set("codShippingCharge", e.target.value ? Number(e.target.value) : undefined)}
                    className={inputCls}
                    placeholder="e.g. 120 (Leave blank for standard fee)"
                  />
                  <p className="text-[11px] text-stone mt-1">Specific Cash on Delivery shipping charge rule for this product.</p>
                </Field>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-stone/20">
                <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.codAllowed ?? true}
                    onChange={(e) => set("codAllowed", e.target.checked)}
                    className="accent-indigo"
                  />
                  Allow Cash on Delivery (COD) for this product
                </label>

                <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.freeShipping ?? false}
                    onChange={(e) => set("freeShipping", e.target.checked)}
                    className="accent-indigo"
                  />
                  Eligible for Free Shipping
                </label>
              </div>
            </div>
          </SectionCard>

          {/* Attributes & Variations (Variable products) */}
          {form.type === "variable" && (
            <SectionCard title="Attributes & Variations">
              {/* Add attribute */}
              <div className="flex gap-2 mb-4">
                <select value={activeAttr} onChange={(e) => setActiveAttr(e.target.value)} className={`${selectCls} flex-1`}>
                  <option value="">Select an attribute to add…</option>
                  {allAttrs.filter((a) => !form.attributes[a.name]).map((a) => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </select>
                <Btn size="sm" variant="secondary" onClick={() => {
                  if (activeAttr) { addAttributeValues(activeAttr, []); setActiveAttr(""); }
                }}>Add</Btn>
              </div>

              {Object.entries(form.attributes).map(([attrName, vals]) => {
                const attrDef = allAttrs.find((a) => a.name === attrName);
                return (
                  <div key={attrName} className="border border-stone/20 rounded-sm p-4 mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-ink">{attrName}</span>
                      <button onClick={() => removeAttribute(attrName)} className="text-xs text-madder hover:underline">Remove</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {attrDef?.values.map((v) => (
                        <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={vals.includes(v)}
                            onChange={(e) => {
                              const next = e.target.checked ? [...vals, v] : vals.filter((x) => x !== v);
                              addAttributeValues(attrName, next);
                            }}
                            className="accent-indigo"
                          />
                          {v}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}

              {Object.keys(form.attributes).length > 0 && (
                <Btn size="sm" variant="secondary" onClick={generateVariations}>Generate Variations</Btn>
              )}

              {form.variations.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-stone mb-2 uppercase tracking-wide font-semibold">{form.variations.length} variations</p>
                  <div className="space-y-3">
                    {form.variations.map((v, i) => (
                      <div key={v.id} className="border border-stone/20 rounded-sm p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-[10px] text-stone uppercase tracking-wide mb-1">Variant</p>
                          <p className="font-medium text-ink">{v.attributes.map((a) => a.value).join(" / ")}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-stone uppercase tracking-wide mb-1">SKU</p>
                          <input
                            value={v.sku}
                            onChange={(e) => {
                              const vars = [...form.variations];
                              vars[i] = { ...vars[i], sku: e.target.value };
                              set("variations", vars);
                            }}
                            className="w-full px-2 py-1 border border-stone/30 rounded-sm bg-paper text-xs focus:outline-none focus:ring-1 focus:ring-madder/40"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-stone uppercase tracking-wide mb-1">Price (₹)</p>
                          <input
                            type="number" value={v.price}
                            onChange={(e) => {
                              const vars = [...form.variations];
                              vars[i] = { ...vars[i], price: Number(e.target.value) };
                              set("variations", vars);
                            }}
                            className="w-full px-2 py-1 border border-stone/30 rounded-sm bg-paper text-xs focus:outline-none focus:ring-1 focus:ring-madder/40"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-stone uppercase tracking-wide mb-1">Stock</p>
                          <input
                            type="number" value={v.stock}
                            onChange={(e) => {
                              const vars = [...form.variations];
                              vars[i] = { ...vars[i], stock: Number(e.target.value), stockStatus: Number(e.target.value) > 0 ? "in_stock" : "out_of_stock" };
                              set("variations", vars);
                            }}
                            className="w-full px-2 py-1 border border-stone/30 rounded-sm bg-paper text-xs focus:outline-none focus:ring-1 focus:ring-madder/40"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          )}
        </div>

        {/* Right — Metadata */}
        <div className="space-y-5">
          <SectionCard title="Publish">
            <div className="space-y-4">
              <Field label="Product Type">
                <select value={form.type} onChange={(e) => set("type", e.target.value)} className={selectCls}>
                  <option value="simple">Simple</option>
                  <option value="variable">Variable</option>
                  <option value="digital">Digital</option>
                  <option value="downloadable">Downloadable</option>
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => set("status", e.target.value)} className={selectCls}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Classification">
            <div className="space-y-4">
              <Field label="Category" required>
                <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={selectCls}>
                  <option value="">Select category…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Brand">
                <select value={form.brandId ?? ""} onChange={(e) => set("brandId", e.target.value || undefined)} className={selectCls}>
                  <option value="">No brand</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>
              <Field label="Tax Class">
                <select value={form.taxClass} onChange={(e) => set("taxClass", e.target.value)} className={selectCls}>
                  <option value="standard">Standard (18% GST)</option>
                  <option value="reduced">Reduced (5% GST)</option>
                  <option value="zero">Zero Rated</option>
                  <option value="none">No Tax</option>
                </select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Shipping">
            <div className="space-y-4">
              <Field label="Weight (kg)">
                <input type="number" step="0.01" min={0} value={form.weight ?? ""} onChange={(e) => set("weight", e.target.value ? Number(e.target.value) : undefined)} className={inputCls} placeholder="0.00" />
              </Field>
            </div>
          </SectionCard>

          <Btn onClick={handleSave} disabled={saving} className="w-full justify-center">
            {saving ? "Saving…" : isEdit ? "Update Product" : "Create Product"}
          </Btn>
        </div>
      </div>
    </PageShell>
  );
}
