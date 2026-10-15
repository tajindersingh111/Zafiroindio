import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { deleteDoc, findDocs, getDoc, upsertDoc } from "@/lib/db/store";
import { VIDEO_CHUNK_BYTES } from "@/lib/returns/policy";

/**
 * Return / exchange unboxing videos, stored in the Postgres document store like uploaded images
 * (`media`), but split into pieces so no single row or request gets large:
 *   return-videos        one row per video (owner order, size, upload token hash, status)
 *   return-video-chunks  `<videoId>:<index>` rows holding VIDEO_CHUNK_BYTES of base64 data each
 * Never readCollection() the chunk collection: always fetch pieces by id.
 */
export const VIDEOS = "return-videos";
export const CHUNKS = "return-video-chunks";

export type ReturnVideo = {
  id: string;
  orderId: string;
  orderNumber: string;
  name: string;
  mime: string;
  size: number;
  chunkCount: number;
  tokenHash: string;
  status: "uploading" | "attached";
  returnId?: string;
  createdAt: string;
};

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const chunkId = (videoId: string, index: number) => `${videoId}:${index}`;

export function tokenMatches(video: ReturnVideo, token: unknown): boolean {
  if (typeof token !== "string" || !token) return false;
  const a = Buffer.from(hash(token), "hex");
  const b = Buffer.from(video.tokenHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Drop a video and all of its pieces. */
export async function deleteVideo(videoId: string) {
  await prisma.document.deleteMany({ where: { collection: CHUNKS, id: { startsWith: `${videoId}:` } } });
  await deleteDoc(VIDEOS, videoId);
}

/** Start an upload. Earlier unfinished uploads for the same order are discarded. */
export async function createVideo(order: { id: string; orderNumber: string }, file: { name: string; mime: string; size: number }) {
  const stale = await findDocs<ReturnVideo>(VIDEOS, { path: ["orderId"], equals: order.id }, 50);
  for (const v of stale) if (v.status === "uploading") await deleteVideo(v.id);

  const token = randomBytes(24).toString("base64url");
  const video: ReturnVideo = {
    id: `rv-${Date.now()}-${randomBytes(4).toString("hex")}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    name: file.name.slice(0, 120),
    mime: file.mime,
    size: file.size,
    chunkCount: Math.ceil(file.size / VIDEO_CHUNK_BYTES),
    tokenHash: hash(token),
    status: "uploading",
    createdAt: new Date().toISOString(),
  };
  await upsertDoc(VIDEOS, video);
  return { video, token };
}

/** Expected byte length of piece `index` (every piece is full except the last). */
export function chunkLength(video: ReturnVideo, index: number): number {
  return index === video.chunkCount - 1 ? video.size - index * VIDEO_CHUNK_BYTES : VIDEO_CHUNK_BYTES;
}

export async function saveChunk(video: ReturnVideo, index: number, bytes: Buffer) {
  await upsertDoc(CHUNKS, { id: chunkId(video.id, index), videoId: video.id, index, data: bytes.toString("base64") });
}

export async function uploadedChunks(videoId: string): Promise<number> {
  return prisma.document.count({ where: { collection: CHUNKS, id: { startsWith: `${videoId}:` } } });
}

export async function getVideo(videoId: string) {
  return getDoc<ReturnVideo>(VIDEOS, videoId);
}

/**
 * Bytes [start, end] of a video as a stream, loading one piece at a time
 * (so seeking in a 100 MB video never holds the whole file in memory).
 */
export function streamRange(video: ReturnVideo, start: number, end: number): ReadableStream<Uint8Array> {
  let index = Math.floor(start / VIDEO_CHUNK_BYTES);
  const lastIndex = Math.floor(end / VIDEO_CHUNK_BYTES);
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (index > lastIndex) return controller.close();
      const piece = await getDoc<{ data: string }>(CHUNKS, chunkId(video.id, index));
      if (!piece) return controller.error(new Error(`Missing video piece ${index}`));
      const buf = Buffer.from(piece.data, "base64");
      const base = index * VIDEO_CHUNK_BYTES;
      const from = Math.max(0, start - base);
      const to = Math.min(buf.length, end - base + 1);
      controller.enqueue(new Uint8Array(buf.subarray(from, to)));
      index++;
    },
  });
}
