import type { Expense } from "@/lib/db/types";

const expensesBuffer: Expense[] = [];

export function getAllExpenses(): Expense[] {
  return expensesBuffer;
}

export function saveExpense(expenseData: Partial<Expense> & { title: string; amount: number; category: Expense["category"]; classification: Expense["classification"] }): Expense {
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

  const existingIndex = expensesBuffer.findIndex((e) => e.id === newExpense.id);
  if (existingIndex >= 0) {
    expensesBuffer[existingIndex] = { ...expensesBuffer[existingIndex], ...newExpense, updatedAt: now };
  } else {
    expensesBuffer.unshift(newExpense);
  }

  return newExpense;
}

export function deleteExpense(id: string): boolean {
  const idx = expensesBuffer.findIndex((e) => e.id === id);
  if (idx < 0) return false;
  expensesBuffer.splice(idx, 1);
  return true;
}
