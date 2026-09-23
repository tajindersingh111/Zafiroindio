import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");

  const reviews = readCollection<Review>("reviews");
  // Show approved reviews or newly posted reviews
  let filtered = reviews.filter((r) => r.status === "approved" || r.status === "pending" || !r.status);
  
  if (productId) {
    filtered = filtered.filter(
      (r) => r.productId === productId || r.productName.toLowerCase() === productId.toLowerCase()
    );
  }

  return NextResponse.json(filtered);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, productName, customerName, customerEmail, rating, review, title, photoUrl } = body;

    if (!customerName || !rating || !review) {
      return NextResponse.json({ error: "Name, rating, and review text are required." }, { status: 400 });
    }

    const reviews = readCollection<Review>("reviews");
    const newReview: Review = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: productId || "unknown",
      productName: productName || "Jaipur Handblock Product",
      customerName: customerName.trim(),
      customerEmail: customerEmail?.trim() || "",
      rating: Number(rating) || 5,
      title: title?.trim() || "",
      review: review.trim(),
      photoUrl: photoUrl?.trim() || "",
      status: "approved", // Auto-approve for immediate live display
      createdAt: new Date().toISOString(),
    };

    reviews.unshift(newReview);
    writeCollection("reviews", reviews);

    return NextResponse.json({
      success: true,
      message: "Thank you! Your review has been submitted and is now live on screen.",
      review: newReview,
    });
  } catch {
    return NextResponse.json({ error: "Failed to submit review." }, { status: 500 });
  }
}
