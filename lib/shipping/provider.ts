import { getDoc } from "@/lib/db/store";
import type { Order } from "@/lib/db/types";
import { createShipmentForOrder as shiprocketCreateShipment } from "./shiprocket";

export interface CreateShipmentParams {
  orderId: string;
}

/** Creates a shipment for a confirmed order via Shiprocket. */
export async function createShipmentForOrder(params: CreateShipmentParams) {
  return shiprocketCreateShipment(params.orderId);
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
