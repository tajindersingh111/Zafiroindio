import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireCustomer } from "@/lib/auth/customer";
import { normalizeEmail, normalizePhone } from "@/lib/orders/contact";
import { toMyOrder } from "@/lib/account/orders";
import type { Order } from "@/lib/db/types";

export const dynamic = "force-dynamic";

/**
 * The signed-in shopper's own orders.
 *
 * Matched on the customer id, the verified phone number or the verified e-mail, so orders placed as a
 * guest with the same mobile or address show up once that contact has been verified by a code. It never reads an id from the
 * query string, so one shopper cannot ask for another's orders.
 */
export async function GET(request: Request) {
  const auth = await requireCustomer(request);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50) || 50));
  const phone = normalizePhone(auth.customer.phone);
  // Only an e-mail the shopper proved they control by code counts; a typed-in one proves nothing.
  const email = auth.customer.emailVerified === true ? normalizeEmail(auth.customer.email) : "";

  const rows = await prisma.$queryRaw<{ data: Order }[]>`
    SELECT data FROM documents
    WHERE collection = 'orders'
      AND (
        data->>'customerId' = ${auth.customer.id}
        OR (${phone} <> '' AND right(regexp_replace(coalesce(data->>'customerPhone', ''), '\D', '', 'g'), 10) = ${phone})
        OR (${email} <> '' AND lower(coalesce(data->>'customerEmail', '')) = ${email})
      )
    ORDER BY data->>'createdAt' DESC
    LIMIT ${limit}`;

  return NextResponse.json({ orders: rows.map((r) => toMyOrder(r.data)) }, { headers: { "Cache-Control": "no-store" } });
}
