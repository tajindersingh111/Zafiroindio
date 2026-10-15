import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { getDoc } from "@/lib/db/store";
import { getVideo, streamRange } from "@/lib/returns/video";
import type { ReturnRecord } from "@/lib/db/types";

export const dynamic = "force-dynamic";

/** Staff only: the unboxing video of a return / exchange request, with Range support for seeking. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request, "orders");
  if (auth.error) return auth.error;

  const { id } = await params;
  const record = await getDoc<ReturnRecord>("returns", id);
  const video = record?.video ? await getVideo(record.video.id) : null;
  if (!video) return new NextResponse("Not found", { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": video.mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (request.nextUrl.searchParams.has("download")) {
    headers["Content-Disposition"] = `attachment; filename="${video.orderNumber.replace(/[^\w-]/g, "")}-unboxing${/\.\w{2,5}$/.exec(video.name)?.[0] ?? ".mp4"}"`;
  }

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") || "");
  if (!range) {
    return new NextResponse(streamRange(video, 0, video.size - 1), { headers: { ...headers, "Content-Length": String(video.size) } });
  }
  let start = range[1] ? Number(range[1]) : video.size - Number(range[2]);
  let end = range[1] && range[2] ? Number(range[2]) : video.size - 1;
  start = Math.max(0, start);
  end = Math.min(end, video.size - 1);
  if (start > end) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${video.size}` } });

  return new NextResponse(streamRange(video, start, end), {
    status: 206,
    headers: { ...headers, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${video.size}` },
  });
}
