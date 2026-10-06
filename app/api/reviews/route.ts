import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { findDocs, upsertDoc } from "@/lib/db/store";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export interface Review {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  review: string;
  title?: string;
  photoUrl?: string;
  status: "pending" | "approved" | "rejected" | "spam";
  createdAt: string;
}

/** Public view: approved reviews only, and never the reviewer's e-mail address. */
function publicReview(r: Review) {
  return { id: r.id, productId: r.productId, productName: r.productName, customerName: r.customerName, rating: r.rating, title: r.title || "", review: r.review, photoUrl: r.photoUrl || "", createdAt: r.createdAt };
}

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json([]);
  const rows = await findDocs<Review>("reviews", { path: ["productId"], equals: productId }, 200);
  return NextResponse.json(rows.filter((r) => r.status === "approved").map(publicReview));
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "review-submit", { windowMs: 60 * 60_000, maxRequests: 5 });
  if (limited) return limited;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const customerName = str(body.customerName, 80);
    const text = str(body.review, 2000);
    const rating = Math.round(Number(body.rating));
    const email = str(body.customerEmail, 254).toLowerCase();
    const productId = str(body.productId, 200);

    if (!customerName || !text || !productId) return NextResponse.json({ error: "Name, rating, and review text are required." }, { status: 400 });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    if (email && !EMAIL_RE.test(email)) return NextResponse.json({ error: "Please enter a valid e-mail address." }, { status: 400 });

    // Only https image links (blocks javascript:/data: URLs).
    const photoRaw = str(body.photoUrl, 500);
    const photoUrl = /^https:\/\//i.test(photoRaw) ? photoRaw : "";

    const review: Review = {
      id: `rev_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      productId,
      productName: str(body.productName, 160) || productId,
      customerName,
      customerEmail: email,
      rating,
      title: str(body.title, 120),
      review: text,
      photoUrl,
      status: "pending", // moderated: nothing goes live (or into the star average) until staff approve it
      createdAt: new Date().toISOString(),
    };
    await upsertDoc("reviews", review);

    return NextResponse.json({ success: true, message: "Thank you! Your review has been submitted and will appear once our team approves it." });
  } catch {
    return NextResponse.json({ error: "Failed to submit review." }, { status: 500 });
  }
}
