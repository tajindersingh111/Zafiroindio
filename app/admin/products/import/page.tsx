"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell, PageHeader, Btn, useToast } from "@/components/admin/Shared";
import { Upload, Download, FileText, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";

export default function BulkImportProductsPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ importedCount: number; errorCount: number; errors: string[] } | null>(null);

  const sampleCsv = `name,sku,price,salePrice,stock,category,image,description
Zafiro Royal Emerald Bedsheet,ZI-EMR-001,2499,1899,45,Floral,https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85,Luxury 300TC percale cotton bedsheet in rich emerald green.
Zafiro Marigold Bloom Bedsheet,ZI-MRG-002,1999,1499,30,Printed,https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=85,Bright marigold floral motifs hand printed on soft breathable cotton.
Zafiro Desert Sand Minimal Bedsheet,ZI-SND-003,1799,1299,60,Minimal,https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=85,Quiet warm sand tones designed for minimalist modern bedrooms.
Zafiro Indigo Starlight Bedsheet,ZI-IND-004,2299,1799,25,Luxury,https://images.unsplash.com/photo-1617104678098-de229db51175?auto=format&fit=crop&w=1200&q=85,Deep indigo blue block printed bedsheet set with matching pillow covers.
Zafiro Blush Lotus Bedsheet,ZI-LTS-005,1599,1199,40,Floral,https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=1200&q=85,Soft blush pink lotus sprigs on unbleached 100% organic cotton.`;

  const parseCsv = (text: string) => {
    const lines = text.trim().split("\n").filter(l => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const items = [];

    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i];
      // Regex parsing for quoted strings
      const values = currentLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || currentLine.split(",");
      const obj: any = {};
      headers.forEach((h, index) => {
        let val = values[index] ? values[index].trim() : "";
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        obj[h] = val;
      });
      if (obj.name) items.push(obj);
    }
    return items;
  };

  const previewItems = parseCsv(csvText);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvText(event.target?.result as string || "");
      };
      reader.readAsText(file);
    }
  };

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "zafiro_bulk_products_sample.csv");
    link.click();
  };

  const handleImport = async () => {
    const items = parseCsv(csvText);
    if (items.length === 0) {
      addToast("Please provide valid CSV data with product rows.", "error");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      const data = await res.json();

      if (res.ok) {
        setResult(data);
        addToast(`Successfully imported ${data.importedCount} products!`, "success");
      } else {
        addToast(data.error || "Failed to import products.", "error");
      }
    } catch (e) {
      addToast("Error communicating with server.", "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Bulk Product Import"
        subtitle="Upload multiple products at once via CSV or JSON file"
        action={
          <Link href="/admin/products">
            <Btn variant="secondary"><ArrowLeft size={14} /> Back to Products</Btn>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 border border-stone/20 rounded-md shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-ink text-lg flex items-center gap-2">
              <Upload size={18} className="text-gold" /> Step 1: Upload CSV
            </h3>

            <div>
              <label className="block text-xs font-semibold text-stone uppercase mb-2">Upload CSV File</label>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="w-full text-xs text-stone border border-stone/30 rounded-sm p-2 cursor-pointer bg-cream/50"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDownloadSample}
                className="inline-flex items-center gap-1.5 text-xs text-gold font-bold hover:underline"
              >
                <Download size={13} /> Download Sample CSV
              </button>
              <button
                onClick={() => setCsvText(sampleCsv)}
                className="inline-flex items-center gap-1.5 text-xs text-indigo font-bold hover:underline ml-auto"
              >
                <FileText size={13} /> Load Sample Data
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone uppercase mb-2">CSV Raw Data / Paste Area</label>
              <textarea
                rows={10}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder="Paste CSV text here (e.g. name,sku,price,stock...)"
                className="w-full text-xs font-mono border border-stone/30 rounded-sm p-3 focus:outline-none focus:border-gold"
              />
            </div>

            <Btn
              onClick={handleImport}
              disabled={importing || previewItems.length === 0}
              className="w-full justify-center"
            >
              {importing ? "Importing Products..." : `Import ${previewItems.length} Products`}
            </Btn>
          </div>
        </div>

        {/* Right Column: Live Table Preview & Results */}
        <div className="lg:col-span-2 space-y-4">
          {result && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 size={18} /> Bulk Import Completed Successfully!
              </div>
              <p className="text-xs text-emerald-700">
                Imported <strong>{result.importedCount}</strong> new product(s) into database.
              </p>
              {result.errors.length > 0 && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                  <strong>Errors encountered ({result.errorCount}):</strong>
                  <ul className="list-disc ml-4 mt-1">
                    {result.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                  </ul>
                </div>
              )}
              <div className="pt-2">
                <Link href="/admin/products">
                  <Btn size="sm">View All Products →</Btn>
                </Link>
              </div>
            </div>
          )}

          <div className="bg-white p-5 border border-stone/20 rounded-md shadow-sm">
            <h3 className="font-serif font-bold text-ink text-lg mb-3">
              Step 2: Preview ({previewItems.length} Products Found)
            </h3>

            {previewItems.length === 0 ? (
              <div className="text-center py-12 text-stone text-xs">
                Upload a CSV file or click &ldquo;Load Sample Data&rdquo; on the left to preview products before import.
              </div>
            ) : (
              <div className="overflow-x-auto border border-stone/10 rounded-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper border-b border-stone/10 font-bold text-stone">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Sale Price</th>
                      <th className="p-3">Stock</th>
                      <th className="p-3">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone/10">
                    {previewItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-cream/40">
                        <td className="p-3 text-stone">{idx + 1}</td>
                        <td className="p-3 font-semibold text-ink">{item.name}</td>
                        <td className="p-3 font-mono text-stone">{item.sku || "Auto"}</td>
                        <td className="p-3 text-ink">₹{item.price}</td>
                        <td className="p-3 text-emerald-700">{item.saleprice ? `₹${item.saleprice}` : "—"}</td>
                        <td className="p-3">{item.stock || "50"}</td>
                        <td className="p-3 text-stone">{item.category || "General"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
