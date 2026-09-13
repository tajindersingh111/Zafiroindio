import { NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import type { Product, Order, Customer, Coupon } from "@/lib/db/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  if (!q) {
    return NextResponse.json({ products: [], orders: [], customers: [], coupons: [] });
  }

  const products = readCollection<Product>("products");
  const orders = readCollection<Order>("orders");
  const customers = readCollection<Customer>("customers");
  const coupons = readCollection<Coupon>("coupons");

  const matchingProducts = products.filter(
    (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  ).slice(0, 10);

  const matchingOrders = orders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q)
  ).slice(0, 10);

  const matchingCustomers = customers.filter(
    (c) =>
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.company && c.company.toLowerCase().includes(q))
  ).slice(0, 10);

  const matchingCoupons = coupons.filter(
    (c) => c.code.toLowerCase().includes(q)
  ).slice(0, 10);

  return NextResponse.json({
    products: matchingProducts.map((p) => ({ id: p.id, name: p.name, sku: p.sku, price: p.price })),
    orders: matchingOrders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, customerName: o.customerName, total: o.total, status: o.status })),
    customers: matchingCustomers.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, email: c.email, company: c.company })),
    coupons: matchingCoupons.map((c) => ({ id: c.id, code: c.code, amount: c.amount, type: c.type })),
  });
}
