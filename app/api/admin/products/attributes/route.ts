import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Attribute } from "@/lib/db/types";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const attributes = readCollection<Attribute>("attributes");
  return NextResponse.json({ attributes });
}

export async function POST(request: Request) {
  const body = await request.json() as Partial<Attribute>;
  const attributes = readCollection<Attribute>("attributes");
  const now = new Date().toISOString();
  const newAttr: Attribute = {
    id: uuidv4(),
    name: body.name ?? "",
    values: body.values ?? [],
    createdAt: now,
  };
  attributes.push(newAttr);
  writeCollection("attributes", attributes);
  return NextResponse.json({ attribute: newAttr }, { status: 201 });
}
