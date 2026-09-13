import { NextResponse } from "next/server";
import { getAllExpenses, saveExpense, deleteExpense } from "@/lib/db/expenses";
import { createAuditLog } from "@/lib/db/audit";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const existing = getAllExpenses().find((e) => e.id === id);

    if (!existing) {
      return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    }

    const updated = saveExpense({ ...existing, ...body, id });

    createAuditLog({
      userId: body.updatedBy || "usr-admin",
      userName: body.updatedBy || "Admin User",
      userRole: body.updatedByRole || "admin",
      action: "UPDATE_EXPENSE",
      module: "settings",
      recordId: id,
      recordName: updated.title,
      previousData: existing,
      updatedData: updated,
      status: "success",
      riskLevel: "MEDIUM"
    });

    return NextResponse.json({ expense: updated });
  } catch (err) {
    console.error("Error updating expense:", err);
    return NextResponse.json({ error: "Failed to update expense." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get("role") || request.headers.get("x-user-role") || "admin";
    const userName = searchParams.get("userName") || request.headers.get("x-user-name") || "Admin User";
    const userId = searchParams.get("userId") || request.headers.get("x-user-id") || "usr-admin";

    const existing = getAllExpenses().find((e) => e.id === id);
    if (!existing) {
      return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    }

    // RBAC: Only Super Admin can permanently delete expense records
    if (userRole !== "super_admin") {
      createAuditLog({
        userId,
        userName,
        userRole,
        action: "UNAUTHORIZED_DELETE_EXPENSE_ATTEMPT",
        module: "settings",
        recordId: id,
        recordName: existing.title,
        status: "unauthorized_blocked",
        riskLevel: "CRITICAL"
      });

      return NextResponse.json(
        { error: "Access Denied: Only Super Admin can permanently delete expense records." },
        { status: 403 }
      );
    }

    const success = deleteExpense(id);

    createAuditLog({
      userId,
      userName,
      userRole,
      action: "PERMANENT_DELETE_EXPENSE",
      module: "settings",
      recordId: id,
      recordName: existing.title,
      previousData: existing,
      status: "success",
      riskLevel: "CRITICAL"
    });

    return NextResponse.json({ success, message: "Expense permanently deleted." });
  } catch (err) {
    console.error("Error deleting expense:", err);
    return NextResponse.json({ error: "Failed to delete expense." }, { status: 500 });
  }
}
