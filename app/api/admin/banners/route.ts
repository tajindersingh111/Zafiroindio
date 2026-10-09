import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { mutateCollection, readCollection } from "@/lib/db/store";
import { guarded } from "@/lib/auth/guard";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { createAuditLog } from "@/lib/db/audit";

/** Homepage slider banners and announcement-bar messages. List order = order on the site. */
interface Banner {
  id: string;
  type: "banner" | "announcement" | string;
  image: string;
  heading: string;
  subheading: string;
  ctaText: string;
  ctaUrl: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const TEXT_FIELDS = ["image", "heading", "subheading", "ctaText", "ctaUrl"] as const;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Only known fields, trimmed and bounded; returns an error message for bad input. */
function clean(body: Record<string, unknown>): { patch: Partial<Banner>; error?: string } {
  const patch: Partial<Banner> = {};
  if (body.type !== undefined) {
    if (body.type !== "banner" && body.type !== "announcement") return { patch, error: "Type must be banner or announcement." };
    patch.type = body.type;
  }
  for (const k of TEXT_FIELDS) if (body[k] !== undefined) patch[k] = String(body[k] ?? "").trim().slice(0, k === "subheading" ? 300 : 200);
  for (const k of ["startDate", "endDate"] as const) {
    if (body[k] === undefined) continue;
    const v = String(body[k] ?? "").trim();
    if (v && !DATE.test(v)) return { patch, error: `${k} must be YYYY-MM-DD.` };
    patch[k] = v;
  }
  if (body.isActive !== undefined) patch.isActive = body.isActive === true;
  if (patch.ctaUrl && !/^(\/|https:\/\/)/.test(patch.ctaUrl)) return { patch, error: "Button link must start with / (e.g. /collections/quilted-bedcovers) or https://" };
  return { patch };
}

function validate(b: Banner): string | undefined {
  if (!b.heading) return "Heading is required.";
  if (b.type === "banner" && !b.image) return "A slider banner needs an image.";
  if (b.startDate && b.endDate && b.endDate < b.startDate) return "End date is before the start date.";
}

const refresh = () => {
  try {
    revalidatePath("/");
  } catch {}
};

async function handleGET() {
  return NextResponse.json(await readCollection<Banner>("banners"));
}

async function handlePOST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { patch, error } = clean(body);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const banner: Banner = {
    id: "ban-" + Math.random().toString(36).slice(2, 9),
    type: "banner",
    image: "",
    heading: "",
    subheading: "",
    ctaText: "",
    ctaUrl: "",
    startDate: "",
    endDate: "",
    isActive: true,
    ...patch,
  };
  const invalid = validate(banner);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  await mutateCollection<Banner>("banners", (items) => {
    items.push(banner);
  });
  refresh();
  return NextResponse.json(banner);
}

/** Edit fields, or reorder with {id, move: "up" | "down"}. */
async function handlePATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as (Record<string, unknown> & { id?: string; move?: string }) | null;
  if (!body?.id) return NextResponse.json({ error: "Banner id required." }, { status: 400 });
  const { patch, error } = clean(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const result = await mutateCollection<Banner, { banner?: Banner; error?: string; status?: number }>("banners", (items) => {
    const idx = items.findIndex((b) => b.id === body.id);
    if (idx < 0) return { error: "Not found", status: 404 };
    if (body.move === "up" || body.move === "down") {
      const to = body.move === "up" ? idx - 1 : idx + 1;
      if (to >= 0 && to < items.length) [items[idx], items[to]] = [items[to], items[idx]];
      return { banner: items[to] ?? items[idx] };
    }
    const next = { ...items[idx], ...patch };
    const invalid = validate(next);
    if (invalid) return { error: invalid, status: 400 };
    items[idx] = next;
    return { banner: next };
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  refresh();
  return NextResponse.json(result.banner);
}

async function handleDELETE(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Banner ID required" }, { status: 400 });

  const target = await mutateCollection<Banner, Banner | undefined>("banners", (items) => {
    const idx = items.findIndex((b) => b.id === id);
    return idx < 0 ? undefined : items.splice(idx, 1)[0];
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await createAuditLog({
    userId: auth.session?.userId,
    userName: auth.session?.email,
    userRole: auth.session?.role,
    action: "DELETE_BANNER",
    module: "banners",
    recordId: id,
    previousData: target,
  }).catch(() => {});
  refresh();
  return NextResponse.json({ success: true });
}

export const GET = guarded(handleGET);
export const POST = guarded(handlePOST);
export const PATCH = guarded(handlePATCH);
export const DELETE = guarded(handleDELETE);
