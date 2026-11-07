import { NextResponse } from "next/server";
import { mutateCollection, readCollection } from "@/lib/db/store";
import { guarded } from "@/lib/auth/guard";
import { DEFAULT_FOUNDERS, type Founder } from "@/lib/storefront/founders";

const COLLECTION = "founders";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Validated founder fields from a request body (photo must be an uploaded or https URL). */
function clean(body: any): Omit<Founder, "id"> | { error: string } {
  const name = text(body?.name, 80);
  const role = text(body?.role, 60);
  const blurb = text(body?.blurb, 600);
  const photo = text(body?.photo, 600);
  if (!name) return { error: "Name is required." };
  if (!role) return { error: "Role is required (e.g. Founder)." };
  if (!blurb) return { error: "A short description is required." };
  if (!/^(https:\/\/|\/)/.test(photo)) return { error: "Upload a photo." };
  return {
    name,
    role,
    title: text(body?.title, 80) || undefined,
    blurb,
    photo,
    active: body?.active !== false,
  };
}

/**
 * Founders shown on the About page.
 *
 * The first save seeds the stored list from DEFAULT_FOUNDERS, so the two placeholders the About page
 * already shows become real, editable rows instead of silently disappearing the moment one founder
 * is added.
 */
async function seedIfEmpty(): Promise<Founder[]> {
  return mutateCollection<Founder, Founder[]>(COLLECTION, (list) => {
    if (list.length === 0) list.push(...DEFAULT_FOUNDERS.map((f) => ({ ...f })));
    return list;
  });
}

async function handleGET() {
  const stored = await readCollection<Founder>(COLLECTION);
  // Show the placeholders in the admin too, so what the editor lists matches what the site renders.
  return NextResponse.json({ founders: stored.length ? stored : DEFAULT_FOUNDERS, usingDefaults: stored.length === 0 });
}

async function handlePOST(req: Request) {
  const fields = clean(await req.json().catch(() => null));
  if ("error" in fields) return NextResponse.json(fields, { status: 400 });
  await seedIfEmpty();
  const founder: Founder = { id: `fnd-${Date.now()}`, ...fields };
  await mutateCollection<Founder>(COLLECTION, (list) => {
    list.push(founder);
  });
  return NextResponse.json({ founder }, { status: 201 });
}

async function handlePUT(req: Request) {
  const body = await req.json().catch(() => null);
  const id = text(body?.id, 60);
  if (!id) return NextResponse.json({ error: "Founder id is required." }, { status: 400 });
  await seedIfEmpty();

  // Reordering: { id, move: "up" | "down" }.
  if (body?.move === "up" || body?.move === "down") {
    const found = await mutateCollection<Founder, boolean>(COLLECTION, (list) => {
      const i = list.findIndex((f) => f.id === id);
      const j = body.move === "up" ? i - 1 : i + 1;
      if (i < 0) return false;
      if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
      return true;
    });
    return found ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Founder not found." }, { status: 404 });
  }

  const fields = clean(body);
  if ("error" in fields) return NextResponse.json(fields, { status: 400 });
  const updated = await mutateCollection<Founder, Founder | null>(COLLECTION, (list) => {
    const i = list.findIndex((f) => f.id === id);
    if (i < 0) return null;
    list[i] = { id, ...fields };
    return list[i];
  });
  return updated ? NextResponse.json({ founder: updated }) : NextResponse.json({ error: "Founder not found." }, { status: 404 });
}

async function handleDELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Founder id is required." }, { status: 400 });
  await seedIfEmpty();
  await mutateCollection<Founder>(COLLECTION, (list) => {
    const i = list.findIndex((f) => f.id === id);
    if (i >= 0) list.splice(i, 1);
  });
  return NextResponse.json({ ok: true });
}

export const GET = guarded(handleGET);
export const POST = guarded(handlePOST);
export const PUT = guarded(handlePUT);
export const DELETE = guarded(handleDELETE);
