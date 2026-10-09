import { getDoc, updateDoc, upsertDoc } from "@/lib/db/store";
import { prisma } from "@/lib/db/prisma";
import { applyShipmentEvent } from "@/lib/orders/service";
import { sendTransactionalEmail } from "@/lib/email/service";
import type { Order, OrderStatus, ShipmentRecord } from "@/lib/db/types";
import { cancelShipment, fetchBookingFromPanel, getShipmozoConfig, pushOrder, shipOrder, trackAwb, type Parcel } from "./shipmozo";

/**
 * Shipping is done through ShipMozo. This module ties it into the order lifecycle:
 * confirmed order → (auto) pushed to ShipMozo; admin dispatch → courier + AWB; courier scans →
 * order status + customer e-mails; cancelled order → ShipMozo booking cancelled.
 */

export interface CreateShipmentParams {
  orderId: string;
  courierId?: string;
  parcel?: Partial<Parcel>;
  siteUrl?: string;
}

/** Books a courier on ShipMozo for a confirmed order and stores the AWB on it. */
export async function createShipmentForOrder(params: CreateShipmentParams) {
  try {
    const r = await shipOrder(params.orderId, { courierId: params.courierId, parcel: params.parcel, siteUrl: params.siteUrl });
    return { success: true as const, awb: r.awb, courierName: r.courierName, labelUrl: r.labelUrl, pickupScheduled: r.pickupScheduled, pickupMessage: r.pickupMessage };
  } catch (err) {
    console.error("createShipmentForOrder:", err);
    return { success: false as const, error: (err as Error).message || "Could not create the shipment." };
  }
}

/** New paid / COD order: send it to ShipMozo so it shows up in the panel (no courier is booked). */
export async function onOrderConfirmed(order: Order): Promise<void> {
  if (order.status === "on_hold") return; // needs a human first
  const cfg = await getShipmozoConfig();
  if (!cfg?.autoPush) return;
  try {
    await pushOrder(order.id);
  } catch (e) {
    console.error(`[shipmozo] auto-push of ${order.orderNumber} failed:`, (e as Error).message);
  }
}

/** Order cancelled in the shop: cancel its ShipMozo booking too (best effort, logged on the order). */
export async function onOrderCancelled(orderId: string): Promise<void> {
  const order = await getDoc<Order>("orders", orderId);
  if (order?.shipmozo?.pushedAt) await cancelShipment(order);
}

const STATUS_EMAIL: Partial<Record<OrderStatus, "ORDER_SHIPPED" | "OUT_FOR_DELIVERY" | "ORDER_DELIVERED">> = {
  shipped: "ORDER_SHIPPED",
  out_for_delivery: "OUT_FOR_DELIVERY",
  delivered: "ORDER_DELIVERED",
};

const ACTIVE: OrderStatus[] = ["paid", "processing", "shipped", "out_for_delivery", "completed"];

/** Records a sync attempt (also failed / not-yet-booked ones, so the cron queue keeps moving). */
async function markSynced(orderId: string, patch: { lastStatus?: string; estimatedDelivery?: string } = {}) {
  const now = new Date().toISOString();
  await updateDoc<Order>("orders", orderId, (o) => ({
    doc: o.shipmozo
      ? { ...o, estimatedDelivery: patch.estimatedDelivery ?? o.estimatedDelivery, shipmozo: { ...o.shipmozo, lastStatus: patch.lastStatus || o.shipmozo.lastStatus, lastSyncAt: now } }
      : null,
    result: undefined,
  }));
}

/** Pulls the latest courier status for one order from ShipMozo and applies it (forward-only). */
export async function syncOrderTracking(orderOrId: Order | string): Promise<{ ok: boolean; status?: OrderStatus; courierStatus?: string; error?: string }> {
  const initial = typeof orderOrId === "string" ? await getDoc<Order>("orders", orderOrId) : orderOrId;
  if (!initial) return { ok: false, error: "Order not found." };
  const cfg = await getShipmozoConfig();
  if (!cfg) return { ok: false, error: "ShipMozo is not connected." };
  let order: Order = initial;

  try {
    // Courier booked in the ShipMozo panel instead of from our admin: fetch the AWB first.
    if (!order.trackingNumber && order.shipmozo?.pushedAt) {
      if (!(await fetchBookingFromPanel(order))) {
        await markSynced(order.id);
        return { ok: true, status: order.status, courierStatus: "Courier not booked yet" };
      }
      order = (await getDoc<Order>("orders", order.id)) ?? order;
    }
    const awb = order.trackingNumber;
    if (!awb) return { ok: false, error: "Order has no AWB yet." };

    const info = await trackAwb(awb, cfg);
    // The courier named at booking is kept; tracking only fills it in when it's missing.
    const result = info.status ? await applyShipmentEvent(order.id, { statusText: info.status, awb, courier: order.courierName ? undefined : info.courier }) : { status: order.status };
    await markSynced(order.id, { lastStatus: info.status, estimatedDelivery: info.expectedDelivery });
    if (info.events.length) {
      const prev = await getDoc<ShipmentRecord>("shipments", `shp-${order.id}`);
      if (prev) await upsertDoc<ShipmentRecord>("shipments", { ...prev, events: info.events.slice(0, 40), updatedAt: new Date().toISOString() });
    }

    const newStatus = result.status;
    const email = newStatus && newStatus !== order.status ? STATUS_EMAIL[newStatus] : undefined;
    if (email) {
      const fresh = await getDoc<Order>("orders", order.id);
      if (fresh) await sendTransactionalEmail(email, fresh).catch((e) => console.error("Shipping e-mail failed:", e));
    }
    return { ok: true, status: newStatus, courierStatus: info.status };
  } catch (e) {
    await markSynced(order.id).catch(() => {});
    return { ok: false, error: (e as Error).message };
  }
}

/** Cron: refresh every ShipMozo order that is not delivered yet (and pick up AWBs booked in the panel), least recently synced first. */
export async function syncActiveShipments(limit = 60): Promise<{ checked: number; updated: number; errors: string[] }> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM documents
    WHERE collection = 'orders'
      AND data ? 'shipmozo'
      AND data->>'status' = ANY(${ACTIVE})
      -- pushed but never booked: stop asking after 30 days
      AND (coalesce(data->>'trackingNumber', '') <> '' OR data->'shipmozo'->>'pushedAt' > ${new Date(Date.now() - 30 * 86_400_000).toISOString()})
    ORDER BY coalesce(data->'shipmozo'->>'lastSyncAt', '') ASC
    LIMIT ${limit}`;
  let updated = 0;
  const errors: string[] = [];
  for (const { id } of rows) {
    const order = await getDoc<Order>("orders", id);
    if (!order) continue;
    const r = await syncOrderTracking(order);
    if (!r.ok) errors.push(`${order.orderNumber}: ${r.error}`);
    else if (r.status && r.status !== order.status) updated++;
  }
  return { checked: rows.length, updated, errors: errors.slice(0, 20) };
}

export async function getShipmentByOrderId(orderId: string) {
  const order = await getDoc<Order>("orders", orderId);
  if (!order) return null;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    shippingAddress: order.shipping,
    createdAt: order.createdAt,
    trackingNumber: order.trackingNumber,
  };
}
