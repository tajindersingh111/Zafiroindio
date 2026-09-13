"use client";
import React, { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  itemDescription?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isSuperAdmin?: boolean;
  requireTextConfirm?: boolean;
  confirmTextValue?: string;
}

export function DeleteConfirmModal({
  isOpen,
  title,
  itemDescription,
  onClose,
  onConfirm,
  isSuperAdmin = true,
  requireTextConfirm = false,
  confirmTextValue = "DELETE"
}: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [typedValue, setTypedValue] = useState("");

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (requireTextConfirm && typedValue.trim().toUpperCase() !== confirmTextValue.toUpperCase()) {
      return;
    }
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
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
          maxWidth: 480,
          width: "100%",
          padding: 28,
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          border: "1px solid #fee2e2",
          position: "relative"
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#6b7280"
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#dc2626",
              flexShrink: 0
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111827" }}>
              {title}
            </h3>
            <span
              style={{
                display: "inline-block",
                marginTop: 4,
                fontSize: 11,
                fontWeight: 700,
                color: "#991b1b",
                backgroundColor: "#fee2e2",
                padding: "2px 8px",
                borderRadius: 4,
                textTransform: "uppercase"
              }}
            >
              Super Admin Action Required
            </span>
          </div>
        </div>

        <p style={{ color: "#4b5563", fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
          {itemDescription ||
            "Are you sure you want to permanently delete this item? This action cannot be undone and will be permanently recorded in the system security audit log."}
        </p>

        {requireTextConfirm && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Type <strong style={{ color: "#dc2626" }}>{confirmTextValue}</strong> to confirm:
            </label>
            <input
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={confirmTextValue}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                fontSize: 14,
                outline: "none"
              }}
            />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: "10px 18px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              color: "#374151",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              loading ||
              (requireTextConfirm && typedValue.trim().toUpperCase() !== confirmTextValue.toUpperCase())
            }
            style={{
              padding: "10px 20px",
              borderRadius: 6,
              border: "none",
              backgroundColor:
                requireTextConfirm && typedValue.trim().toUpperCase() !== confirmTextValue.toUpperCase()
                  ? "#fca5a5"
                  : "#dc2626",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            <Trash2 size={16} />
            {loading ? "Deleting..." : "Permanently Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
