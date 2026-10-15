import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { findReturnableOrder } from "@/lib/returns/eligibility";
import { VIDEO_CHUNK_BYTES, VIDEO_MAX_BYTES, VIDEO_MAX_MB } from "@/lib/returns/policy";
import { chunkLength, createVideo, getVideo, saveChunk, tokenMatches, uploadedChunks } from "@/lib/returns/video";

export const dynamic = "force-dynamic";

/**
 * Customer unboxing-video upload, in pieces:
 *   POST {orderNumber, contact, name, mime, size}  -> {videoId, uploadToken, chunkSize, chunkCount}
 *   PUT  ?id=<videoId>&index=<n>, header x-upload-token, raw bytes  (one piece)
 * The finished video is then attached by POST /api/returns with the same videoId + uploadToken.
 */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "return-video-start", { windowMs: 60_000, maxRequests: 6 });
  if (limited) return limited;

  const body = (await request.json().catch(() => ({}))) as { orderNumber?: string; contact?: string; name?: string; mime?: string; size?: number };
  const size = Number(body.size);
  const mime = String(body.mime || "").toLowerCase();
  if (!mime.startsWith("video/")) return NextResponse.json({ error: "Please choose a video file." }, { status: 400 });
  if (!Number.isFinite(size) || size <= 0) return NextResponse.json({ error: "That video file looks empty." }, { status: 400 });
  if (size > VIDEO_MAX_BYTES) return NextResponse.json({ error: `The video is larger than ${VIDEO_MAX_MB} MB. Please record in 720p or trim the start and end.` }, { status: 413 });

  const { order, error, status } = await findReturnableOrder(body.orderNumber, body.contact);
  if (!order) return NextResponse.json({ error }, { status });

  const { video, token } = await createVideo(order, { name: String(body.name || "unboxing-video"), mime, size });
  return NextResponse.json({ videoId: video.id, uploadToken: token, chunkSize: VIDEO_CHUNK_BYTES, chunkCount: video.chunkCount }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  // 100 MB in 4 MB pieces is 25 requests; leave room for retries.
  const limited = await rateLimit(request, "return-video-chunk", { windowMs: 60_000, maxRequests: 90 });
  if (limited) return limited;

  const sp = request.nextUrl.searchParams;
  const index = Number(sp.get("index"));
  const video = await getVideo(String(sp.get("id") || ""));
  if (!video || !tokenMatches(video, request.headers.get("x-upload-token"))) return NextResponse.json({ error: "Upload not found." }, { status: 404 });
  if (video.status !== "uploading") return NextResponse.json({ error: "This video is already attached to a request." }, { status: 409 });
  if (!Number.isInteger(index) || index < 0 || index >= video.chunkCount) return NextResponse.json({ error: "Invalid piece number." }, { status: 400 });

  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length !== chunkLength(video, index)) return NextResponse.json({ error: "Upload piece has the wrong size." }, { status: 400 });

  await saveChunk(video, index, bytes);
  return NextResponse.json({ ok: true, received: await uploadedChunks(video.id), total: video.chunkCount });
}
