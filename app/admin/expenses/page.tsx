"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  PieChart,
  TrendingDown,
  Building,
  Truck,
  CreditCard,
  Megaphone,
  AlertTriangle,
  CheckCircle,
  Tag,
  FileText
} from "lucide-react";
import type { Expense, ExpenseCategory, ExpenseClassification, ExpenseAllocation } from "@/lib/db/types";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [classificationFilter, setClassificationFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("business");
  const [classification, setClassification] = useState<ExpenseClassification>("operating");
  const [allocation, setAllocation] = useState<ExpenseAllocation>("none");
  const [productId, setProductId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/expenses");
      const data = await res.json();
      if (res.ok) {
        setExpenses(data.expenses || []);
      }
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const openCreateModal = () => {
    setEditingExpense(null);
    setTitle("");
    setAmount("");
    setCategory("business");
    setClassification("operating");
    setAllocation("none");
    setProductId("");
    setOrderId("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setTitle(exp.title);
    setAmount(String(exp.amount));
    setCategory(exp.category);
    setClassification(exp.classification);
    setAllocation(exp.allocation || "none");
    setProductId(exp.productId || "");
    setOrderId(exp.orderId || "");
    setExpenseDate(exp.expenseDate || new Date().toISOString().split("T")[0]);
    setNotes(exp.notes || "");
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!title.trim()) {
      setFormError("Expense title is required.");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setFormError("Please enter a valid non-negative expense amount.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingExpense?.id,
        title: title.trim(),
        amount: numAmount,
        category,
        classification,
        allocation,
        productId: productId.trim() || undefined,
        orderId: orderId.trim() || undefined,
        expenseDate,
        notes: notes.trim(),
        createdBy: "Admin User",
        createdByRole: "super_admin"
      };

      const url = editingExpense ? `/api/admin/expenses/${editingExpense.id}` : "/api/admin/expenses";
      const method = editingExpense ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save expense.");
      } else {
        setShowModal(false);
        fetchExpenses();
      }
    } catch (err) {
      setFormError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/expenses/${id}?role=super_admin`, {
        method: "DELETE"
      });
      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete expense.");
      } else {
        setDeletingId(null);
        fetchExpenses();
      }
    } catch (err) {
      setDeleteError("Failed to delete expense.");
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(search.toLowerCase())) ||
      e.id.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === "all" || e.category === categoryFilter;
    const matchesClass = classificationFilter === "all" || e.classification === classificationFilter;
    return matchesSearch && matchesCat && matchesClass;
  });

  const totalExpenseAmount = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  const getCategoryBadge = (cat: ExpenseCategory) => {
    switch (cat) {
      case "business":
        return <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-950/60 text-blue-400 border border-blue-800/40"><Building className="w-3 h-3"/> Business</span>;
      case "sales_marketing":
        return <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-950/60 text-purple-400 border border-purple-800/40"><Megaphone className="w-3 h-3"/> Sales & Mktg</span>;
      case "fulfillment":
        return <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/40"><Truck className="w-3 h-3"/> Fulfillment</span>;
      case "payment":
        return <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"><CreditCard className="w-3 h-3"/> Payment</span>;
    }
  };

  const getClassificationBadge = (cls: ExpenseClassification) => {
    switch (cls) {
      case "product":
        return <span className="text-xs font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/30">Product-Level</span>;
      case "order":
        return <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30">Order-Level</span>;
      case "marketing":
        return <span className="text-xs font-mono text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/30">Marketing</span>;
      case "operating":
        return <span className="text-xs font-mono text-slate-300 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700">Operating</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-900/30 pb-5">
        <div>
          <h1 className="text-3xl font-serif tracking-wide text-amber-100 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-amber-400" />
            Expense Management System
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track business overheads, fulfillment charges, ad spend, and product-specific expenses for net profit accuracy.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold px-5 py-2.5 rounded-lg shadow-lg shadow-amber-950/40 transition-all text-sm"
        >
          <Plus className="w-4 h-4" /> Record New Expense
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            Total Recorded Expenses
            <PieChart className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-200 mt-2 font-mono">
            ₹{totalExpenseAmount.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-slate-400 mt-1">Across {filteredExpenses.length} entries</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            Operating Overheads
            <Building className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-300 mt-2 font-mono">
            ₹{expenses.filter(e => e.classification === "operating").reduce((acc, e) => acc + e.amount, 0).toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-slate-400 mt-1">Rent, Salaries, Software, Utilities</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            Ad & Marketing Spend
            <Megaphone className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300 mt-2 font-mono">
            ₹{expenses.filter(e => e.classification === "marketing").reduce((acc, e) => acc + e.amount, 0).toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-slate-400 mt-1">Meta Ads, Google Ads, Influencers</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            Fulfillment & Shipping
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-2 font-mono">
            ₹{expenses.filter(e => e.category === "fulfillment").reduce((acc, e) => acc + e.amount, 0).toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-slate-400 mt-1">Packaging, Logistics, Exchanges</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search expenses by title or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/50"
          >
            <option value="all">All Categories</option>
            <option value="business">Business Expenses</option>
            <option value="sales_marketing">Sales & Marketing</option>
            <option value="fulfillment">Fulfillment</option>
            <option value="payment">Payment Gateway</option>
          </select>

          {/* Classification Filter */}
          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/50"
          >
            <option value="all">All Classifications</option>
            <option value="operating">Operating Expense</option>
            <option value="marketing">Marketing Expense</option>
            <option value="order">Order-Level Expense</option>
            <option value="product">Product-Level Expense</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Title & Details</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Classification</th>
                <th className="py-3.5 px-4">Allocation</th>
                <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading expense records...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No expense records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {exp.expenseDate || exp.createdAt.split("T")[0]}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-slate-100">{exp.title}</div>
                      {exp.notes && <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{exp.notes}</div>}
                      {(exp.productId || exp.orderId) && (
                        <div className="text-xs text-amber-400/80 font-mono mt-1">
                          {exp.productId && <span>Product: {exp.productId} </span>}
                          {exp.orderId && <span>Order: #{exp.orderId}</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {getCategoryBadge(exp.category)}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {getClassificationBadge(exp.classification)}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="text-xs text-slate-400 capitalize bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {exp.allocation || "none"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-amber-300 whitespace-nowrap text-base">
                      ₹{exp.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(exp)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                          title="Edit Expense"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                          title="Delete Expense (Super Admin)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record / Edit Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-xl font-serif text-amber-100 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                {editingExpense ? "Edit Expense Record" : "Record New Expense"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-lg text-rose-300 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Special Embroidery for Silk Bedsheets"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="business">Business Overhead (Rent/Salaries)</option>
                    <option value="sales_marketing">Sales & Marketing (Ads/Agency)</option>
                    <option value="fulfillment">Fulfillment (Shipping/Packaging)</option>
                    <option value="payment">Payment Gateway / COD Fees</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Classification *
                  </label>
                  <select
                    value={classification}
                    onChange={(e) => setClassification(e.target.value as ExpenseClassification)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="operating">Operating Expense</option>
                    <option value="marketing">Marketing Expense</option>
                    <option value="order">Order-Level Expense</option>
                    <option value="product">Product-Level Expense</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Allocation Method
                  </label>
                  <select
                    value={allocation}
                    onChange={(e) => setAllocation(e.target.value as ExpenseAllocation)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="none">None / Direct</option>
                    <option value="equal">Equal Order Distribution</option>
                    <option value="attribution">Direct Campaign Attribution</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Product ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. prod-123"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Order ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ord-456"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Notes / Audit Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or invoice reference details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg text-sm transition-all"
                >
                  {saving ? "Saving..." : editingExpense ? "Update Expense" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Super Admin Exclusive) */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-900/60 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-7 h-7 shrink-0" />
              <h3 className="text-lg font-bold">Confirm Permanent Deletion</h3>
            </div>

            <p className="text-sm text-slate-300">
              Are you sure you want to permanently delete this expense record? This action cannot be undone and will create an audit entry.
            </p>

            {deleteError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-lg">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-sm transition-all"
              >
                Permanently Delete (Super Admin)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
