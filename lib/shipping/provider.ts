import { prisma } from "@/lib/db/prisma";
import { createShipmentForOrder as shiprocketCreateShipment } from "./shiprocket";

export interface CreateShipmentParams {
  orderId: string;
}

/**
 * Creates shipment for a confirmed order via Shiprocket.
 */
export async function createShipmentForOrder(params: CreateShipmentParams) {
  const { orderId } = params;
  return await shiprocketCreateShipment(orderId);
}

/**
 * Retrieves shipment metadata for an order from Prisma DB.
 */
export async function getShipmentByOrderId(orderId: string) {
  return await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      shippingAddress: true,
      createdAt: true
    }
  });
}
