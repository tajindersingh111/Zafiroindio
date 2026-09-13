import { readCollection, writeCollection } from "@/lib/db/store";
import type { Expense } from "@/lib/db/types";

export function getAllExpenses(): Expense[] {
  try {
    return readCollection<Expense>("expenses");
  } catch (err) {
    console.error("Failed to read expenses collection:", err);
    return [];
  }
}

export function saveExpense(expenseData: Partial<Expense> & { title: string; amount: number; category: Expense["category"]; classification: Expense["classification"] }): Expense {
  const expenses = getAllExpenses();
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

  const existingIndex = expenses.findIndex((e) => e.id === newExpense.id);
  if (existingIndex >= 0) {
    expenses[existingIndex] = { ...expenses[existingIndex], ...newExpense, updatedAt: now };
  } else {
    expenses.unshift(newExpense);
  }

  writeCollection("expenses", expenses);
  return newExpense;
}

export function deleteExpense(id: string): boolean {
  const expenses = getAllExpenses();
  const filtered = expenses.filter((e) => e.id !== id);
  if (filtered.length === expenses.length) return false;
  writeCollection("expenses", filtered);
  return true;
}
