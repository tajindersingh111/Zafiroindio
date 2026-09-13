import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const amount = Number(body.amount);
    const currency = body.currency || "INR";
    const receipt = body.receipt || `rcpt_${Date.now()}`;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment amount." }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_mock123456";
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    let razorpayOrderId = `order_${crypto.randomBytes(10).toString("hex")}`;

    if (keyId.startsWith("rzp_live") && keySecret) {
      // Real Razorpay API call if live keys provided
      try {
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const res = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${auth}`
          },
          body: JSON.stringify({
            amount: Math.round(amount * 100), // amount in paise
            currency,
            receipt,
            payment_capture: 1
          })
        });
        const data = await res.json();
        if (data.id) {
          razorpayOrderId = data.id;
        }
      } catch (e) {
        console.warn("Razorpay API call fallback to mock order ID:", e);
      }
    }

    return NextResponse.json({
      orderId: razorpayOrderId,
      amount: Math.round(amount * 100),
      currency,
      keyId,
      receipt
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create payment order." }, { status: 500 });
  }
}
