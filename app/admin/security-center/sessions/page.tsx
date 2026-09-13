"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  LogOut,
  UserX,
  Shield,
  Laptop,
  Smartphone,
  Globe,
  Clock,
  RefreshCw,
  AlertTriangle
} from "lucide-react";

interface ActiveSession {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  loginTime: string;
  lastActivity: string;
  ipAddress: string;
  device: string;
  browser: string;
  status: "active" | "terminated" | "expired";
}

export default function ActiveSessionsPage() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [offboardId, setOffboardId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/security/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const terminateSingleSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to terminate this active session? The user will be force logged out.")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/security/sessions?sessionId=${sessionId}`, { method: "DELETE" });
      if (res.ok) fetchSessions();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOffboardUser = async (userId: string) => {
    if (!confirm("OFFBOARD EMPLOYEE WARNING: This will disable the user account, terminate all active sessions, and revoke access immediately. Audit logs will be preserved. Proceed?")) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/users/offboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        alert("Employee offboarded successfully.");
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
      setOffboardId(null);
    }
  };

  return (
    <main style={{ padding: 24, backgroundColor: "#faf8f5", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c8275", marginBottom: 4 }}>
              Super Admin Security Center
            </div>
            <h1 className="serif" style={{ fontSize: 28, fontWeight: 500, margin: 0, color: "#1a1612" }}>
              Active Session Management & Offboarding
            </h1>
            <p style={{ color: "#786f63", fontSize: 14, marginTop: 4 }}>
              Monitor active logged-in users, force logout sessions, and manage employee offboarding.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Link
              href="/admin/security-center"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #dcd4c8",
                color: "#2c251e",
                padding: "9px 16px",
                borderRadius: 8,
                fontSize: 13,
                textDecoration: "none"
              }}
            >
              ← Back to Security Center
            </Link>

            <button
              onClick={fetchSessions}
              style={{
                backgroundColor: "#1a1612",
                color: "#ffffff",
                border: "none",
                padding: "9px 16px",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer"
              }}
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>

        {/* Sessions Table */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: 12, border: "1px solid #e8e2d9", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0eae1", backgroundColor: "#faf8f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "#1a1612" }}>
              Logged-In Active User Sessions
            </h3>
            <span style={{ fontSize: 12, color: "#786f63" }}>
              Real-Time Session Monitoring
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e8e2d9" }}>
                  <th style={{ padding: "12px 16px", color: "#554e44" }}>User & Role</th>
                  <th style={{ padding: "12px 16px", color: "#554e44" }}>Device & Browser</th>
                  <th style={{ padding: "12px 16px", color: "#554e44" }}>IP Address</th>
                  <th style={{ padding: "12px 16px", color: "#554e44" }}>Login Time</th>
                  <th style={{ padding: "12px 16px", color: "#554e44" }}>Last Activity</th>
                  <th style={{ padding: "12px 16px", color: "#554e44" }}>Status</th>
                  <th style={{ padding: "12px 16px", color: "#554e44", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#786f63" }}>
                      Loading active session data...
                    </td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#786f63" }}>
                      No active sessions found.
                    </td>
                  </tr>
                ) : (
                  sessions.map((sess) => (
                    <tr key={sess.id} style={{ borderBottom: "1px solid #f0eae1" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#1a1612" }}>{sess.userEmail}</div>
                        <div style={{ fontSize: 11, color: "#8c8275", textTransform: "uppercase" }}>
                          {sess.userRole}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ color: "#2c251e" }}>{sess.device}</div>
                        <div style={{ fontSize: 11, color: "#8c8275" }}>{sess.browser}</div>
                      </td>

                      <td style={{ padding: "14px 16px", fontFamily: "monospace", color: "#554e44" }}>
                        {sess.ipAddress}
                      </td>

                      <td style={{ padding: "14px 16px", fontSize: 12, color: "#786f63" }}>
                        {new Date(sess.loginTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </td>

                      <td style={{ padding: "14px 16px", fontSize: 12, color: "#786f63" }}>
                        {new Date(sess.lastActivity).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: sess.status === "active" ? "#e6f4ea" : "#fce8e6",
                            color: sess.status === "active" ? "#137333" : "#c5221f"
                          }}
                        >
                          {sess.status.toUpperCase()}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {sess.status === "active" && (
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button
                              onClick={() => terminateSingleSession(sess.id)}
                              disabled={actionLoading}
                              style={{
                                border: "1px solid #dcd4c8",
                                backgroundColor: "#ffffff",
                                color: "#c0392b",
                                padding: "6px 10px",
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 4
                              }}
                            >
                              <LogOut size={14} /> Force Logout
                            </button>

                            {sess.userEmail !== "admin@zafiroindio.com" && (
                              <button
                                onClick={() => handleOffboardUser(sess.userId)}
                                disabled={actionLoading}
                                style={{
                                  border: "none",
                                  backgroundColor: "#8a2b2b",
                                  color: "#ffffff",
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 500,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4
                                }}
                              >
                                <UserX size={14} /> Offboard Employee
                              </button>
                            )}
                          </div>
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
