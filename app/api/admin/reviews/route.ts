import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";

interface Review {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  review: string;
  status: "pending" | "approved" | "rejected" | "spam";
  createdAt: string;
}

export async function GET() {
  const reviews = readCollection<Review>("reviews");
  return NextResponse.json(reviews);
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json() as { id: string; status: Review["status"] };
    const reviews = readCollection<Review>("reviews");
    const idx = reviews.findIndex((r) => r.id === id);
    if (idx < 0) return NextResponse.json({ error: "Review not found" }, { status: 404 });

    reviews[idx].status = status;
    writeCollection("reviews", reviews);
    return NextResponse.json(reviews[idx]);
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
