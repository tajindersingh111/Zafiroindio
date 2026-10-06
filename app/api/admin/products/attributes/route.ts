import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Attribute } from "@/lib/db/types";
import { v4 as uuidv4 } from "uuid";
import { guarded } from "@/lib/auth/guard";

async function handleGET() {
  const attributes = await readCollection<Attribute>("attributes");
  return NextResponse.json({ attributes });
}

async function handlePOST(request: Request) {
  const body = await request.json() as Partial<Attribute>;
  const attributes = await readCollection<Attribute>("attributes");
  const now = new Date().toISOString();
  const newAttr: Attribute = {
    id: uuidv4(),
    name: body.name ?? "",
    values: body.values ?? [],
    createdAt: now,
  };
  attributes.push(newAttr);
  await writeCollection("attributes", attributes);
  return NextResponse.json({ attribute: newAttr }, { status: 201 });
}

export const GET = guarded(handleGET);
export const POST = guarded(handlePOST);
