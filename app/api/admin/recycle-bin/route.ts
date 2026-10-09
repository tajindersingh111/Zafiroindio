import { NextRequest, NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { restoreFromRecycleBin, permanentlyDeleteFromRecycleBin, RecycleItem } from "@/lib/db/recycle-bin";
import { guarded } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const items = await readCollection<RecycleItem>("recycle-bin");
  return NextResponse.json({ items, total: items.length });
}

async function handlePOST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json() as { recycleId: string; action: "restore" | "permanent_delete" };
    if (!body.recycleId) {
      return NextResponse.json({ error: "recycleId is required." }, { status: 400 });
    }

    if (body.action === "restore") {
      const result = await restoreFromRecycleBin(body.recycleId, {
        id: auth.session?.userId,
        email: auth.session?.email,
        role: auth.session?.role
      });
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result);
    }

    if (body.action === "permanent_delete") {
      const result = await permanentlyDeleteFromRecycleBin(body.recycleId, {
        id: auth.session?.userId,
        email: auth.session?.email,
        role: auth.session?.role
      });
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to process recycle bin operation." }, { status: 500 });
  }
}

export const GET = guarded(handleGET);
export const POST = guarded(handlePOST);
