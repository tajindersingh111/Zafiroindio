import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse, forbiddenResponse, isSuperAdmin } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/db/audit";
import { readCollection, writeCollection } from "@/lib/db/store";

export async function POST(request: NextRequest) {
  const session = await getAuthSession(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json() as { exportType: "customers" | "orders" | "products" | "inventory" | "audit_logs" };
    const { exportType } = body;

    // Export authorization matrix rules
    if (exportType === "audit_logs" && !isSuperAdmin(session.role)) {
      return forbiddenResponse("Audit Log export is exclusively restricted to Super Admin.");
    }

    if (exportType === "customers" && session.role === "staff") {
      return forbiddenResponse("Staff role does not have permission to export customer databases.");
    }

    // Log Export Audit Trail
    createAuditLog({
      userId: session.userId,
      userName: session.email,
      userRole: session.role,
      action: `DATA_EXPORTED_${exportType.toUpperCase()}`,
      module: exportType === "audit_logs" ? "security" : (exportType as any),
      recordId: exportType,
      recordName: `Data Export (${exportType})`,
      riskLevel: exportType === "audit_logs" || exportType === "customers" ? "HIGH" : "MEDIUM"
    });

    // Record export log
    const exportLogs = readCollection<any>("export-logs");
    exportLogs.unshift({
      id: `exp-${Date.now()}`,
      userId: session.userId,
      userEmail: session.email,
      role: session.role,
      exportType,
      timestamp: new Date().toISOString()
    });
    writeCollection("export-logs", exportLogs.slice(0, 300));

    return NextResponse.json({ success: true, message: `Export authorized for ${exportType}.` });
  } catch (err) {
    return NextResponse.json({ error: "Export authorization failed." }, { status: 500 });
  }
}
