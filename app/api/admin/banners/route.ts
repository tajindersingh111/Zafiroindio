import { NextRequest, NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";

interface Banner {
  id: string;
  type: string;
  image: string;
  heading: string;
  subheading: string;
  ctaText: string;
  ctaUrl: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export async function GET() {
  const banners = readCollection<Banner>("banners");
  return NextResponse.json(banners);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<Banner>;
    const banners = readCollection<Banner>("banners");
    const newBanner: Banner = {
      id: "ban-" + Math.random().toString(36).substring(2, 9),
      type: body.type ?? "banner",
      image: body.image ?? "",
      heading: body.heading ?? "",
      subheading: body.subheading ?? "",
      ctaText: body.ctaText ?? "",
      ctaUrl: body.ctaUrl ?? "",
      startDate: body.startDate ?? "",
      endDate: body.endDate ?? "",
      isActive: body.isActive !== undefined ? body.isActive : true
    };
    banners.push(newBanner);
    writeCollection("banners", banners);
    return NextResponse.json(newBanner);
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Partial<Banner> & { id: string };
    const banners = readCollection<Banner>("banners");
    const idx = banners.findIndex((b) => b.id === body.id);
    if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    banners[idx] = { ...banners[idx], ...body };
    writeCollection("banners", banners);
    return NextResponse.json(banners[idx]);
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { requireSuperAdmin } = require("@/lib/auth/rbac");
  const { createAuditLog } = require("@/lib/db/audit");
  
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Banner ID required" }, { status: 400 });

  let banners = readCollection<Banner>("banners");
  const target = banners.find((b) => b.id === id);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  banners = banners.filter((b) => b.id !== id);
  writeCollection("banners", banners);

  createAuditLog({
    userId: auth.session?.userId,
    userName: auth.session?.email,
    userRole: auth.session?.role,
    action: "DELETE_BANNER",
    module: "banners",
    recordId: id,
    previousData: target
  });

  return NextResponse.json({ success: true });
}

