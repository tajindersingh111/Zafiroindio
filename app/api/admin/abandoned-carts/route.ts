import { NextResponse } from "next/server";
import { getDoc, upsertDoc } from "@/lib/db/store";
import { guarded } from "@/lib/auth/guard";
import { sendTransactionalEmail } from "@/lib/email/service";
import {
  ABANDONED_CARTS,
  expireStaleCarts,
  listAbandonedCarts,
  syncAbandonedFromPaymentSessions,
  type AbandonedCart,
  type AbandonedCartStatus,
} from "@/lib/checkout/abandoned";

export const dynamic = "force-dynamic";

const STATUSES: AbandonedCartStatus[] = ["abandoned", "reminder_sent", "recovered", "expired"];

async function handleGET() {
  // Payments that were started and never finished are abandoned carts too, and their session rows
  // are pruned by the housekeeping cron — so fold them in before reading the list.
  await syncAbandonedFromPaymentSessions().catch((e) => console.error("[abandoned] session sync failed:", e));
  await expireStaleCarts().catch((e) => console.error("[abandoned] expiry sweep failed:", e));

  const carts = await listAbandonedCarts();
  const recovered = carts.filter((c) => c.status === "recovered");
  // "Still out there" is what the admin can act on: a recovered cart is revenue, not a loss.
  const open = carts.filter((c) => c.status === "abandoned" || c.status === "reminder_sent");
  const recoveredVal = recovered.reduce((s, c) => s + c.cartValue, 0);
  const openVal = open.reduce((s, c) => s + c.cartValue, 0);

  return NextResponse.json({
    carts,
    analytics: {
      totalCarts: carts.length,
      openCarts: open.length,
      abandonedValue: openVal,
      recoveredCount: recovered.length,
      recoveryRate: carts.length > 0 ? (recovered.length / carts.length) * 100 : 0,
      recoveredRevenue: recoveredVal,
      unrecoveredRevenue: openVal,
    },
  });
}

/**
 * `action: "remind"` actually sends the recovery e-mail and records that it went out. Anything else
 * is a plain status correction from the admin (e.g. writing a cart off as expired).
 */
async function handlePATCH(request: Request) {
  let body: { id?: unknown; action?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const cart = await getDoc<AbandonedCart>(ABANDONED_CARTS, id);
  if (!cart) return NextResponse.json({ error: "Cart not found" }, { status: 404 });

  const now = new Date().toISOString();

  if (body.action === "remind") {
    if (!cart.customerEmail) {
      return NextResponse.json({ error: "This shopper left no e-mail address, so no reminder can be sent." }, { status: 400 });
    }
    const itemList = cart.products.map((p) => `${p.name} (x${p.quantity})`).join(", ");
    const sent = await sendTransactionalEmail(
      "CART_ABANDONED",
      {
        id: cart.id,
        orderNumber: cart.id,
        customerEmail: cart.customerEmail,
        customerName: cart.customerName,
        total: cart.cartValue,
      },
      { note: itemList ? `Still in your cart: ${itemList}.` : undefined }
    );
    if (!sent.success) {
      return NextResponse.json({ error: "The reminder could not be sent. Check the SMTP settings." }, { status: 502 });
    }
    const updated: AbandonedCart = {
      ...cart,
      status: cart.status === "recovered" ? cart.status : "reminder_sent",
      reminderSent: true,
      reminderCount: (cart.reminderCount ?? 0) + 1,
      lastReminderAt: now,
      updatedAt: now,
    };
    await upsertDoc<AbandonedCart>(ABANDONED_CARTS, updated);
    return NextResponse.json({ cart: updated, sentTo: cart.customerEmail });
  }

  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status as AbandonedCartStatus)) {
      return NextResponse.json({ error: "Unknown status" }, { status: 400 });
    }
    const updated: AbandonedCart = { ...cart, status: body.status as AbandonedCartStatus, updatedAt: now };
    await upsertDoc<AbandonedCart>(ABANDONED_CARTS, updated);
    return NextResponse.json({ cart: updated });
  }

  return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
}

export const GET = guarded(handleGET);
export const PATCH = guarded(handlePATCH);
