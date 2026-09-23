import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";

export interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const subscribers = readCollection<Subscriber>("subscribers");
    const existing = subscribers.find((s) => s.email.toLowerCase() === cleanEmail);

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "You are already subscribed to Zafiro Indio newsletters!",
      });
    }

    const newSub: Subscriber = {
      id: `sub_${Date.now()}`,
      email: cleanEmail,
      subscribedAt: new Date().toISOString(),
    };

    subscribers.unshift(newSub);
    writeCollection("subscribers", subscribers);

    return NextResponse.json({
      success: true,
      message: "✓ Thank you for subscribing! Your 10% OFF coupon code WELCOME10 has been sent to your email.",
      subscriber: newSub,
    });
  } catch {
    return NextResponse.json({ error: "Failed to process subscription." }, { status: 500 });
  }
}
