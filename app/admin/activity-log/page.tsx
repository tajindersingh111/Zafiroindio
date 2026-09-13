"use client";
import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  Clock,
  UserCheck,
  Lock,
  Eye,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  RefreshCw,
  ChevronRight,
  X
} from "lucide-react";

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  recordId: string;
  recordName: string;
  previousData?: any;
  updatedData?: any;
  status: "success" | "failed" | "unauthorized_blocked";
  timestamp: string;
  ipAddress?: string;
  isSuspicious?: boolean;
}

export default function AuditLogDashboardPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [suspiciousCount, setSuspiciousCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);
  const [page, setPage] = useState(1);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        module: selectedModule,
        role: selectedRole,
        status: selectedStatus,
        suspicious: suspiciousOnly ? "true" : "false",
        page: page.toString(),
        pageSize: "25"
      });

      const res = await fetch(`/api/admin/activity-log?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setSuspiciousCount(data.suspiciousCount || 0);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [search, selectedModule, selectedRole, selectedStatus, suspiciousOnly, page]);

  return (
    <main style={{ padding: 24, backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ShieldAlert size={28} style={{ color: "#dc2626" }} />
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#111827" }}>
                Super Admin Security & Audit Log
              </h1>
            </div>
            <p style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
              Immutable system-wide activity tracking, data modification history, and security alert monitoring.
            </p>
          </div>

          <button
            onClick={fetchAuditLogs}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#ffffff",
              border: "1px solid #d1d5db",
              padding: "9px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh Audit Logs
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
          <div style={{ backgroundColor: "#ffffff", padding: 20, borderRadius: 10, border: "1px solid #e5e7eb" }}>
            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Total Audit Entries</span>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: "#111827", margin: "4px 0 0 0" }}>{total}</h2>
          </div>

          <div style={{ backgroundColor: suspiciousCount > 0 ? "#fff5f5" : "#ffffff", padding: 20, borderRadius: 10, border: suspiciousCount > 0 ? "1px solid #fecaca" : "1px solid #e5e7eb" }}>
            <span style={{ fontSize: 12, color: suspiciousCount > 0 ? "#dc2626" : "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Suspicious Security Alerts</span>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: suspiciousCount > 0 ? "#dc2626" : "#111827", margin: "4px 0 0 0" }}>
              {suspiciousCount}
            </h2>
          </div>

          <div style={{ backgroundColor: "#ffffff", padding: 20, borderRadius: 10, border: "1px solid #e5e7eb" }}>
            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Audit Protection</span>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "#059669", margin: "8px 0 0 0", display: "flex", alignItems: "center", gap: 6 }}>
              <Lock size={18} /> Backend Enforced
            </h2>
          </div>
        </div>

        {/* Filters & Search */}
        <div style={{ backgroundColor: "#ffffff", padding: 18, borderRadius: 12, border: "1px solid #e5e7eb", marginBottom: 20, boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            
            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#9ca3af" }} />
              <input
                type="text"
                placeholder="Search user, action, order ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  fontSize: 13,
                  outline: "none"
                }}
              />
            </div>

            {/* Module Filter */}
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              style={{ padding: "9px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, backgroundColor: "#fff" }}
            >
              <option value="">All Modules</option>
              <option value="auth">Authentication & Login</option>
              <option value="products">Product Catalog</option>
              <option value="orders">Orders & Checkout</option>
              <option value="customers">Customers CRM</option>
              <option value="inventory">Inventory Stock</option>
              <option value="banners">Banners & Marketing</option>
              <option value="coupons">Coupons & Discounts</option>
              <option value="users">User Administration</option>
              <option value="security">Security & RBAC Blocked</option>
            </select>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ padding: "9px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, backgroundColor: "#fff" }}
            >
              <option value="">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ padding: "9px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, backgroundColor: "#fff" }}
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="unauthorized_blocked">Unauthorized Blocked</option>
            </select>

          </div>

          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={suspiciousOnly}
                onChange={(e) => setSuspiciousOnly(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "#dc2626" }}
              />
              <span style={{ fontWeight: 600, color: suspiciousOnly ? "#dc2626" : "#374151" }}>
                Show Suspicious & Unauthorized Security Alerts Only
              </span>
            </label>
          </div>
        </div>

        {/* Audit Log Table */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Log ID</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Performed By</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Action</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Module</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Affected Record</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Status</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>Date & Time</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151", textAlign: "right" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 36, textAlign: "center", color: "#6b7280" }}>
                      Loading security audit records...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 36, textAlign: "center", color: "#6b7280" }}>
                      No audit log records found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        backgroundColor: log.isSuspicious ? "#fff5f5" : "transparent"
                      }}
                    >
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111827", fontFamily: "monospace" }}>
                        #{log.id}
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#111827" }}>{log.userName}</div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          <span
                            style={{
                              textTransform: "uppercase",
                              fontWeight: 700,
                              color: log.userRole === "super_admin" ? "#4f46e5" : "#6b7280"
                            }}
                          >
                            {log.userRole}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: log.action.includes("DELETE") ? "#fee2e2" : log.action.includes("LOGIN") ? "#e0e7ff" : "#f3f4f6",
                            color: log.action.includes("DELETE") ? "#991b1b" : log.action.includes("LOGIN") ? "#3730a3" : "#374151"
                          }}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", textTransform: "capitalize", color: "#4b5563" }}>
                        {log.module}
                      </td>

                      <td style={{ padding: "12px 16px", color: "#111827", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.recordName || log.recordId}
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor:
                              log.status === "success"
                                ? "#d1fae5"
                                : log.status === "unauthorized_blocked"
                                ? "#fee2e2"
                                : "#fef3c7",
                            color:
                              log.status === "success"
                                ? "#065f46"
                                : log.status === "unauthorized_blocked"
                                ? "#991b1b"
                                : "#92400e"
                          }}
                        >
                          {log.status === "unauthorized_blocked" ? "BLOCKED" : log.status.toUpperCase()}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", fontSize: 12, color: "#6b7280" }}>
                        {new Date(log.timestamp).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 6,
                            border: "1px solid #d1d5db",
                            backgroundColor: "#ffffff",
                            fontSize: 12,
                            fontWeight: 500,
                            color: "#374151",
                            cursor: "pointer"
                          }}
                        >
                          View Diff
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Audit Record Details & Before/After Diff Modal */}
      {selectedLog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 12,
              maxWidth: 720,
              width: "100%",
              padding: 28,
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative"
            }}
          >
            <button
              onClick={() => setSelectedLog(null)}
              style={{ position: "absolute", top: 20, right: 20, border: "none", background: "none", cursor: "pointer", color: "#6b7280" }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
                Audit Log Details • {selectedLog.id}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: "4px 0 0 0", color: "#111827" }}>
                {selectedLog.action}
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, backgroundColor: "#f9fafb", padding: 16, borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
              <div>
                <span style={{ color: "#6b7280", display: "block" }}>Performed By</span>
                <strong style={{ color: "#111827" }}>{selectedLog.userName} ({selectedLog.userRole})</strong>
              </div>

              <div>
                <span style={{ color: "#6b7280", display: "block" }}>Module & Target</span>
                <strong style={{ color: "#111827" }}>{selectedLog.module.toUpperCase()} • {selectedLog.recordName}</strong>
              </div>

              <div>
                <span style={{ color: "#6b7280", display: "block" }}>Date & Time</span>
                <strong>{new Date(selectedLog.timestamp).toLocaleString()}</strong>
              </div>

              <div>
                <span style={{ color: "#6b7280", display: "block" }}>Security Status</span>
                <strong style={{ color: selectedLog.status === "success" ? "#059669" : "#dc2626" }}>
                  {selectedLog.status.toUpperCase()}
                </strong>
              </div>
            </div>

            {/* Before vs After Data Comparison */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 600, color: "#374151" }}>
                Data Modification Breakdown (Before vs After)
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Previous Data */}
                <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", marginBottom: 6, textTransform: "uppercase" }}>
                    Previous Data (Before)
                  </div>
                  <pre style={{ fontSize: 11, color: "#7f1d1d", margin: 0, overflowX: "auto", whiteSpace: "pre-wrap" }}>
                    {selectedLog.previousData ? JSON.stringify(selectedLog.previousData, null, 2) : "None (New Record Created)"}
                  </pre>
                </div>

                {/* Updated Data */}
                <div style={{ backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#065f46", marginBottom: 6, textTransform: "uppercase" }}>
                    Updated Data (After)
                  </div>
                  <pre style={{ fontSize: 11, color: "#064e3b", margin: 0, overflowX: "auto", whiteSpace: "pre-wrap" }}>
                    {selectedLog.updatedData ? JSON.stringify(selectedLog.updatedData, null, 2) : "None (Record Removed)"}
                  </pre>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 6,
                  border: "none",
                  backgroundColor: "#111827",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer"
                }}
              >
                Close Audit Details
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
