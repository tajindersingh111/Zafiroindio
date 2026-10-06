import type { CostHistoryEntry } from "@/lib/db/types";
import { upsertDoc, readCollection } from "@/lib/db/store";

export async function recordCostHistory(params: {
  productId: string;
  productName: string;
  previousCost: number;
  newCost: number;
  changedBy: string;
  reason?: string;
}): Promise<CostHistoryEntry | null> {
  if (params.previousCost === params.newCost) return null;

  try {
    const entry: CostHistoryEntry = {
      id: `ch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productId: params.productId,
      productName: params.productName,
      previousCost: params.previousCost || 0,
      newCost: params.newCost || 0,
      changedBy: params.changedBy || "System User",
      reason: params.reason || "Manual cost update",
      createdAt: new Date().toISOString()
    };
    await upsertDoc("cost-history", entry);
    return entry;
  } catch (err) {
    console.error("Failed to record cost history:", err);
    return null;
  }
}

export async function getProductCostHistory(productId: string): Promise<CostHistoryEntry[]> {
  const all = await readCollection<CostHistoryEntry>("cost-history");
  return all.filter((h) => h.productId === productId);
}
