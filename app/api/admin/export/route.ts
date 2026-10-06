import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse, forbiddenResponse, isSuperAdmin } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/db/audit";
import { readCollection, writeCollection } from "@/lib/db/store";
import { guarded } from "@/lib/auth/guard";
import { canAccessSection, type Section } from "@/lib/auth/access";

async function handlePOST(request: NextRequest) {
  const session = await getAuthSession(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json() as { exportType: "customers" | "orders" | "products" | "inventory" | "audit_logs" };
    const { exportType } = body;

    // Export authorization matrix rules
    if (exportType === "audit_logs" && !isSuperAdmin(session.role)) {
      return forbiddenResponse("Audit Log export is exclusively restricted to Super Admin.");
    }

    const needed: Record<string, Section> = { customers: "customers", orders: "orders", products: "inventory", inventory: "inventory" };
    const section = needed[exportType];
    if (!section && exportType !== "audit_logs") {
      return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
    }
    if (section && !canAccessSection(session.role, session.allowedSections, section)) {
      return forbiddenResponse("Your role does not have permission to export this data.");
    }

    // Log Export Audit Trail
    await createAuditLog({
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
    const exportLogs = await readCollection<any>("export-logs");
    exportLogs.unshift({
      id: `exp-${Date.now()}`,
      userId: session.userId,
      userEmail: session.email,
      role: session.role,
      exportType,
      timestamp: new Date().toISOString()
    });
    await writeCollection("export-logs", exportLogs.slice(0, 300));

    return NextResponse.json({ success: true, message: `Export authorized for ${exportType}.` });
  } catch (err) {
    return NextResponse.json({ error: "Export authorization failed." }, { status: 500 });
  }
}

export const POST = guarded(handlePOST);
