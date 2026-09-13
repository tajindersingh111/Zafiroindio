"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHeader, SectionCard, Btn, LoadingSpinner, useToast } from "@/components/admin/Shared";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  allowedSections?: string[];
  isActive: boolean;
  lastLoginAt?: string;
}

const SECTION_OPTIONS = [
  { key: "orders", label: "Orders & Shipping", desc: "View & process customer orders, generate invoices, track shipments" },
  { key: "inventory", label: "Products & Inventory", desc: "Add/edit products, stock counts, categories, brands, smart inventory" },
  { key: "customers", label: "Customers & Segments", desc: "View customer 360 profiles, RFM segments, purchase histories" },
  { key: "analytics", label: "Analytics & Intelligence", desc: "Store reports, profit margins, sales location charts, AI insights" },
  { key: "marketing", label: "Marketing & Meta Ads", desc: "Coupons, email campaigns, promo banners, Meta Ads manager" },
  { key: "b2b", label: "Bulk & B2B Orders", desc: "Hospitality enquiries, export orders, wholesale tier pricing" },
  { key: "users", label: "Users & Roles", desc: "Create admin accounts, modify permissions, assign staff roles" },
  { key: "settings", label: "Store Settings", desc: "Payment gateways, tax rules, shipping methods, store profile" },
];

const PRESET_ROLES = [
  { key: "super_admin", label: "Super Admin", sections: ["orders", "inventory", "customers", "analytics", "marketing", "b2b", "users", "settings"] },
  { key: "order_manager", label: "Order Manager", sections: ["orders", "customers"] },
  { key: "inventory_manager", label: "Inventory Manager", sections: ["inventory"] },
  { key: "marketing", label: "Marketing Specialist", sections: ["marketing", "analytics"] },
  { key: "b2b_sales", label: "B2B Sales Manager", sections: ["b2b", "customers"] },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  order_manager: "Order Manager",
  inventory_manager: "Inventory Manager",
  marketing: "Marketing Specialist",
  b2b_sales: "B2B Sales Manager",
  custom: "Custom Roles",
};

