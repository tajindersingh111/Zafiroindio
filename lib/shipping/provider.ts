import { readCollection, writeCollection } from "@/lib/db/store";
import type { Order, ShipmentRecord } from "@/lib/db/types";

export interface CreateShipmentParams {
  order: Order;
  courierName?: string;
  weightKg?: number;
  dimensionsCm?: string;
}

export async function createShipmentForOrder(params: CreateShipmentParams): Promise<ShipmentRecord> {
  const { order, courierName = "Delhivery Express", weightKg = 1.2, dimensionsCm = "30x20x10" } = params;
  const now = new Date().toISOString();
  
  const randomAWB = `AWB${Math.floor(100000000 + Math.random() * 900000000)}`;
  const trackingUrl = `https://track.zafiroindio.com/tracking?awb=${randomAWB}`;

  const shipments = readCollection<ShipmentRecord>("shipments");
  
  const existing = shipments.find(s => s.orderId === order.id);
  if (existing) {
    return existing;
  }

  const newShipment: ShipmentRecord = {
    id: `shp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    courierName,
    trackingNumber: randomAWB,
    trackingUrl,
    labelUrl: `/api/shipments/${order.id}/label`,
    status: "SHIPMENT_CREATED",
    weight: weightKg,
    dimensions: dimensionsCm,
    shippedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  shipments.unshift(newShipment);
  writeCollection("shipments", shipments);

  // Update order record with shipping tracking details
  const orders = readCollection<Order>("orders");
  const idx = orders.findIndex(o => o.id === order.id);
  if (idx >= 0) {
    orders[idx] = {
      ...orders[idx],
      trackingNumber: randomAWB,
      courierName,
      trackingUrl,
      shippingDate: now,
      status: orders[idx].status === "payment_pending" ? "payment_pending" : "shipped",
      updatedAt: now,
    };
    writeCollection("orders", orders);
  }

  return newShipment;
}

export function getShipmentByOrderId(orderId: string): ShipmentRecord | null {
  const shipments = readCollection<ShipmentRecord>("shipments");
  return shipments.find(s => s.orderId === orderId || s.orderNumber === orderId) || null;
}
