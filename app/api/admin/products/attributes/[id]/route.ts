import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Attribute } from "@/lib/db/types";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const attributes = readCollection<Attribute>("attributes");
  const filtered = attributes.filter((a) => a.id !== id);
  writeCollection("attributes", filtered);
  return NextResponse.json({ success: true });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as Partial<Attribute>;
  const attributes = readCollection<Attribute>("attributes");
  const index = attributes.findIndex((a) => a.id === id);

  if (index === -1) {
    return NextResponse.json({ error: "Attribute not found" }, { status: 404 });
  }

  attributes[index] = {
    ...attributes[index],
    name: body.name ?? attributes[index].name,
    values: body.values ?? attributes[index].values,
  };

  writeCollection("attributes", attributes);
  return NextResponse.json({ attribute: attributes[index] });
}
