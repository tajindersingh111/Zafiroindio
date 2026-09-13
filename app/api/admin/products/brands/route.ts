import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Brand } from "@/lib/db/types";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const brands = readCollection<Brand>("brands");
  return NextResponse.json({ brands });
}

export async function POST(request: Request) {
  const body = await request.json() as Partial<Brand>;
  const brands = readCollection<Brand>("brands");
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
  writeCollection("brands", brands);
  return NextResponse.json({ brand: newBrand }, { status: 201 });
}
