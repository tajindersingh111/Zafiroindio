import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Category } from "@/lib/db/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json() as Partial<Category>;
  const cats = readCollection<Category>("categories");
  const idx = cats.findIndex((c) => c.id === id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  cats[idx] = { ...cats[idx], ...body, id };
  writeCollection("categories", cats);
  return NextResponse.json({ category: cats[idx] });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let cats = readCollection<Category>("categories");
  if (!cats.some((c) => c.id === id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  cats = cats.filter((c) => c.id !== id);
  writeCollection("categories", cats);
  return NextResponse.json({ success: true });
}
