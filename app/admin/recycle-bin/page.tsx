"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Trash2, RotateCcw, Shield, AlertTriangle, RefreshCw, X, Check } from "lucide-react";
import { DeleteConfirmModal } from "@/components/admin/DeleteConfirmModal";

interface TrashItem {
  id: string;
  originalId: string;
  module: string;
  recordName: string;
  deletedBy: string;
  deletedByRole: string;
  deletedAt: string;
  data: any;
  reason?: string;
}

export default function RecycleBinPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<TrashItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchRecycleItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/recycle-bin");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecycleItems();
  }, []);

  const handleRestore = async (recycleId: string) => {
    if (!confirm("Are you sure you want to restore this record back to the database?")) return;
    try {
      const res = await fetch("/api/admin/recycle-bin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recycleId, action: "restore" })
      });
      if (res.ok) {
        fetchRecycleItems();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!selectedItem) return;
    try {
      const res = await fetch("/api/admin/recycle-bin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recycleId: selectedItem.id, action: "permanent_delete" })
      });
      if (res.ok) {
        fetchRecycleItems();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSelectedItem(null);
      setModalOpen(false);
    }
  };

  return (
    <main style={{ padding: 24, backgroundColor: "#faf8f5", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Trash2 size={28} style={{ color: "#1a1612" }} />
              <h1 className="serif" style={{ fontSize: 28, fontWeight: 500, margin: 0, color: "#1a1612" }}>
                Super Admin Recycle Bin & Recovery System
              </h1>
            </div>
            <p style={{ color: "#786f63", fontSize: 14, marginTop: 4 }}>
              Soft-deleted records repository. Restore original items or permanently delete with Super Admin authorization.
            </p>
          </div>

          <button
            onClick={fetchRecycleItems}
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #dcd4c8",
              padding: "9px 16px",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer"
            }}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh Recycle Bin
          </button>
        </div>

        {/* Security Notice */}
        <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", padding: 16, borderRadius: 10, marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <Shield size={22} style={{ color: "#dc2626" }} />
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#991b1b" }}>
              Super Admin Exclusive Permanent Delete Restriction Active
            </h4>
            <p style={{ margin: 0, fontSize: 12, color: "#7f1d1d" }}>
              Normal operational deletes move items into this Recycle Bin. Permanent removal requires explicit Super Admin confirmation and creates an immutable audit trail.
            </p>
          </div>
        </div>

        {/* Recycle Bin Table */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: 12, border: "1px solid #e8e2d9", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0eae1", backgroundColor: "#faf8f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "#1a1612" }}>
              Soft-Deleted Records ({items.length})
            </h3>
            <span style={{ fontSize: 12, color: "#786f63" }}>
              Products, Banners, Categories, Coupons & Website Content
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e8e2d9" }}>
                  <th style={{ padding: "12px 16px", color: "#554e44" }}>Record Name</th>
                  <th style={{ padding: "12px 16px", color: "#554e44" }}>Module</th>
                  <th style={{ padding: "12px 16px", color: "#554e44" }}>Deleted By</th>
                  <th style={{ padding: "12px 16px", color: "#554e44" }}>Deletion Date</th>
                  <th style={{ padding: "12px 16px", color: "#554e44", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#786f63" }}>
                      Loading recycle bin records...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#786f63" }}>
                      Recycle Bin is empty. No soft-deleted items found.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f0eae1" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#1a1612" }}>{item.recordName}</div>
                        <div style={{ fontSize: 11, color: "#8c8275", fontFamily: "monospace" }}>ID: {item.originalId}</div>
                      </td>

                      <td style={{ padding: "14px 16px", textTransform: "capitalize", color: "#2c251e" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: "#f5eee6",
                            color: "#8c5e2b"
                          }}
                        >
                          {item.module}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ color: "#2c251e" }}>{item.deletedBy}</div>
                        <div style={{ fontSize: 11, color: "#8c8275" }}>{item.deletedByRole}</div>
                      </td>

                      <td style={{ padding: "14px 16px", fontSize: 12, color: "#786f63" }}>
                        {new Date(item.deletedAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                          <button
                            onClick={() => handleRestore(item.id)}
                            style={{
                              backgroundColor: "#1a1612",
                              color: "#ffffff",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 500,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4
                            }}
                          >
                            <RotateCcw size={14} /> Restore Item
                          </button>

                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setModalOpen(true);
                            }}
                            style={{
                              backgroundColor: "#fee2e2",
                              color: "#991b1b",
                              border: "1px solid #fecaca",
                              padding: "6px 12px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4
                            }}
                          >
                            <Trash2 size={14} /> Permanent Delete
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

        {/* Permanent Delete Modal */}
        {selectedItem && (
          <DeleteConfirmModal
            isOpen={modalOpen}
            title={`PERMANENTLY DELETE ${selectedItem.recordName.toUpperCase()}?`}
            itemDescription={`WARNING: This will permanently erase ${selectedItem.recordName} (Module: ${selectedItem.module}) from the Zafiro Indio system. This action CANNOT be undone.`}
            onClose={() => {
              setModalOpen(false);
              setSelectedItem(null);
            }}
            onConfirm={confirmPermanentDelete}
            requireTextConfirm={true}
            confirmTextValue="CONFIRM DELETE"
          />
        )}

      </div>
    </main>
  );
}
