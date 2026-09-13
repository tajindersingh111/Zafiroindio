import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Customer } from "@/lib/db/types";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const type = searchParams.get("type") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");
  const sortBy = searchParams.get("sortBy") ?? "registeredAt";
  const sortDir = searchParams.get("sortDir") ?? "desc";

  let customers = readCollection<Customer>("customers");

  if (search) {
    customers = customers.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        (c.phone ?? "").includes(search) ||
        (c.company ?? "").toLowerCase().includes(search)
    );
  }
  if (type) customers = customers.filter((c) => c.type === type);
  if (status) customers = customers.filter((c) => c.status === status);

  // Sort
  customers.sort((a, b) => {
    let av = 0, bv = 0;
    if (sortBy === "totalSpent") { av = a.totalSpent; bv = b.totalSpent; }
    else if (sortBy === "totalOrders") { av = a.totalOrders; bv = b.totalOrders; }
    else { av = new Date(a.registeredAt).getTime(); bv = new Date(b.registeredAt).getTime(); }
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const total = customers.length;
  const start = (page - 1) * pageSize;
  const paginated = customers.slice(start, start + pageSize);

  return NextResponse.json({ customers: paginated, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<Customer>;
    const customers = readCollection<Customer>("customers");

    if (customers.some((c) => c.email === body.email)) {
      return NextResponse.json({ error: "Email already exists." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newCustomer: Customer = {
      id: uuidv4(),
      type: body.type ?? "retail",
      status: body.status ?? "active",
      firstName: body.firstName ?? "",
      lastName: body.lastName ?? "",
      email: body.email ?? "",
      phone: body.phone,
      company: body.company,
      billing: body.billing,
      shipping: body.shipping,
      totalOrders: 0,
      totalSpent: 0,
      registeredAt: now,
      updatedAt: now,
    };

    customers.push(newCustomer);
    writeCollection("customers", customers);
    return NextResponse.json({ customer: newCustomer }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create customer." }, { status: 500 });
  }
}
