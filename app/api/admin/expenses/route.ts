import { NextResponse } from "next/server";
import { getAllExpenses, saveExpense, deleteExpense } from "@/lib/db/expenses";
import { createAuditLog } from "@/lib/db/audit";
import type { Expense } from "@/lib/db/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const classification = searchParams.get("classification");
    const search = searchParams.get("search")?.toLowerCase();

    let expenses = getAllExpenses();

    if (category) {
      expenses = expenses.filter((e) => e.category === category);
    }
    if (classification) {
      expenses = expenses.filter((e) => e.classification === classification);
    }
    if (search) {
      expenses = expenses.filter(
        (e) => e.title.toLowerCase().includes(search) || (e.notes && e.notes.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({ expenses });
  } catch (err) {
    console.error("Error listing expenses:", err);
    return NextResponse.json({ error: "Failed to load expenses." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Data Validation
    if (!body.title || typeof body.title !== "string" || body.title.trim() === "") {
      return NextResponse.json({ error: "Expense title is required." }, { status: 400 });
    }
    if (body.amount === undefined || body.amount === null || Number(body.amount) < 0) {
      return NextResponse.json({ error: "Valid non-negative expense amount is required." }, { status: 400 });
    }
    if (!body.category) {
      return NextResponse.json({ error: "Expense category is required." }, { status: 400 });
    }
    if (!body.classification) {
      return NextResponse.json({ error: "Expense classification is required." }, { status: 400 });
    }

    const saved = saveExpense(body);

    createAuditLog({
      userId: body.createdBy || "usr-admin",
      userName: body.createdBy || "Admin User",
      userRole: body.createdByRole || "admin",
      action: body.id ? "UPDATE_EXPENSE" : "CREATE_EXPENSE",
      module: "settings",
      recordId: saved.id,
      recordName: saved.title,
      updatedData: saved,
      status: "success",
      riskLevel: "MEDIUM"
    });

    return NextResponse.json({ expense: saved }, { status: 201 });
  } catch (err) {
    console.error("Error creating expense:", err);
    return NextResponse.json({ error: "Failed to create expense." }, { status: 500 });
  }
}
