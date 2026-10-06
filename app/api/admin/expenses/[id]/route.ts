import { NextResponse } from "next/server";
import { getAllExpenses, saveExpense, deleteExpense } from "@/lib/db/expenses";
import { createAuditLog } from "@/lib/db/audit";
import { guarded } from "@/lib/auth/guard";
import { getAuthSession } from "@/lib/auth/rbac";

async function handlePUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getAuthSession(request))!;
    const { id } = await params;
    const body = await request.json();
    const existing = (await getAllExpenses()).find((e) => e.id === id);

    if (!existing) {
      return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    }

    const updated = await saveExpense({ ...existing, ...body, id });

    await createAuditLog({
      userId: session.userId,
      userName: session.name,
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

async function handleDELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getAuthSession(request))!;
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userRole = session.role;
    const userName = session.name;
    const userId = session.userId;

    const existing = (await getAllExpenses()).find((e) => e.id === id);
    if (!existing) {
      return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    }

    // RBAC: Only Super Admin can permanently delete expense records
    if (userRole !== "super_admin") {
      await createAuditLog({
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

    const success = await deleteExpense(id);

    await createAuditLog({
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

export const PUT = guarded(handlePUT);
export const DELETE = guarded(handleDELETE);
