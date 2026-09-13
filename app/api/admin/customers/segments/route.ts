import { NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import type { Customer, Order } from "@/lib/db/types";

interface AbandonedCart {
  id: string;
  customerEmail: string;
  status: string;
}

function parseDate(d: string) { return new Date(d); }

export async function GET() {
  const customers = readCollection<Customer>("customers");
  const orders = readCollection<Order>("orders");
  const carts = readCollection<AbandonedCart>("abandoned-carts");

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // Segment groups
  const highValue = customers.filter((c) => c.totalSpent >= 10000 || c.totalOrders >= 3);
  const newCust = customers.filter((c) => parseDate(c.registeredAt) >= thirtyDaysAgo);
  const inactiveCust = customers.filter((c) => {
    if (!c.lastOrderDate) return true;
    return parseDate(c.lastOrderDate) < sixtyDaysAgo;
  });
  const frequentBuyers = customers.filter((c) => c.totalOrders >= 3);
  const abandoners = customers.filter((c) => 
    carts.some((cart) => cart.customerEmail === c.email && cart.status !== "recovered")
  );

  const formatSegment = (name: string, list: Customer[]) => {
    const revenue = list.reduce((s, c) => s + c.totalSpent, 0);
    const orderCount = list.reduce((s, c) => s + c.totalOrders, 0);
    const aov = list.length > 0 ? revenue / list.length : 0;
    return {
      name,
      count: list.length,
      revenue,
      orders: orderCount,
      aov,
      customers: list.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        company: c.company,
        spent: c.totalSpent,
        orders: c.totalOrders
      }))
    };
  };

  return NextResponse.json({
    highValue: formatSegment("High Value Customers", highValue),
    newCustomers: formatSegment("New Customers", newCust),
    inactive: formatSegment("Inactive Customers", inactiveCust),
    frequent: formatSegment("Frequent Buyers", frequentBuyers),
    abandoners: formatSegment("Cart Abandoners", abandoners)
  });
}
