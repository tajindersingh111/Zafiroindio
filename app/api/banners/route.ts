import { NextResponse } from "next/server";
import { getAnnouncements } from "@/lib/storefront/catalog";

export const dynamic = "force-dynamic";

// Announcement-bar messages (the header asks on every page view, so this is cached and cheap).
export async function GET() {
  const announcements = await getAnnouncements().catch(() => [] as string[]);
  return NextResponse.json({ announcements }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600" } });
}
