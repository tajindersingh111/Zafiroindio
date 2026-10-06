import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Category } from "@/lib/db/types";
import { guarded } from "@/lib/auth/guard";

async function handlePATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json() as Partial<Category>;
  const cats = await readCollection<Category>("categories");
  const idx = cats.findIndex((c) => c.id === id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  cats[idx] = { ...cats[idx], ...body, id };
  await writeCollection("categories", cats);
  return NextResponse.json({ category: cats[idx] });
}

async function handleDELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let cats = await readCollection<Category>("categories");
  if (!cats.some((c) => c.id === id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  cats = cats.filter((c) => c.id !== id);
  await writeCollection("categories", cats);
  return NextResponse.json({ success: true });
}

export const PATCH = guarded(handlePATCH);
export const DELETE = guarded(handleDELETE);
