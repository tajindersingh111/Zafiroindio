import { NextResponse } from "next/server";
import { mutateCollection, readCollection } from "@/lib/db/store";
import { guarded } from "@/lib/auth/guard";
import type { Artisan } from "@/lib/storefront/artisans";

const COLLECTION = "artisans";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Validated artisan fields from a request body (photo must be an uploaded or https URL). */
function clean(body: any): Omit<Artisan, "id"> | { error: string } {
  const name = text(body?.name, 80);
  const craft = text(body?.craft, 80);
  const story = text(body?.story, 900);
  const photo = text(body?.photo, 600);
  if (!name) return { error: "Name is required." };
  if (!craft) return { error: "Craft is required (e.g. Block printer)." };
  if (!story) return { error: "A short story is required." };
  if (!/^(https:\/\/|\/)/.test(photo)) return { error: "Upload a photo." };
  const years = Number(body?.years);
  return {
    name,
    craft,
    place: text(body?.place, 80) || undefined,
    years: Number.isFinite(years) && years > 0 && years < 100 ? Math.round(years) : undefined,
    story,
    photo,
    active: body?.active !== false,
  };
}

async function handleGET() {
  return NextResponse.json({ artisans: await readCollection<Artisan>(COLLECTION) });
}

async function handlePOST(req: Request) {
  const fields = clean(await req.json().catch(() => null));
  if ("error" in fields) return NextResponse.json(fields, { status: 400 });
  const artisan: Artisan = { id: `art-${Date.now()}`, ...fields };
  await mutateCollection<Artisan>(COLLECTION, (list) => {
    list.push(artisan);
  });
  return NextResponse.json({ artisan }, { status: 201 });
}

async function handlePUT(req: Request) {
  const body = await req.json().catch(() => null);
  const id = text(body?.id, 60);
  if (!id) return NextResponse.json({ error: "Artisan id is required." }, { status: 400 });

  // Reordering: { id, move: "up" | "down" }.
  if (body?.move === "up" || body?.move === "down") {
    const found = await mutateCollection<Artisan, boolean>(COLLECTION, (list) => {
      const i = list.findIndex((a) => a.id === id);
      const j = body.move === "up" ? i - 1 : i + 1;
      if (i < 0) return false;
      if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
      return true;
    });
    return found ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Artisan not found." }, { status: 404 });
  }

  const fields = clean(body);
  if ("error" in fields) return NextResponse.json(fields, { status: 400 });
  const updated = await mutateCollection<Artisan, Artisan | null>(COLLECTION, (list) => {
    const i = list.findIndex((a) => a.id === id);
    if (i < 0) return null;
    list[i] = { id, ...fields };
    return list[i];
  });
  return updated ? NextResponse.json({ artisan: updated }) : NextResponse.json({ error: "Artisan not found." }, { status: 404 });
}

async function handleDELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Artisan id is required." }, { status: 400 });
  await mutateCollection<Artisan>(COLLECTION, (list) => {
    const i = list.findIndex((a) => a.id === id);
    if (i >= 0) list.splice(i, 1);
  });
  return NextResponse.json({ ok: true });
}

export const GET = guarded(handleGET);
export const POST = guarded(handlePOST);
export const PUT = guarded(handlePUT);
export const DELETE = guarded(handleDELETE);
