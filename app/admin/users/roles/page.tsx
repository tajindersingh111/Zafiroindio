"use client";
import React, { useState } from "react";
import { Shield, ShieldAlert, Check, X, Lock, Key, Users } from "lucide-react";
import { DEFAULT_ROLE_PERMISSIONS, UserRole } from "@/lib/auth/rbac";

export default function RolesPermissionsPage() {
  const [matrix, setMatrix] = useState(DEFAULT_ROLE_PERMISSIONS);
  const roles: UserRole[] = ["super_admin", "admin", "manager", "staff"];

  const roleTitles: Record<UserRole, { name: string; badge: string; desc: string }> = {
    super_admin: {
      name: "Super Admin",
      badge: "Highest Authority",
      desc: "Full system access, user management, and EXCLUSIVE permanent DELETE permissions."
    },
    admin: {
      name: "Admin",
      badge: "Operational Admin",
      desc: "Can view, create, and edit products, orders, customers, and inventory. CANNOT delete data."
    },
    manager: {
      name: "Manager",
      badge: "Department Lead",
      desc: "Manages catalog, inventory, and operational order updates. Restricted delete access."
    },
    staff: {
      name: "Staff / Employee",
      badge: "Limited Access",
      desc: "Operational processing of inventory and orders. View-only access to customer data."
    }
  };

  const modules = [
    { key: "dashboard", label: "Dashboard Analytics" },
    { key: "products", label: "Product Catalog" },
    { key: "orders", label: "Order Management" },
    { key: "customers", label: "Customer CRM" },
    { key: "inventory", label: "Inventory Stock" },
    { key: "banners", label: "Banners & Content" },
    { key: "coupons", label: "Coupons & Discounts" },
    { key: "users", label: "Admin Users" },
    { key: "roles", label: "Roles & Permissions" },
    { key: "settings", label: "System Settings" },
    { key: "audit_logs", label: "Security Audit Logs" }
  ];

  return (
    <main style={{ padding: 24, backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#111827" }}>
              <Shield size={28} style={{ color: "#4f46e5" }} />
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Role-Based Access Control (RBAC)</h1>
            </div>
            <p style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
              Configurable permission matrix governing Admin Dashboard modules, actions, and Super Admin exclusive controls.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "#fef2f2", border: "1px solid #fecaca", padding: "8px 14px", borderRadius: 8 }}>
            <Lock size={18} style={{ color: "#dc2626" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#991b1b" }}>
              Permanent Delete Restrict: Super Admin Only
            </span>
          </div>
        </div>

        {/* Roles Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 32 }}>
          {roles.map((r) => (
            <div
              key={r}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 10,
                border: r === "super_admin" ? "2px solid #4f46e5" : "1px solid #e5e7eb",
                padding: 18,
                boxShadow: "0 2px 4px rgba(0,0,0,0.03)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#111827" }}>
                  {roleTitles[r].name}
                </h3>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    backgroundColor: r === "super_admin" ? "#e0e7ff" : "#f3f4f6",
                    color: r === "super_admin" ? "#3730a3" : "#4b5563",
                    padding: "2px 8px",
                    borderRadius: 4
                  }}
                >
                  {roleTitles[r].badge}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0, lineHeight: 1.4 }}>
                {roleTitles[r].desc}
              </p>
            </div>
          ))}
        </div>

        {/* Permission Matrix Table */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#f9fafb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#111827" }}>
              Global Permission Matrix
            </h3>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Backend Enforced Signature Validation Active
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "12px 20px", fontWeight: 600, color: "#374151" }}>Module / Feature</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Action</th>
                  {roles.map((r) => (
                    <th key={r} style={{ padding: "12px 16px", fontWeight: 600, color: r === "super_admin" ? "#4f46e5" : "#374151", textAlign: "center" }}>
                      {roleTitles[r].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map((m) => (
                  <React.Fragment key={m.key}>
                    {/* View Action */}
                    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "12px 20px", fontWeight: 600, color: "#111827" }} rowSpan={4}>
                        {m.label}
                      </td>
                      <td style={{ padding: "8px 16px", color: "#6b7280" }}>View / Read</td>
                      {roles.map((r) => {
                        const val = matrix[r]?.[m.key]?.view;
                        return (
                          <td key={r} style={{ padding: "8px 16px", textAlign: "center" }}>
                            {val ? <Check size={18} style={{ color: "#16a34a", margin: "0 auto" }} /> : <X size={18} style={{ color: "#d1d5db", margin: "0 auto" }} />}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Create Action */}
                    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 16px", color: "#6b7280" }}>Create / Add</td>
                      {roles.map((r) => {
                        const val = matrix[r]?.[m.key]?.create;
                        return (
                          <td key={r} style={{ padding: "8px 16px", textAlign: "center" }}>
                            {val ? <Check size={18} style={{ color: "#16a34a", margin: "0 auto" }} /> : <X size={18} style={{ color: "#d1d5db", margin: "0 auto" }} />}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Edit Action */}
                    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 16px", color: "#6b7280" }}>Edit / Update</td>
                      {roles.map((r) => {
                        const val = matrix[r]?.[m.key]?.edit;
                        return (
                          <td key={r} style={{ padding: "8px 16px", textAlign: "center" }}>
                            {val ? <Check size={18} style={{ color: "#16a34a", margin: "0 auto" }} /> : <X size={18} style={{ color: "#d1d5db", margin: "0 auto" }} />}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Delete Action - SUPER ADMIN EXCLUSIVE */}
                    <tr style={{ borderBottom: "2px solid #e5e7eb", backgroundColor: "#fff5f5" }}>
                      <td style={{ padding: "8px 16px", color: "#dc2626", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                        <Lock size={14} /> Permanent Delete
                      </td>
                      {roles.map((r) => {
                        const isSA = r === "super_admin";
                        return (
                          <td key={r} style={{ padding: "8px 16px", textAlign: "center" }}>
                            {isSA ? (
                              <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 12 }}>SUPER ADMIN ONLY</span>
                            ) : (
                              <span style={{ color: "#9ca3af", fontSize: 12 }}>RESTRICTED</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
