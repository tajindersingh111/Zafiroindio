import { findOneByField, getDoc } from "@/lib/db/store";
import { orderMatchesContact } from "@/lib/orders/contact";
import { RETURN_WINDOW_DAYS } from "@/lib/returns/policy";
import type { Order } from "@/lib/db/types";

type Result = { order: Order; error?: undefined; status?: undefined } | { order?: undefined; error: string; status: number };

/**
 * A delivered order, inside the return window, whose phone/e-mail the caller knows.
 * Used for every public return step (start video upload, upload pieces, submit request).
 */
export async function findReturnableOrder(ref: unknown, contact: unknown): Promise<Result> {
  const key = String(ref ?? "").trim();
  if (!key) return { error: "Order number is required.", status: 400 };
  const order = (await findOneByField<Order>("orders", "orderNumber", key)) ?? (await getDoc<Order>("orders", key));
  if (!order || !orderMatchesContact(order, contact)) {
    return { error: "We could not find an order matching those details.", status: 404 };
  }
  if (order.status !== "delivered") {
    return { error: "Return and exchange requests are only allowed for delivered orders.", status: 400 };
  }
  const deliveredAt = new Date(order.deliveredDate || order.updatedAt).getTime();
  if (Date.now() - deliveredAt > RETURN_WINDOW_DAYS * 86_400_000) {
    return { error: `The ${RETURN_WINDOW_DAYS}-day return / exchange window for this order has closed.`, status: 400 };
  }
  return { order };
}
