"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Lock,
  Key,
  AlertCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Eye,
  LogOut,
  Trash2,
  ChevronRight
} from "lucide-react";

interface AlertItem {
  id: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  userInvolved: string;
  timestamp: string;
  status: "new" | "investigating" | "resolved" | "ignored";
}

export default function SecurityCenterPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [activeSessionsCount, setActiveSessionsCount] = useState(0);
  const [newAlertsCount, setNewAlertsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState("");

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/security/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setNewAlertsCount(data.newCount || 0);
      }

      const sessRes = await fetch("/api/admin/security/sessions");
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setActiveSessionsCount(sessData.activeCount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const updateAlertStatus = async (alertId: string, status: string) => {
    try {
      const res = await fetch("/api/admin/security/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, status })
      });
      if (res.ok) {
        fetchSecurityData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAlerts = selectedSeverity
    ? alerts.filter((a) => a.severity === selectedSeverity)
    : alerts;

  return (
    <main style={{ padding: 24, backgroundColor: "#faf8f5", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ShieldCheck size={32} style={{ color: "#1a1612" }} />
              <h1 className="serif" style={{ fontSize: 28, fontWeight: 500, margin: 0, color: "#1a1612" }}>
                Super Admin Security Center
              </h1>
            </div>
            <p style={{ color: "#786f63", fontSize: 14, marginTop: 4 }}>
              Centralized security command, active sessions, risk monitoring, and threat response control.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Link
              href="/admin/security-center/sessions"
              style={{
                backgroundColor: "#1a1612",
                color: "#ffffff",
                padding: "10px 18px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              <Users size={16} /> Manage Active Sessions ({activeSessionsCount})
            </Link>

            <button
              onClick={fetchSecurityData}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #dcd4c8",
                padding: "10px 16px",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer"
              }}
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>

        {/* Dashboard Security Widgets */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 28 }}>
          
          {/* User Security Widget */}
          <div style={{ background: "#ffffff", padding: 22, borderRadius: 12, border: "1px solid #e8e2d9", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#8c8275", textTransform: "uppercase" }}>User Security</span>
              <Users size={18} style={{ color: "#8c8275" }} />
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 600, color: "#1a1612", margin: 0 }}>{activeSessionsCount}</h2>
            <p style={{ fontSize: 13, color: "#665f55", marginTop: 4, margin: 0 }}>
              Active Logged-in Sessions
            </p>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #f0eae1", fontSize: 12, color: "#786f63" }}>
              <Link href="/admin/security-center/sessions" style={{ color: "#8c5e2b", fontWeight: 600, textDecoration: "none" }}>
                View Active Sessions →
              </Link>
            </div>
          </div>

          {/* Security Events Widget */}
          <div style={{ background: newAlertsCount > 0 ? "#fff8f6" : "#ffffff", padding: 22, borderRadius: 12, border: newAlertsCount > 0 ? "1px solid #f5c6cb" : "1px solid #e8e2d9", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: newAlertsCount > 0 ? "#c0392b" : "#8c8275", textTransform: "uppercase" }}>New Security Alerts</span>
              <ShieldAlert size={18} style={{ color: newAlertsCount > 0 ? "#c0392b" : "#8c8275" }} />
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 600, color: newAlertsCount > 0 ? "#c0392b" : "#1a1612", margin: 0 }}>{newAlertsCount}</h2>
            <p style={{ fontSize: 13, color: "#665f55", marginTop: 4, margin: 0 }}>
              Requires Super Admin Review
            </p>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #f0eae1", fontSize: 12, color: "#786f63" }}>
              <span style={{ color: "#786f63" }}>Automated Threat Monitoring Active</span>
            </div>
          </div>

          {/* System Control Widget */}
          <div style={{ background: "#ffffff", padding: 22, borderRadius: 12, border: "1px solid #e8e2d9", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#8c8275", textTransform: "uppercase" }}>Delete Protection</span>
              <Lock size={18} style={{ color: "#8c5e2b" }} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: "#27ae60", margin: "6px 0 0 0", display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={22} /> Super Admin Only
            </h2>
            <p style={{ fontSize: 13, color: "#665f55", marginTop: 6, margin: 0 }}>
              Backend-Enforced Delete Restriction
            </p>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #f0eae1", fontSize: 12 }}>
              <Link href="/admin/recycle-bin" style={{ color: "#8c5e2b", fontWeight: 600, textDecoration: "none" }}>
                Open Recycle Bin →
              </Link>
            </div>
          </div>

        </div>

        {/* Security Alert Center */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: 12, border: "1px solid #e8e2d9", padding: 24, boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 className="serif" style={{ fontSize: 20, fontWeight: 500, margin: 0, color: "#1a1612" }}>
                Security Alert Center
              </h2>
              <p style={{ fontSize: 13, color: "#786f63", margin: "2px 0 0 0" }}>
                Threats, price anomalies, unauthorized delete attempts, and login failures.
              </p>
            </div>

            {/* Severity Filter */}
            <div style={{ display: "flex", gap: 8 }}>
              {["", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSelectedSeverity(sev)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid #dcd4c8",
                    backgroundColor: selectedSeverity === sev ? "#1a1612" : "#ffffff",
                    color: selectedSeverity === sev ? "#ffffff" : "#554e44"
                  }}
                >
                  {sev || "All Severities"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: "#faf8f5", borderBottom: "1px solid #e8e2d9" }}>
                  <th style={{ padding: "12px 16px", color: "#554e44" }}>Severity</th>
                  <th style={{ padding: "12px 16px", color: "#554e44" }}>Title & Description</th>
                  <th style={{ padding: "12px 16px", color: "#554e44" }}>User Involved</th>
                  <th style={{ padding: "12px 16px", color: "#554e44" }}>Status</th>
                  <th style={{ padding: "12px 16px", color: "#554e44" }}>Timestamp</th>
                  <th style={{ padding: "12px 16px", color: "#554e44", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#786f63" }}>
                      Loading security alerts...
                    </td>
                  </tr>
                ) : filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#786f63" }}>
                      No security alerts found. All systems operating normally.
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((alert) => (
                    <tr key={alert.id} style={{ borderBottom: "1px solid #f0eae1" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor:
                              alert.severity === "CRITICAL"
                                ? "#f8d7da"
                                : alert.severity === "HIGH"
                                ? "#fff3cd"
                                : "#e2e3e5",
                            color:
                              alert.severity === "CRITICAL"
                                ? "#721c24"
                                : alert.severity === "HIGH"
                                ? "#856404"
                                : "#383d41"
                          }}
                        >
                          {alert.severity}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#1a1612" }}>{alert.title}</div>
                        <div style={{ fontSize: 12, color: "#665f55", marginTop: 2 }}>{alert.description}</div>
                      </td>

                      <td style={{ padding: "14px 16px", color: "#2c251e" }}>
                        {alert.userInvolved}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            textTransform: "capitalize",
                            color: alert.status === "resolved" ? "#27ae60" : alert.status === "investigating" ? "#e67e22" : "#c0392b"
                          }}
                        >
                          {alert.status}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px", fontSize: 12, color: "#786f63" }}>
                        {new Date(alert.timestamp).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {alert.status !== "resolved" && (
                          <button
                            onClick={() => updateAlertStatus(alert.id, "resolved")}
                            style={{
                              backgroundColor: "#1a1612",
                              color: "#ffffff",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 500,
                              cursor: "pointer"
                            }}
                          >
                            Resolve Alert
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
