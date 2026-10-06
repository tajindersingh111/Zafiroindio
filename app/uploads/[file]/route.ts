import { NextRequest, NextResponse } from "next/server";
import { getDoc } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/** Serves images uploaded through the admin panel (stored in Postgres). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[a-z0-9][a-z0-9-]{0,80}\.webp$/.test(file)) return new NextResponse("Not found", { status: 404 });
  const media = await getDoc<{ mime: string; data: string }>("media", file);
  if (!media) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Buffer.from(media.data, "base64"), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
