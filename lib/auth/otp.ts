import crypto from "node:crypto";
import { getDoc, upsertDoc, deleteDoc } from "@/lib/db/store";
import { getSessionSecret } from "@/lib/auth/token";
import { normalizeEmail, normalizePhone } from "@/lib/orders/contact";

/**
 * One-time codes for shopper sign-in, over WhatsApp (phone) or e-mail.
 *
 * Both channels share the same engine, so they get the same protections: a cooldown between sends,
 * a cap per recipient per hour, and a hard attempt limit so a wrong code cannot be brute-forced. A
 * WhatsApp code costs money (Meta bills per authentication message) and an e-mail code can be used
 * to spam a stranger's inbox, so the limits matter for both reasons.
 *
 * The code itself is never stored — only an HMAC of it — so a leaked database row cannot be used
 * to sign in.
 */

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60 * 1000; // code valid for 5 minutes
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // wait 60s before asking for another
export const OTP_MAX_VERIFY_ATTEMPTS = 5; // wrong codes before the code is burned
export const OTP_MAX_SENDS_PER_WINDOW = 3; // sends allowed per recipient...
export const OTP_SEND_WINDOW_MS = 60 * 60 * 1000; // ...per hour

const COLLECTION = "otp-requests";

interface OtpRecord {
  /** Record key: the normalised phone number, or `email:<address>` for e-mail codes. */
  id: string;
  hashedOtp: string;
  attempts: number;
  expiresAt: string;
  cooldownUntil: string;
  /** Sends inside the current window, for the per-hour cap. */
  sends: number;
  sendWindowStart: string;
  isUsed: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * HMAC the code, salted with the record key, so the same code for two recipients hashes
 * differently. Phone records keep the key they always had, so a code already in flight when this
 * was generalised stays valid.
 */
function hashOtp(recordId: string, code: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(`otp:${recordId}:${code}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Uniformly distributed 6-digit code (crypto.randomInt, not Math.random). */
function generateCode(): string {
  return String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

export function isValidIndianMobile(raw: unknown): boolean {
  const phone = normalizePhone(raw);
  // 10 digits, and Indian mobile numbers start 6-9.
  return /^[6-9]\d{9}$/.test(phone);
}

/** Deliberately simple: the real proof an address is valid is that the code arrives. */
export function isValidEmail(raw: unknown): boolean {
  const email = normalizeEmail(raw);
  if (email.length < 5 || email.length > 254) return false;
  if (/[\s\u0000-\u001f]/.test(email)) return false;
  const [local, domain, ...rest] = email.split("@");
  if (rest.length || !local || !domain || local.length > 64) return false;
  return /^[^\s@]+\.[^\s@]+$/.test(domain);
}

type Recipient = "number" | "email address";

type Refusal = { ok: false; reason: "cooldown" | "too_many"; retryAfterSeconds: number; message: string };

async function issueFor(recordId: string, recipient: Recipient): Promise<{ ok: true; code: string; expiresInSeconds: number } | Refusal> {
  const now = Date.now();
  const existing = await getDoc<OtpRecord>(COLLECTION, recordId);

  if (existing) {
    const cooldownUntil = new Date(existing.cooldownUntil).getTime();
    if (Number.isFinite(cooldownUntil) && cooldownUntil > now) {
      const retryAfterSeconds = Math.ceil((cooldownUntil - now) / 1000);
      return { ok: false, reason: "cooldown", retryAfterSeconds, message: `Please wait ${retryAfterSeconds}s before requesting another code.` };
    }

    const windowStart = new Date(existing.sendWindowStart).getTime();
    const windowOpen = Number.isFinite(windowStart) && now - windowStart < OTP_SEND_WINDOW_MS;
    if (windowOpen && existing.sends >= OTP_MAX_SENDS_PER_WINDOW) {
      const retryAfterSeconds = Math.ceil((windowStart + OTP_SEND_WINDOW_MS - now) / 1000);
      return {
        ok: false,
        reason: "too_many",
        retryAfterSeconds,
        message: `Too many codes requested for this ${recipient}. Please try again later.`,
      };
    }
  }

  const code = generateCode();
  const windowStart = existing && now - new Date(existing.sendWindowStart).getTime() < OTP_SEND_WINDOW_MS ? existing.sendWindowStart : new Date(now).toISOString();

  const record: OtpRecord = {
    id: recordId,
    hashedOtp: hashOtp(recordId, code),
    attempts: 0,
    expiresAt: new Date(now + OTP_TTL_MS).toISOString(),
    cooldownUntil: new Date(now + OTP_RESEND_COOLDOWN_MS).toISOString(),
    sends: (windowStart === existing?.sendWindowStart ? existing?.sends ?? 0 : 0) + 1,
    sendWindowStart: windowStart,
    isUsed: false,
    createdAt: existing?.createdAt ?? new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
  await upsertDoc(COLLECTION, record);

  return { ok: true, code, expiresInSeconds: Math.floor(OTP_TTL_MS / 1000) };
}

type VerifyFailure = {
  ok: false;
  reason: "not_found" | "expired" | "used" | "locked" | "wrong";
  attemptsLeft: number;
  message: string;
};

/**
 * Checks a code and consumes it on success. A wrong code counts an attempt; after
 * OTP_MAX_VERIFY_ATTEMPTS the record is deleted so the shopper must request a new code.
 */
async function verifyFor(recordId: string, rawCode: string): Promise<{ ok: true } | VerifyFailure> {
  const code = String(rawCode ?? "").replace(/\D/g, "");

  const record = await getDoc<OtpRecord>(COLLECTION, recordId);
  if (!record) return { ok: false, reason: "not_found", attemptsLeft: 0, message: "Request a code first." };
  if (record.isUsed) return { ok: false, reason: "used", attemptsLeft: 0, message: "That code has already been used. Please request a new one." };
  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    await deleteDoc(COLLECTION, recordId);
    return { ok: false, reason: "expired", attemptsLeft: 0, message: "That code has expired. Please request a new one." };
  }
  if (record.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
    await deleteDoc(COLLECTION, recordId);
    return { ok: false, reason: "locked", attemptsLeft: 0, message: "Too many incorrect attempts. Please request a new code." };
  }

  if (code.length !== OTP_LENGTH || !safeEqual(record.hashedOtp, hashOtp(recordId, code))) {
    const attempts = record.attempts + 1;
    const attemptsLeft = Math.max(0, OTP_MAX_VERIFY_ATTEMPTS - attempts);
    if (attemptsLeft === 0) {
      await deleteDoc(COLLECTION, recordId);
      return { ok: false, reason: "locked", attemptsLeft: 0, message: "Too many incorrect attempts. Please request a new code." };
    }
    await upsertDoc(COLLECTION, { ...record, attempts, updatedAt: new Date().toISOString() });
    return { ok: false, reason: "wrong", attemptsLeft, message: `Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.` };
  }

  // Correct: consume the code so it cannot be replayed.
  await deleteDoc(COLLECTION, recordId);
  return { ok: true };
}

// ───────────────────────── Phone (WhatsApp) ─────────────────────────

export type IssueResult =
  | { ok: true; phone: string; code: string; expiresInSeconds: number }
  | { ok: false; reason: "invalid_phone"; retryAfterSeconds: number; message: string }
  | Refusal;

/**
 * Issues a fresh code for a phone number, or refuses with the reason.
 *
 * The caller is responsible for delivering the returned `code` — it is returned rather than sent
 * here so that a delivery failure can be reported to the shopper without the record having already
 * been consumed.
 */
export async function issueOtp(rawPhone: string): Promise<IssueResult> {
  const phone = normalizePhone(rawPhone);
  if (!isValidIndianMobile(phone)) {
    return { ok: false, reason: "invalid_phone", retryAfterSeconds: 0, message: "Enter a valid 10-digit Indian mobile number." };
  }
  const issued = await issueFor(phone, "number");
  return issued.ok ? { ok: true, phone, code: issued.code, expiresInSeconds: issued.expiresInSeconds } : issued;
}

export type VerifyResult =
  | { ok: true; phone: string }
  | { ok: false; reason: "invalid_phone" | VerifyFailure["reason"]; attemptsLeft: number; message: string };

export async function verifyOtp(rawPhone: string, rawCode: string): Promise<VerifyResult> {
  const phone = normalizePhone(rawPhone);
  if (!isValidIndianMobile(phone)) {
    return { ok: false, reason: "invalid_phone", attemptsLeft: 0, message: "Enter a valid 10-digit Indian mobile number." };
  }
  const result = await verifyFor(phone, rawCode);
  return result.ok ? { ok: true, phone } : result;
}

// ───────────────────────── E-mail ─────────────────────────

/** E-mail codes live under their own key, so a phone code can never satisfy an e-mail sign-in. */
const emailKey = (email: string) => `email:${email}`;

export type IssueEmailResult =
  | { ok: true; email: string; code: string; expiresInSeconds: number }
  | { ok: false; reason: "invalid_email"; retryAfterSeconds: number; message: string }
  | Refusal;

export async function issueEmailOtp(rawEmail: string): Promise<IssueEmailResult> {
  if (!isValidEmail(rawEmail)) {
    return { ok: false, reason: "invalid_email", retryAfterSeconds: 0, message: "Enter a valid e-mail address." };
  }
  const email = normalizeEmail(rawEmail);
  const issued = await issueFor(emailKey(email), "email address");
  return issued.ok ? { ok: true, email, code: issued.code, expiresInSeconds: issued.expiresInSeconds } : issued;
}

export type VerifyEmailResult =
  | { ok: true; email: string }
  | { ok: false; reason: "invalid_email" | VerifyFailure["reason"]; attemptsLeft: number; message: string };

export async function verifyEmailOtp(rawEmail: string, rawCode: string): Promise<VerifyEmailResult> {
  if (!isValidEmail(rawEmail)) {
    return { ok: false, reason: "invalid_email", attemptsLeft: 0, message: "Enter a valid e-mail address." };
  }
  const email = normalizeEmail(rawEmail);
  const result = await verifyFor(emailKey(email), rawCode);
  return result.ok ? { ok: true, email } : result;
}
