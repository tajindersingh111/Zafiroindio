import crypto from "crypto";
import { ShiprocketCheckoutClient } from "../lib/shiprocket-checkout/client";
import { buildSessionCookie, parseSessionString } from "../lib/auth/token";
import { canAccessSection, sectionForPath } from "../lib/auth/access";
import { orderMatchesContact } from "../lib/orders/contact";

/**
 * Pure (no database) checks for the security-critical pieces.
 * Run: npx tsx scripts/test-suite.ts
 */
let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string) {
  if (cond) { console.log(`PASS  ${name}`); passed++; } else { console.error(`FAIL  ${name}`); failed++; }
}
const hdr = (sig?: string) => new Headers(sig ? { "x-api-hmac-sha256": sig } : {});

process.env.SHIPROCKET_CHECKOUT_WEBHOOK_SECRET = "test_secret_key_123";
const client = new ShiprocketCheckoutClient();
const body = JSON.stringify({ order_id: "SR-1", cart_data: { items: [] } });
const good = crypto.createHmac("sha256", "test_secret_key_123").update(body).digest("base64");
assert(client.verifySignature(body, hdr(good)), "webhook: valid signature accepted");
assert(!client.verifySignature(body, hdr("tampered")), "webhook: tampered signature rejected");
assert(!client.verifySignature(body, hdr()), "webhook: missing signature rejected");
assert(!client.verifySignature(body + " ", hdr(good)), "webhook: modified body rejected");
delete process.env.SHIPROCKET_CHECKOUT_WEBHOOK_SECRET;
delete process.env.SHIPROCKET_CHECKOUT_API_SECRET;
assert(!client.verifySignature(body, hdr(good)), "webhook: fails closed when no secret configured");

process.env.SESSION_SECRET = "x".repeat(40);
const user = { id: "u1", name: "A", email: "a@b.c", role: "admin", allowedSections: ["orders"] } as any;
const cookie = buildSessionCookie(user, "sid-1");
assert(parseSessionString(cookie)?.sid === "sid-1", "session: round-trip");
assert(parseSessionString(cookie.slice(0, -2) + "xx") === null, "session: tampered cookie rejected");

assert(sectionForPath("/api/admin/users") === "users", "access: users path maps to users section");
assert(sectionForPath("/api/admin/does-not-exist") === null, "access: unknown admin path is unmapped (super admin only)");
assert(!canAccessSection("staff", undefined, "users"), "access: staff cannot reach users");
assert(!canAccessSection("order_manager", undefined, null), "access: unknown section denied to non-super-admin");

const order: any = { customerEmail: "Foo@Bar.com", customerPhone: "+91 98765 43210", shipping: {}, billing: {} };
assert(orderMatchesContact(order, "foo@bar.com"), "contact: email match (case-insensitive)");
assert(orderMatchesContact(order, "9876543210"), "contact: phone match");
assert(!orderMatchesContact(order, "9876543211"), "contact: wrong phone rejected");
assert(!orderMatchesContact(order, ""), "contact: empty rejected");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