export default function UsersPage() {
  const { addToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("order_manager");
  const [selectedSections, setSelectedSections] = useState<string[]>(["orders", "customers"]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  function fetchUsers() {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users ?? []);
        setLoading(false);
      });
  }

  function handleRoleChange(selectedRole: string) {
    setRole(selectedRole);
    const preset = PRESET_ROLES.find((p) => p.key === selectedRole);
    if (preset) {
      setSelectedSections(preset.sections);
    }
  }

  function toggleSection(sectionKey: string) {
    setSelectedSections((prev) =>
      prev.includes(sectionKey) ? prev.filter((s) => s !== sectionKey) : [...prev, sectionKey]
    );
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      addToast("Please fill in all required fields.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          allowedSections: selectedSections,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error ?? "Failed to create user", "error");
        setSubmitting(false);
        return;
      }
      addToast(`Account created for ${name} with specified permissions!`);
      setShowAddModal(false);
      setName("");
      setEmail("");
      setPassword("");
      fetchUsers();
    } catch {
      addToast("Network error. Try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(user: AdminUser) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)));
      addToast(`${user.name} ${user.isActive ? "deactivated" : "activated"}.`);
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Admin Users & Role-Based Access Control"
        subtitle="Configure team member accounts and tickmark module permissions"
        action={
          <Btn onClick={() => setShowAddModal(true)}>
            + Add Team Member
          </Btn>
        }
      />

      {/* Team Members List */}
      <SectionCard title="Active Team Accounts">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-stone/20 bg-paper/30">
                  {["Team Member", "Role", "Enabled Modules (Tickmarks)", "Status", "Last Login", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium uppercase tracking-wider text-stone">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const allowed = u.allowedSections ?? PRESET_ROLES.find((r) => r.key === u.role)?.sections ?? [];
                  return (
                    <tr key={u.id} className="border-b border-stone/10 last:border-0 hover:bg-paper/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-ink">{u.name}</p>
                        <p className="text-[11px] text-stone">{u.email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-indigo/10 text-indigo font-medium text-[10px] uppercase tracking-wider border border-indigo/20">
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {SECTION_OPTIONS.map((sec) => {
                            const isAllowed = u.role === "super_admin" || allowed.includes(sec.key);
                            return (
                              <span
                                key={sec.key}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[9px] font-mono ${
                                  isAllowed ? "bg-green-700/10 text-green-800 border border-green-700/20" : "bg-stone/10 text-stone/60 line-through opacity-50"
                                }`}
                              >
                                {isAllowed ? "✓" : "✕"} {sec.label.split(" ")[0]}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium uppercase tracking-wider ${
                            u.isActive ? "bg-green-700/10 text-green-800 border border-green-700/20" : "bg-stone/15 text-stone border border-stone/20"
                          }`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-stone">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : "Never"}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => toggleActive(u)}
                          className="text-xs text-madder hover:underline font-medium cursor-pointer"
                        >
                          {u.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-stone">
                      No admin users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Permission Matrix Possibilities */}
      <SectionCard title="Module Permission Possibilities Matrix" subtitle="Overview of available sections and what each role can access">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone/20 bg-paper/30">
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wider text-stone">Dashboard Module</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wider text-stone">Description & Capabilities</th>
                {PRESET_ROLES.map((r) => (
                  <th key={r.key} className="px-3 py-3 text-center font-medium uppercase tracking-wider text-stone">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SECTION_OPTIONS.map((sec) => (
                <tr key={sec.key} className="border-b border-stone/10 last:border-0 hover:bg-paper/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-indigo">{sec.label}</td>
                  <td className="px-4 py-3 text-stone leading-relaxed">{sec.desc}</td>
                  {PRESET_ROLES.map((r) => {
                    const isChecked = r.sections.includes(sec.key);
                    return (
                      <td key={r.key} className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-xs font-bold text-xs ${isChecked ? "bg-green-700/15 text-green-800 border border-green-700/30" : "text-stone/40 opacity-40"}`}>
                          {isChecked ? "✓" : "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-xs">
          <div className="bg-cream-card rounded-sm border border-stone/30 shadow-2xl w-full max-w-xl p-6 space-y-5 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-stone/20 pb-3">
              <h3 className="font-sans font-semibold text-lg text-indigo">Add New Team Member</h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone hover:text-ink text-lg font-bold">×</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-stone mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-xs text-ink focus:outline-none focus:border-indigo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-stone mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@zafiroindio.com"
                    className="w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-xs text-ink focus:outline-none focus:border-indigo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-stone mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-xs text-ink focus:outline-none focus:border-indigo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-stone mb-1">Role Template</label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-stone/30 rounded-sm bg-paper text-xs text-ink focus:outline-none focus:border-indigo cursor-pointer"
                  >
                    {PRESET_ROLES.map((r) => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tickmark Module Checkboxes */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-indigo mb-2">
                  Tickmark Allowed Dashboard Modules (Custom Permission Checkboxes)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-paper/50 p-3 rounded-sm border border-stone/20">
                  {SECTION_OPTIONS.map((sec) => {
                    const checked = selectedSections.includes(sec.key);
                    return (
                      <label key={sec.key} className="flex items-start gap-2.5 cursor-pointer p-1.5 hover:bg-paper rounded-xs transition-colors">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSection(sec.key)}
                          className="mt-0.5 rounded-xs accent-indigo cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-medium text-ink leading-none">{sec.label}</p>
                          <p className="text-[10px] text-stone mt-0.5 leading-snug">{sec.desc.split(",")[0]}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-stone/20">
                <Btn variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Btn>
                <Btn type="submit" disabled={submitting}>
                  {submitting ? "Creating…" : "Create Account"}
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
