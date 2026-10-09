"use client";

import { useState, useEffect } from "react";
import { PackageCheck, Search, MessageSquare, Building2, RefreshCw, Trash2, Edit3, CheckCircle, Clock, FileSpreadsheet } from "lucide-react";

type BulkOrderInquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  quantity: string;
  businessName?: string;
  notes?: string;
  status: "PENDING" | "CONTACTED" | "QUOTED" | "COMPLETED" | "REJECTED";
  createdAt: string;
  adminNotes?: string;
};

export default function AdminBulkOrdersPage() {
  const [inquiries, setInquiries] = useState<BulkOrderInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedInquiry, setSelectedInquiry] = useState<BulkOrderInquiry | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bulk-orders");
      const data = await res.json();
      if (res.ok && Array.isArray(data.inquiries)) {
        setInquiries(data.inquiries);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/bulk-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        setInquiries((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus as any } : item))
        );
        if (selectedInquiry?.id === id) {
          setSelectedInquiry((prev) => (prev ? { ...prev, status: newStatus as any } : null));
        }
      }
    } catch {
      alert("Failed to update status.");
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedInquiry) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/bulk-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedInquiry.id, adminNotes: editNotes }),
      });
      if (res.ok) {
        setInquiries((prev) =>
          prev.map((item) => (item.id === selectedInquiry.id ? { ...item, adminNotes: editNotes } : item))
        );
        setSelectedInquiry((prev) => (prev ? { ...prev, adminNotes: editNotes } : null));
        alert("Admin notes saved.");
      }
    } catch {
      alert("Failed to save notes.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bulk order inquiry?")) return;
    try {
      const res = await fetch(`/api/bulk-orders?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setInquiries((prev) => prev.filter((item) => item.id !== id));
        if (selectedInquiry?.id === id) setSelectedInquiry(null);
      }
    } catch {
      alert("Failed to delete inquiry.");
    }
  };

  const exportCSV = () => {
    if (inquiries.length === 0) {
      alert("No inquiries available to export.");
      return;
    }
    const headers = ["ID", "Name", "Business Name", "Phone", "Email", "Category", "Quantity", "Status", "Date", "Customer Notes", "Admin Notes"];
    const rows = inquiries.map((i) => [
      i.id,
      `"${(i.name || "").replace(/"/g, '""')}"`,
      `"${(i.businessName || "").replace(/"/g, '""')}"`,
      `"${(i.phone || "").replace(/"/g, '""')}"`,
      `"${(i.email || "").replace(/"/g, '""')}"`,
      `"${(i.category || "").replace(/"/g, '""')}"`,
      `"${(i.quantity || "").replace(/"/g, '""')}"`,
      i.status,
      new Date(i.createdAt).toLocaleString("en-IN"),
      `"${(i.notes || "").replace(/"/g, '""')}"`,
      `"${(i.adminNotes || "").replace(/"/g, '""')}"`
    ]);

    const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Zafiro_Bulk_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtered inquiries
  const filtered = inquiries.filter((item) => {
    const matchesSearch =
      String(item.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      String(item.phone ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.businessName || "").toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = inquiries.length;
  const pendingCount = inquiries.filter((i) => i.status === "PENDING").length;
  const contactedCount = inquiries.filter((i) => i.status === "CONTACTED").length;
  const quotedCount = inquiries.filter((i) => i.status === "QUOTED" || i.status === "COMPLETED").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 text-[#a67c37] flex items-center justify-center">
              <PackageCheck size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900 font-serif">Bulk Order &amp; Wholesale Inquiries</h1>
              <p className="text-xs text-stone-500">Manage B2B leads, hotel supply requests, and custom printing inquiries</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchInquiries}
            className="px-3.5 py-2 text-xs font-semibold border border-stone-300 rounded-lg bg-white text-stone-700 hover:bg-stone-50 flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2 text-xs font-bold bg-[#12192c] text-white rounded-lg hover:bg-[#1c2744] flex items-center gap-2 shadow-xs"
          >
            <FileSpreadsheet size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Total Inquiries</span>
            <div className="text-2xl font-extrabold text-stone-900 mt-1">{totalCount}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
            <PackageCheck size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs flex items-center justify-between bg-amber-50/30">
          <div>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Action</span>
            <div className="text-2xl font-extrabold text-amber-800 mt-1">{pendingCount}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-xs flex items-center justify-between bg-blue-50/30">
          <div>
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Contacted / Negotiating</span>
            <div className="text-2xl font-extrabold text-blue-800 mt-1">{contactedCount}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
            <MessageSquare size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between bg-emerald-50/30">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Quoted &amp; Closed</span>
            <div className="text-2xl font-extrabold text-emerald-800 mt-1">{quotedCount}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
            <CheckCircle size={22} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {["ALL", "PENDING", "CONTACTED", "QUOTED", "COMPLETED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? "bg-[#12192c] text-[#c5a028]"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search name, phone, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-500 bg-stone-50/50"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500 text-sm font-medium">Loading bulk order inquiries...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-stone-500 text-sm">
            No bulk order inquiries found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Customer / Business</th>
                  <th className="py-3.5 px-4">Contact (WhatsApp / Call)</th>
                  <th className="py-3.5 px-4">Category &amp; Quantity</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {filtered.map((item) => {
                  const cleanPhone = item.phone.replace(/\D/g, "");
                  const whatsappUrl = `https://wa.me/${cleanPhone.length === 10 ? "91" + cleanPhone : cleanPhone}?text=${encodeURIComponent(
                    `Hi ${item.name}, thank you for inquiring about ${item.category} (${item.quantity}) at Zafiro Indio. Here is our wholesale catalog & price quote.`
                  )}`;

                  return (
                    <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                      {/* Customer Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">{item.name}</div>
                        {item.businessName && (
                          <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                            <Building2 size={12} className="text-amber-600" /> {item.businessName}
                          </div>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-stone-800">{item.phone}</span>
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                            title="Open WhatsApp chat"
                          >
                            💬 WhatsApp
                          </a>
                        </div>
                        {item.email && (
                          <div className="text-[11px] text-stone-400 mt-0.5 truncate max-w-xs">{item.email}</div>
                        )}
                      </td>

                      {/* Category & Quantity */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-800">{item.category}</div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/60 rounded-md text-[10px] font-bold">
                          📦 {item.quantity}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-stone-500 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>

                      {/* Status Dropdown Selector */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-md border cursor-pointer focus:outline-hidden ${
                            item.status === "PENDING"
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : item.status === "CONTACTED"
                              ? "bg-blue-50 text-blue-800 border-blue-300"
                              : item.status === "QUOTED"
                              ? "bg-purple-50 text-purple-800 border-purple-300"
                              : item.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : "bg-red-50 text-red-800 border-red-300"
                          }`}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="CONTACTED">CONTACTED</option>
                          <option value="QUOTED">QUOTED</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedInquiry(item);
                              setEditNotes(item.adminNotes || "");
                            }}
                            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Edit3 size={13} /> View / Notes
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-stone-400 hover:text-red-600 rounded-md transition-colors"
                            title="Delete inquiry"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inquiry Detail & Admin Notes Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-stone-200 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedInquiry(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-base font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors"
            >
              ✕
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#a67c37] block mb-1">
                Inquiry Details &amp; CRM Notes
              </span>
              <h3 className="font-serif text-xl font-bold text-stone-900">
                {selectedInquiry.name} {selectedInquiry.businessName ? `(${selectedInquiry.businessName})` : ""}
              </h3>
            </div>

            <div className="space-y-4 text-xs text-stone-700">
              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Phone / WhatsApp</span>
                  <div className="font-mono text-sm font-bold text-stone-900">{selectedInquiry.phone}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Email Address</span>
                  <div className="font-medium text-stone-800 truncate">{selectedInquiry.email || "N/A"}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Category</span>
                  <div className="font-semibold text-stone-900">{selectedInquiry.category}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Quantity Demanded</span>
                  <div className="font-semibold text-amber-700">{selectedInquiry.quantity}</div>
                </div>
              </div>

              {/* Customer Notes */}
              <div>
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Customer Notes &amp; Special Requirements:
                </label>
                <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg text-stone-800 leading-relaxed font-normal whitespace-pre-wrap">
                  {selectedInquiry.notes || "No additional notes provided by customer."}
                </div>
              </div>

              {/* Admin Internal Notes */}
              <div>
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Internal Admin / Sales Team Notes:
                </label>
                <textarea
                  rows={3}
                  placeholder="Add internal notes (e.g., Quoted ₹450/pc via WhatsApp, sample dispatched on Oct 2...)"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-3 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-500 bg-white"
                />
              </div>

              {/* Quick WhatsApp Action Button */}
              <div className="flex items-center justify-between pt-2">
                <a
                  href={`https://wa.me/${selectedInquiry.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Hi ${selectedInquiry.name}, thank you for reaching out to Zafiro Indio for bulk orders.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  💬 Open WhatsApp Chat
                </a>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedInquiry(null)}
                    className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg text-xs font-bold hover:bg-stone-50"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={updating}
                    className="px-4 py-2 bg-[#12192c] text-white rounded-lg text-xs font-bold hover:bg-[#1c2744] disabled:opacity-50"
                  >
                    {updating ? "Saving..." : "Save Admin Notes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
