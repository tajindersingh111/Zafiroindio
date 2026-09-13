import { NextRequest, NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import type { AuditLogEntry } from "@/lib/db/audit";

export async function GET(request: NextRequest) {
  // STRICT SUPER ADMIN ACCESS RESTRICTION
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.toLowerCase() || "";
  const user = searchParams.get("user")?.toLowerCase() || "";
  const role = searchParams.get("role")?.toLowerCase() || "";
  const moduleParam = searchParams.get("module")?.toLowerCase() || "";
  const action = searchParams.get("action")?.toLowerCase() || "";
  const status = searchParams.get("status")?.toLowerCase() || "";
  const suspiciousOnly = searchParams.get("suspicious") === "true";
  
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "25");

  let logs = readCollection<any>("activity-log");

  // Map legacy logs if any
  let mappedLogs: AuditLogEntry[] = logs.map((l: any, idx: number) => ({
    id: l.id || `AUD-${10000 + idx}`,
    userId: l.userId || l.user || "usr-admin",
    userName: l.userName || l.user || "Admin User",
    userRole: l.userRole || "super_admin",
    action: l.action || "ACTIVITY_LOGGED",
    module: l.module || l.objectType || "system",
    recordId: l.recordId || l.objectId || "-",
    recordName: l.recordName || l.description || l.recordId || "-",
    previousData: l.previousData ?? null,
    updatedData: l.updatedData ?? null,
    status: l.status || "success",
    riskLevel: l.riskLevel || (l.action?.includes("DELETE") ? "CRITICAL" : l.action?.includes("PRICE") ? "HIGH" : "LOW"),
    timestamp: l.timestamp || l.createdAt || new Date().toISOString(),
    ipAddress: l.ipAddress || "127.0.0.1",
    isSuspicious: l.isSuspicious || l.status === "failed" || l.status === "unauthorized_blocked"
  }));

  // Filtering
  if (search) {
    mappedLogs = mappedLogs.filter((l) =>
      l.userName.toLowerCase().includes(search) ||
      l.userId.toLowerCase().includes(search) ||
      l.action.toLowerCase().includes(search) ||
      l.module.toLowerCase().includes(search) ||
      (l.recordId && l.recordId.toLowerCase().includes(search)) ||
      (l.recordName && l.recordName.toLowerCase().includes(search))
    );
  }

  if (user) mappedLogs = mappedLogs.filter((l) => l.userName.toLowerCase().includes(user) || l.userId.toLowerCase().includes(user));
  if (role) mappedLogs = mappedLogs.filter((l) => l.userRole.toLowerCase().includes(role));
  if (moduleParam) mappedLogs = mappedLogs.filter((l) => l.module.toLowerCase() === moduleParam);
  if (action) mappedLogs = mappedLogs.filter((l) => l.action.toLowerCase().includes(action));
  if (status) mappedLogs = mappedLogs.filter((l) => l.status.toLowerCase() === status);
  if (suspiciousOnly) mappedLogs = mappedLogs.filter((l) => l.isSuspicious);

  // Sort newest first
  mappedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const suspiciousCount = mappedLogs.filter((l) => l.isSuspicious).length;
  const total = mappedLogs.length;
  const start = (page - 1) * pageSize;
  const paginated = mappedLogs.slice(start, start + pageSize);

  return NextResponse.json({
    logs: paginated,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    suspiciousCount
  });
}

// IMMUTABLE AUDIT LOG PROTECTION: DISALLOW MANUAL DELETION OR MODIFICATION
export async function DELETE() {
  return NextResponse.json(
    { error: "Forbidden. Audit logs are immutable system records and cannot be deleted." },
    { status: 403 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Forbidden. Audit logs are immutable system records and cannot be edited." },
    { status: 403 }
  );
}
