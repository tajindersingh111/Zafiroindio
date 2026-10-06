import { upsertDoc, listDocs } from "@/lib/db/store";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: "auth" | "products" | "orders" | "customers" | "inventory" | "banners" | "coupons" | "users" | "roles" | "settings" | "security";
  recordId?: string;
  recordName?: string;
  previousData?: any;
  updatedData?: any;
  status: "success" | "failed" | "unauthorized_blocked";
  riskLevel: RiskLevel;
  timestamp: string;
  ipAddress?: string;
  isSuspicious?: boolean;
}


export function determineRiskLevel(action: string, status?: string): RiskLevel {
  if (status === "unauthorized_blocked" || action.includes("DELETE") || action.includes("ROLE") || action.includes("OFFBOARD")) {
    return "CRITICAL";
  }
  if (action.includes("PRICE") || action.includes("INVENTORY") || action.includes("FAILED") || action.includes("DISABLED")) {
    return "HIGH";
  }
  if (action.includes("CREATE") || action.includes("UPDATE") || action.includes("STATUS")) {
    return "MEDIUM";
  }
  return "LOW";
}

export async function createAuditLog(params: {
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  module: "auth" | "products" | "orders" | "customers" | "inventory" | "banners" | "coupons" | "users" | "roles" | "settings" | "security";
  recordId?: string;
  recordName?: string;
  previousData?: any;
  updatedData?: any;
  status?: "success" | "failed" | "unauthorized_blocked";
  riskLevel?: RiskLevel;
  ipAddress?: string;
  isSuspicious?: boolean;
}): Promise<AuditLogEntry | null> {
  try {
    const statusVal = params.status || "success";
    const calculatedRisk = params.riskLevel || determineRiskLevel(params.action, statusVal);

    const newEntry: AuditLogEntry = {
      id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: params.userId || "usr-anon",
      userName: params.userName || "System User",
      userRole: params.userRole || "staff",
      action: params.action,
      module: params.module,
      recordId: params.recordId || "-",
      recordName: params.recordName || params.recordId || "-",
      previousData: params.previousData ?? null,
      updatedData: params.updatedData ?? null,
      status: statusVal,
      riskLevel: calculatedRisk,
      timestamp: new Date().toISOString(),
      ipAddress: params.ipAddress || "127.0.0.1",
      isSuspicious: params.isSuspicious || statusVal === "unauthorized_blocked" || statusVal === "failed" || calculatedRisk === "CRITICAL"
    };

    await upsertDoc("activity-log", newEntry);
    return newEntry;
  } catch (error) {
    console.error("Failed to write audit log:", error);
    return null;
  }
}

export async function getAuditLogs(limit = 500): Promise<AuditLogEntry[]> {
  return listDocs<AuditLogEntry>("activity-log", limit);
}
