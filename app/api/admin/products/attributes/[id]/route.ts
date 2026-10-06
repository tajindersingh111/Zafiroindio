import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Attribute } from "@/lib/db/types";
import { guarded } from "@/lib/auth/guard";

async function handleDELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const attributes = await readCollection<Attribute>("attributes");
  const filtered = attributes.filter((a) => a.id !== id);
  await writeCollection("attributes", filtered);
  return NextResponse.json({ success: true });
}

async function handlePUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as Partial<Attribute>;
  const attributes = await readCollection<Attribute>("attributes");
  const index = attributes.findIndex((a) => a.id === id);

  if (index === -1) {
    return NextResponse.json({ error: "Attribute not found" }, { status: 404 });
  }

  attributes[index] = {
    ...attributes[index],
    name: body.name ?? attributes[index].name,
    values: body.values ?? attributes[index].values,
  };

  await writeCollection("attributes", attributes);
  return NextResponse.json({ attribute: attributes[index] });
}

export const DELETE = guarded(handleDELETE);
export const PUT = guarded(handlePUT);
