import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { readCollection, writeCollection } from "@/lib/db/store";
import { smsProvider } from "@/lib/auth/sms/fast2sms";
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

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

    const ipRateLimit = await checkRateLimit(`send-otp:ip:${ip}`, { windowMs: 600000, maxRequests: 5 });
    if (!ipRateLimit.success) {
      return rateLimitResponse(ipRateLimit.reset);
    }

    const body = await request.json();
    const phone = String(body.phone || "").trim().replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: "Invalid mobile number. Please enter a valid 10-digit Indian phone number." }, { status: 400 });
    }

    const phoneRateLimit = await checkRateLimit(`send-otp:phone:${phone}`, { windowMs: 600000, maxRequests: 3 });
    if (!phoneRateLimit.success) {
      return rateLimitResponse(phoneRateLimit.reset);
    }

    const otps = readCollection<OtpRecord>("otp_requests");
    const existingIndex = otps.findIndex((o) => o.phone === phone);
    const existing = existingIndex !== -1 ? otps[existingIndex] : null;

    const now = new Date();

    if (existing && new Date(existing.cooldownUntil) > now) {
      const waitSeconds = Math.ceil((new Date(existing.cooldownUntil).getTime() - now.getTime()) / 1000);
      return NextResponse.json(
        { error: `Please wait ${waitSeconds} seconds before requesting a new OTP.` },
        { status: 429 }
      );
    }

    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = crypto.createHash("sha256").update(rawOtp).digest("hex");

    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
    const cooldownUntil = new Date(now.getTime() + 60 * 1000).toISOString();

    const newRecord: OtpRecord = {
      id: crypto.randomUUID(),
      phone,
      hashedOtp,
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
      cooldownUntil,
      isUsed: false,
      createdAt: now.toISOString()
    };

    if (existingIndex !== -1) {
      otps[existingIndex] = newRecord;
    } else {
      otps.push(newRecord);
    }

    writeCollection("otp_requests", otps);

    const smsResult = await smsProvider.sendOtp(phone, rawOtp);

    if (!smsResult.success) {
      return NextResponse.json(
        { error: smsResult.error || "Failed to send OTP SMS. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully to your mobile number.",
      ...(process.env.NODE_ENV !== "production" && !process.env.FAST2SMS_API_KEY ? { devOtp: rawOtp } : {})
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
