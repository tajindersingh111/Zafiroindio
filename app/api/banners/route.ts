import { NextResponse } from "next/server";
import { readCollection } from "@/lib/db/store";

export async function GET() {
  try {
    const banners = readCollection<any>("banners");
    const activeBanners = banners.filter((b) => b.isActive !== false);
    return NextResponse.json({ banners: activeBanners });
  } catch (error) {
    return NextResponse.json({ banners: [] });
  }
}
