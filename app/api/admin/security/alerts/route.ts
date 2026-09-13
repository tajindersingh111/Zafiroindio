import { NextRequest, NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import type { SecurityAlert } from "@/lib/db/anomalies";
import { createAuditLog } from "@/lib/db/audit";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const severity = searchParams.get("severity");
  const type = searchParams.get("type");
  const status = searchParams.get("status");

  let alerts = readCollection<SecurityAlert>("security-alerts");

  if (severity) alerts = alerts.filter((a) => a.severity.toLowerCase() === severity.toLowerCase());
  if (type) alerts = alerts.filter((a) => a.type.toLowerCase() === type.toLowerCase());
  if (status) alerts = alerts.filter((a) => a.status.toLowerCase() === status.toLowerCase());

  // Sort newest first
  alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const newCount = alerts.filter((a) => a.status === "new").length;
  const criticalCount = alerts.filter((a) => a.severity === "CRITICAL" && a.status !== "resolved").length;

  return NextResponse.json({ alerts, newCount, criticalCount });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json() as { alertId: string; status: "new" | "investigating" | "resolved" | "ignored" };
    if (!body.alertId || !body.status) {
      return NextResponse.json({ error: "alertId and status are required." }, { status: 400 });
    }

    const alerts = readCollection<SecurityAlert>("security-alerts");
    const idx = alerts.findIndex((a) => a.id === body.alertId);
    if (idx < 0) return NextResponse.json({ error: "Alert not found." }, { status: 404 });

    const prev = alerts[idx];
    alerts[idx].status = body.status;
    if (body.status === "resolved") {
      alerts[idx].resolvedBy = auth.session?.email;
      alerts[idx].resolvedAt = new Date().toISOString();
    }

    writeCollection("security-alerts", alerts);

    createAuditLog({
      userId: auth.session?.userId,
      userName: auth.session?.email,
      userRole: auth.session?.role,
      action: "SECURITY_ALERT_STATUS_UPDATED",
      module: "security",
      recordId: body.alertId,
      recordName: prev.title,
      previousData: { status: prev.status },
      updatedData: { status: body.status },
      riskLevel: "MEDIUM"
    });

    return NextResponse.json({ success: true, alert: alerts[idx] });
  } catch (err) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
