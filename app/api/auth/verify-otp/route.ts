import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { readCollection, writeCollection } from "@/lib/db/store";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

interface OtpRecord {
  id: string;
  phone: string;
  hashedOtp: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: string;
  cooldownUntil: string;
  isUsed: boolean;
  createdAt: string;
}

interface CustomerRecord {
  id: string;
  name?: string;
  email?: string;
  phone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

    const ipRateLimit = await checkRateLimit(`verify-otp:ip:${ip}`, { windowMs: 600000, maxRequests: 10 });
    if (!ipRateLimit.success) {
      return rateLimitResponse(ipRateLimit.reset);
    }

    const body = await request.json();
    const phone = String(body.phone || "").trim().replace(/\D/g, "");
    const otp = String(body.otp || "").trim();

    if (!/^[6-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: "Invalid mobile number or OTP format." }, { status: 400 });
    }

    const otps = readCollection<OtpRecord>("otp_requests");
    const otpIndex = otps.findIndex((o) => o.phone === phone);
    const otpRecord = otpIndex !== -1 ? otps[otpIndex] : null;

    if (!otpRecord) {
      return NextResponse.json({ error: "No active OTP request found for this mobile number." }, { status: 400 });
    }

    const now = new Date();

    if (otpRecord.isUsed) {
      return NextResponse.json({ error: "This OTP has already been used. Please request a new OTP." }, { status: 400 });
    }

    if (new Date(otpRecord.expiresAt) < now) {
      return NextResponse.json({ error: "OTP has expired. Please request a new OTP." }, { status: 400 });
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return NextResponse.json({ error: "Maximum verification attempts exceeded. Please request a new OTP." }, { status: 429 });
    }

    const hashedInput = crypto.createHash("sha256").update(otp).digest("hex");

    if (hashedInput !== otpRecord.hashedOtp) {
      otpRecord.attempts += 1;
      otps[otpIndex] = otpRecord;
      writeCollection("otp_requests", otps);
      const remaining = otpRecord.maxAttempts - otpRecord.attempts;
      return NextResponse.json({ error: `Invalid OTP. ${remaining} attempts remaining.` }, { status: 400 });
    }

    otpRecord.isUsed = true;
    otps[otpIndex] = otpRecord;
    writeCollection("otp_requests", otps);

    const customers = readCollection<CustomerRecord>("customers");
    let customer = customers.find((c) => c.phone === phone);

    if (!customer) {
      customer = {
        id: `cust_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        phone,
        status: "active",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
      customers.push(customer);
      writeCollection("customers", customers);
    }

    const sessionSecret = process.env.SESSION_SECRET || "zafiro-customer-secret-key-2026";
    const sessionData = {
      customerId: customer.id,
      phone: customer.phone,
      issuedAt: now.toISOString()
    };
    const sessionPayload = Buffer.from(JSON.stringify(sessionData)).toString("base64url");
    const hmac = crypto.createHmac("sha256", sessionSecret).update(sessionPayload).digest("hex");
    const sessionCookieValue = `${sessionPayload}.${hmac}`;

    const response = NextResponse.json({
      success: true,
      message: "Mobile OTP verified successfully.",
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name || null,
        email: customer.email || null
      }
    });

    response.cookies.set("zafiro-customer-session", sessionCookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
