import type { Expense } from "@/lib/db/types";
import { readCollection, getDoc, upsertDoc, deleteDoc } from "@/lib/db/store";


export async function getAllExpenses(): Promise<Expense[]> {
  return readCollection<Expense>("expenses");
}

export async function saveExpense(expenseData: Partial<Expense> & { title: string; amount: number; category: Expense["category"]; classification: Expense["classification"] }): Promise<Expense> {
  const now = new Date().toISOString();

  const newExpense: Expense = {
    id: expenseData.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: expenseData.title,
    amount: Math.max(0, Number(expenseData.amount) || 0),
    category: expenseData.category,
    classification: expenseData.classification,
    allocation: expenseData.allocation || "none",
    productId: expenseData.productId,
    orderId: expenseData.orderId,
    notes: expenseData.notes || "",
    expenseDate: expenseData.expenseDate || now.split("T")[0],
    createdBy: expenseData.createdBy || "Admin User",
    createdByRole: expenseData.createdByRole || "admin",
    createdAt: expenseData.createdAt || now,
    updatedAt: now
  };

  const existing = await getDoc<Expense>("expenses", newExpense.id);
  const saved: Expense = existing ? { ...existing, ...newExpense, updatedAt: now } : newExpense;
  await upsertDoc("expenses", saved);
  return saved;
}

export async function deleteExpense(id: string): Promise<boolean> {
  return deleteDoc("expenses", id);
}
