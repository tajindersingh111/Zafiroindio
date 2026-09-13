import { createAuditLog } from "@/lib/db/audit";
import { readCollection, writeCollection } from "@/lib/db/store";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SecurityAlert {
  id: string;
  type: "auth" | "permission" | "business" | "system";
  severity: RiskLevel;
  title: string;
  description: string;
  userInvolved: string;
  userRole?: string;
  timestamp: string;
  status: "new" | "investigating" | "resolved" | "ignored";
  resolvedBy?: string;
  resolvedAt?: string;
}

/** Create a security alert in data/security-alerts.json */
export function createSecurityAlert(params: {
  type: "auth" | "permission" | "business" | "system";
  severity: RiskLevel;
  title: string;
  description: string;
  userInvolved: string;
  userRole?: string;
}) {
  try {
    const alerts = readCollection<SecurityAlert>("security-alerts");
    const newAlert: SecurityAlert = {
      id: `ALT-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      type: params.type,
      severity: params.severity,
      title: params.title,
      description: params.description,
      userInvolved: params.userInvolved,
      userRole: params.userRole || "unknown",
      timestamp: new Date().toISOString(),
      status: "new"
    };

    alerts.unshift(newAlert);
    writeCollection("security-alerts", alerts.slice(0, 500));
    return newAlert;
  } catch (err) {
    console.error("Failed to create security alert:", err);
    return null;
  }
}

/** Evaluate price change for safety thresholds */
export function evaluatePriceChange(
  productId: string,
  productName: string,
  oldPrice: number,
  newPrice: number,
  user?: { id?: string; email?: string; role?: string }
): { riskLevel: RiskLevel; percentChange: number; warningMessage?: string } {
  if (!oldPrice || oldPrice <= 0 || oldPrice === newPrice) {
    return { riskLevel: "LOW", percentChange: 0 };
  }

  const diff = newPrice - oldPrice;
  const percentChange = Math.round((Math.abs(diff) / oldPrice) * 100);
  let riskLevel: RiskLevel = "LOW";
  let warningMessage: string | undefined = undefined;

  if (percentChange >= 80) {
    riskLevel = "CRITICAL";
    warningMessage = `Extreme Price Change Warning: ${productName} price changed by ${diff < 0 ? "-" : "+"}${percentChange}% (₹${oldPrice} → ₹${newPrice}). Requires Super Admin verification.`;
  } else if (percentChange >= 50) {
    riskLevel = "HIGH";
    warningMessage = `High Risk Price Alert: ${productName} price changed by ${diff < 0 ? "-" : "+"}${percentChange}% (₹${oldPrice} → ₹${newPrice}).`;
  } else if (percentChange >= 20) {
    riskLevel = "MEDIUM";
    warningMessage = `Notice: Price changed by ${diff < 0 ? "-" : "+"}${percentChange}% (₹${oldPrice} → ₹${newPrice}).`;
  }

  if (riskLevel === "HIGH" || riskLevel === "CRITICAL") {
    createSecurityAlert({
      type: "business",
      severity: riskLevel,
      title: `Price Anomaly Detected (${percentChange}% Change)`,
      description: `${user?.email || "User"} changed ${productName} price from ₹${oldPrice} to ₹${newPrice}.`,
      userInvolved: user?.email || "Unknown User",
      userRole: user?.role || "staff"
    });
  }

  createAuditLog({
    userId: user?.id,
    userName: user?.email,
    userRole: user?.role,
    action: "PRODUCT_PRICE_CHANGED",
    module: "products",
    recordId: productId,
    recordName: productName,
    previousData: { price: oldPrice },
    updatedData: { price: newPrice, percentChange },
    riskLevel
  });

  return { riskLevel, percentChange, warningMessage };
}

/** Evaluate inventory anomaly */
export function evaluateInventoryChange(
  productId: string,
  productName: string,
  oldStock: number,
  newStock: number,
  reason?: string,
  user?: { id?: string; email?: string; role?: string }
): { riskLevel: RiskLevel; stockDiff: number } {
  const stockDiff = newStock - oldStock;
  const absDiff = Math.abs(stockDiff);
  let riskLevel: RiskLevel = "LOW";

  if (newStock < 0) {
    riskLevel = "CRITICAL";
    createSecurityAlert({
      type: "business",
      severity: "CRITICAL",
      title: "Negative Stock Attempt Blocked",
      description: `${user?.email || "User"} attempted to set ${productName} stock to negative (${newStock}).`,
      userInvolved: user?.email || "Unknown User",
      userRole: user?.role || "staff"
    });
  } else if (absDiff >= 50 || (oldStock > 0 && absDiff / oldStock >= 0.75)) {
    riskLevel = "HIGH";
    createSecurityAlert({
      type: "business",
      severity: "HIGH",
      title: "Large Inventory Adjustment Detected",
      description: `${user?.email || "User"} adjusted stock for ${productName} by ${stockDiff > 0 ? "+" : ""}${stockDiff} (Old: ${oldStock}, New: ${newStock}). Reason: ${reason || "Unspecified"}.`,
      userInvolved: user?.email || "Unknown User",
      userRole: user?.role || "staff"
    });
  } else if (absDiff >= 15) {
    riskLevel = "MEDIUM";
  }

  createAuditLog({
    userId: user?.id,
    userName: user?.email,
    userRole: user?.role,
    action: stockDiff < 0 ? "INVENTORY_DECREASED" : "INVENTORY_INCREASED",
    module: "inventory",
    recordId: productId,
    recordName: productName,
    previousData: { stock: oldStock },
    updatedData: { stock: newStock, reason: reason || "Manual adjustment" },
    riskLevel
  });

  return { riskLevel, stockDiff };
}
