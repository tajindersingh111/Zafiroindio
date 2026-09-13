import { NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import type { Product, Customer } from "@/lib/db/types";

export async function GET() {
  const products = readCollection<Product>("products");
  const customers = readCollection<Customer>("customers");

  const lowStock = products.filter((p) => p.stockStatus === "low_stock");
  const inactiveCustomers = customers.filter((c) => {
    if (!c.lastOrderDate) return true;
    const diffMs = new Date().getTime() - new Date(c.lastOrderDate).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 60;
  });

  const list = [
    {
      id: "opp-1",
      category: "Retention Opportunity",
      title: "Re-engage Inactive Buyers",
      reason: `${inactiveCustomers.length} registered customers have not purchased from the store in the last 60 days.`,
      supportingMetric: "AOV impact: ~₹2,500/order recovery potential.",
      potentialAction: "Launch re-engagement discount campaign journey offering natural linen incentives.",
      priority: "high"
    },
    {
      id: "opp-2",
      category: "Inventory Opportunity",
      title: "Stock-out Risk Warnings",
      reason: `${lowStock.length} core linen products have dropped below set threshold levels.`,
      supportingMetric: "Estimated stock-out: 8 days based on sales velocities.",
      potentialAction: "Approve restocking recommendation inside forecast panel.",
      priority: "high"
    },
    {
      id: "opp-3",
      category: "Revenue Opportunity",
      title: "Product Bundle Cross-sells",
      reason: "Bedsheet linen items show high correlation with table runner placemats purchases.",
      supportingMetric: "Average basket value increase: +18% potential.",
      potentialAction: "Establish 'Frequently Bought Together' checkout widget.",
      priority: "medium"
    }
  ];

  return NextResponse.json(list);
}
