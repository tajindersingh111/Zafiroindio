import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { Product, Order, Customer, Coupon } from "@/lib/db/types";
import { guarded } from "@/lib/auth/guard";

type Row<T> = { data: T };

/**
 * Admin top-bar search. Matches in SQL (case-insensitive, null-safe: imported records often have null
 * names/emails), 10 results per type, instead of loading every order and customer per keystroke.
 */
async function handleGET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 100);
  if (!q) return NextResponse.json({ products: [], orders: [], customers: [], coupons: [] });

  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const [products, orders, customers, coupons] = await Promise.all([
    prisma.$queryRaw<Row<Product>[]>`
      SELECT data FROM documents WHERE collection = 'products'
        AND (coalesce(data->>'name', '') ILIKE ${like} OR coalesce(data->>'sku', '') ILIKE ${like})
      ORDER BY position LIMIT 10`,
    prisma.$queryRaw<Row<Order>[]>`
      SELECT data FROM documents WHERE collection = 'orders'
        AND (coalesce(data->>'orderNumber', '') ILIKE ${like} OR coalesce(data->>'customerName', '') ILIKE ${like}
             OR coalesce(data->>'customerEmail', '') ILIKE ${like} OR coalesce(data->>'customerPhone', '') ILIKE ${like})
      ORDER BY position LIMIT 10`,
    prisma.$queryRaw<Row<Customer>[]>`
      SELECT data FROM documents WHERE collection = 'customers'
        AND (coalesce(data->>'firstName', '') || ' ' || coalesce(data->>'lastName', '') ILIKE ${like}
             OR coalesce(data->>'email', '') ILIKE ${like} OR coalesce(data->>'phone', '') ILIKE ${like} OR coalesce(data->>'company', '') ILIKE ${like})
      ORDER BY position LIMIT 10`,
    prisma.$queryRaw<Row<Coupon>[]>`
      SELECT data FROM documents WHERE collection = 'coupons' AND coalesce(data->>'code', '') ILIKE ${like}
      ORDER BY position LIMIT 10`,
  ]);

  return NextResponse.json({
    products: products.map(({ data: p }) => ({ id: p.id, name: p.name, sku: p.sku, price: p.price })),
    orders: orders.map(({ data: o }) => ({ id: o.id, orderNumber: o.orderNumber, customerName: o.customerName, total: o.total, status: o.status })),
    customers: customers.map(({ data: c }) => ({ id: c.id, name: [c.firstName, c.lastName].filter(Boolean).join(" "), email: c.email, company: c.company })),
    coupons: coupons.map(({ data: c }) => ({ id: c.id, code: c.code, amount: c.amount, type: c.type })),
  });
}

export const GET = guarded(handleGET);
