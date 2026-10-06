import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Category } from "@/lib/db/types";
import { v4 as uuidv4 } from "uuid";
import { guarded } from "@/lib/auth/guard";

async function handleGET() {
  const categories = await readCollection<Category>("categories");
  return NextResponse.json({ categories });
}

async function handlePOST(request: Request) {
  const body = await request.json() as Partial<Category>;
  const categories = await readCollection<Category>("categories");
  const now = new Date().toISOString();
  const newCat: Category = {
    id: uuidv4(),
    name: body.name ?? "",
    slug: (body.name ?? "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    parentId: body.parentId,
    description: body.description ?? "",
    image: body.image,
    createdAt: now,
  };
  categories.push(newCat);
  await writeCollection("categories", categories);
  return NextResponse.json({ category: newCat }, { status: 201 });
}

async function handleDELETE(request: Request) {
  const { requireSuperAdmin } = require("@/lib/auth/rbac");
  const { createAuditLog } = require("@/lib/db/audit");

  const auth = await requireSuperAdmin(request as any);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Category ID required" }, { status: 400 });

  let categories = await readCollection<Category>("categories");
  const target = categories.find((c) => c.id === id);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  categories = categories.filter((c) => c.id !== id);
  await writeCollection("categories", categories);

  await createAuditLog({
    userId: auth.session?.userId,
    userName: auth.session?.email,
    userRole: auth.session?.role,
    action: "DELETE_CATEGORY",
    module: "categories",
    recordId: id,
    previousData: target
  });

  return NextResponse.json({ success: true });
}

export const GET = guarded(handleGET);
export const POST = guarded(handlePOST);
export const DELETE = guarded(handleDELETE);
