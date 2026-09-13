import { readCollection, writeCollection } from "@/lib/db/store";
import type { CostHistoryEntry } from "@/lib/db/types";

export function recordCostHistory(params: {
  productId: string;
  productName: string;
  previousCost: number;
  newCost: number;
  changedBy: string;
  reason?: string;
}): CostHistoryEntry | null {
  if (params.previousCost === params.newCost) return null;

  try {
    const history = readCollection<CostHistoryEntry>("cost-history");
    const entry: CostHistoryEntry = {
      id: `ch-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      productId: params.productId,
      productName: params.productName,
      previousCost: params.previousCost || 0,
      newCost: params.newCost || 0,
      changedBy: params.changedBy || "System User",
      reason: params.reason || "Manual cost update",
      createdAt: new Date().toISOString()
    };

    history.unshift(entry);
    writeCollection("cost-history", history.slice(0, 500));
    return entry;
  } catch (err) {
    console.error("Failed to record cost history:", err);
    return null;
  }
}

export function getProductCostHistory(productId: string): CostHistoryEntry[] {
  const history = readCollection<CostHistoryEntry>("cost-history");
  return history.filter((h) => h.productId === productId);
}
