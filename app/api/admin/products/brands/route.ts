import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Brand } from "@/lib/db/types";
import { v4 as uuidv4 } from "uuid";
import { guarded } from "@/lib/auth/guard";

async function handleGET() {
  const brands = await readCollection<Brand>("brands");
  return NextResponse.json({ brands });
}

async function handlePOST(request: Request) {
  const body = await request.json() as Partial<Brand>;
  const brands = await readCollection<Brand>("brands");
  const now = new Date().toISOString();
  const newBrand: Brand = {
    id: uuidv4(),
    name: body.name ?? "",
    slug: (body.name ?? "").toLowerCase().replace(/\s+/g, "-"),
    description: body.description ?? "",
    logo: body.logo,
    createdAt: now,
  };
  brands.push(newBrand);
  await writeCollection("brands", brands);
  return NextResponse.json({ brand: newBrand }, { status: 201 });
}

export const GET = guarded(handleGET);
export const POST = guarded(handlePOST);
