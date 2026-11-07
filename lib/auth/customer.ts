import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { getDoc, upsertDoc, findOneByField } from "@/lib/db/store";
import { normalizeEmail, normalizePhone } from "@/lib/orders/contact";
import type { Address, Customer } from "@/lib/db/types";
import { CUSTOMER_COOKIE_NAME, parseCustomerSession, type CustomerSession } from "@/lib/auth/customer-token";

export * from "@/lib/auth/customer-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * The signed-in shopper, re-checked against the database on every call.
 *
 * The cookie alone is not trusted for authorization: a customer who has been blocked in
 * Admin → Customers, or whose record was deleted, is signed out even though the cookie is still
 * validly signed and unexpired.
 */
export async function getCustomerSession(): Promise<{ session: CustomerSession; customer: Customer } | null> {
  let raw: string | undefined;
  try {
    raw = (await cookies()).get(CUSTOMER_COOKIE_NAME)?.value;
  } catch {
    return null;
  }
  const session = parseCustomerSession(raw);
  if (!session) return null;

  const customer = await getDoc<Customer>("customers", session.customerId).catch(() => null);
  if (!customer || customer.status !== "active") return null;
  return { session, customer };
}

/** Reject cross-site state-changing requests (CSRF defence in depth on top of SameSite=Lax). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser clients / same-origin navigations send none
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export type CustomerAuth =
  | { customer: Customer; session: CustomerSession; error: null }
  | { customer: null; session: null; error: Response };

/** Guard for customer-only API routes. Mirrors lib/auth/guard.ts, for shoppers instead of staff. */
export async function requireCustomer(request: Request): Promise<CustomerAuth> {
  if (!SAFE_METHODS.has(request.method) && !isSameOrigin(request)) {
    return {
      customer: null,
      session: null,
      error: Response.json({ error: "Cross-site request blocked." }, { status: 403 }),
    };
  }
  const found = await getCustomerSession();
  if (!found) {
    return {
      customer: null,
      session: null,
      error: Response.json({ error: "Please sign in to continue." }, { status: 401 }),
    };
  }
  return { customer: found.customer, session: found.session, error: null };
}

/**
 * The customer record for a verified phone number, created on first sign-in.
 *
 * Phone is the identity here (it is what the OTP proved), so the lookup is by normalised phone and
 * never by the name or e-mail the shopper typed.
 */
export async function findOrCreateCustomerByPhone(rawPhone: string): Promise<Customer> {
  const phone = normalizePhone(rawPhone);
  const existing = await findOneByField<Customer>("customers", "phone", phone);
  if (existing) return existing;

  const now = new Date().toISOString();
  const customer: Customer = {
    id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: "retail",
    status: "active",
    firstName: "Customer",
    lastName: "",
    email: "",
    phone,
    totalOrders: 0,
    totalSpent: 0,
    registeredAt: now,
    updatedAt: now,
  };
  return upsertDoc("customers", customer);
}

/**
 * The customer record for an e-mail address the shopper has just proved they control, created on
 * first sign-in.
 *
 * Only records flagged `emailVerified` are ever matched. Plenty of customer records carry an e-mail
 * address that was simply typed into a checkout form, and anyone can type anyone's address there:
 * if sign-in trusted those, someone could place a guest order using a victim's e-mail or phone and
 * then claim that record — and the orders attached to it — by receiving a code at their own inbox.
 * So an e-mail sign-in gets its own record, and never inherits one it did not create.
 */
export async function findOrCreateCustomerByEmail(rawEmail: string): Promise<Customer> {
  const email = normalizeEmail(rawEmail);
  const rows = await prisma.$queryRaw<{ data: Customer }[]>`
    SELECT data FROM documents
    WHERE collection = 'customers'
      AND lower(data->>'email') = ${email}
      AND data->>'emailVerified' = 'true'
    LIMIT 1`;
  if (rows[0]) return rows[0].data;

  const now = new Date().toISOString();
  const customer: Customer = {
    id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: "retail",
    status: "active",
    firstName: "Customer",
    lastName: "",
    email,
    emailVerified: true,
    totalOrders: 0,
    totalSpent: 0,
    registeredAt: now,
    updatedAt: now,
  };
  return upsertDoc("customers", customer);
}

export function customerDisplayName(customer: Customer): string {
  return [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || "Customer";
}

/** Public-safe view of the signed-in shopper (what /api/account/me returns). */
export function customerProfileView(customer: Customer) {
  return {
    id: customer.id,
    name: customerDisplayName(customer),
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email || "",
    emailVerified: customer.emailVerified === true,
    phone: customer.phone || "",
    shipping: customer.shipping ?? null,
    billing: customer.billing ?? null,
    totalOrders: customer.totalOrders || 0,
  };
}

/** Saves the shopper's own profile edits. Only ever writes the fields a shopper may change. */
export async function updateCustomerProfile(
  customer: Customer,
  patch: { firstName?: string; lastName?: string; email?: string; shipping?: Address; billing?: Address }
): Promise<Customer> {
  const updated: Customer = {
    ...customer,
    firstName: patch.firstName?.trim() || customer.firstName,
    lastName: patch.lastName?.trim() ?? customer.lastName,
    // A verified e-mail is the shopper's identity, not a profile field: letting it be edited would let
    // someone change it to a victim's address and inherit the order history matched on it.
    email: customer.emailVerified ? customer.email : patch.email?.trim().toLowerCase() ?? customer.email,
    shipping: patch.shipping ?? customer.shipping,
    billing: patch.billing ?? customer.billing,
    updatedAt: new Date().toISOString(),
  };
  return upsertDoc("customers", updated);
}
