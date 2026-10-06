import { getDoc, updateDoc, upsertDoc } from "@/lib/db/store";
import type { Order, ShipmentRecord } from "@/lib/db/types";
import crypto from "crypto";

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Gets a valid Shiprocket API token, auto-refreshing before 9-day expiration.
 */
export async function getShiprocketToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && tokenExpiry > now + 3600 * 1000) {
    return cachedToken;
  }

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  const apiKey = process.env.SHIPROCKET_API_KEY;

  if (!email || !password) {
    if (apiKey) return apiKey;
    console.warn("SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD missing in env.");
    return null;
  }

  try {
    const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.token) {
        cachedToken = data.token;
        tokenExpiry = now + 9 * 24 * 60 * 60 * 1000;
        return cachedToken;
      }
    } else {
      const errText = await res.text();
      console.error("Shiprocket Auth Failed:", res.status, errText);
    }
  } catch (err) {
    console.error("Shiprocket token request exception:", err);
  }

  return apiKey || null;
}

export interface CreateShipmentParams {
  orderId: string;
}

/**
 * Pushes a confirmed order to Shiprocket (Shiprocket Shipping API) for fulfilment and stores the
 * resulting shipment/AWB on the order. Never changes order status on failure.
 */
export async function createShipmentForOrder(orderId: string): Promise<{ success: boolean; awb?: string; shipmentId?: string; error?: string }> {
  try {
    const order = await getDoc<Order>("orders", orderId);
    if (!order) return { success: false, error: "Order not found" };
    if (order.status === "cancelled" || order.status === "refunded") {
      return { success: false, error: `Order is ${order.status}; cannot ship.` };
    }
    if (order.trackingNumber) {
      return { success: true, awb: order.trackingNumber };
    }

    const token = await getShiprocketToken();
    if (!token) return { success: false, error: "Shiprocket shipping credentials (SHIPROCKET_EMAIL/SHIPROCKET_PASSWORD) are not configured." };

    const addr = order.shipping || order.billing;
    if (!addr?.address1 || !addr.postalCode || !addr.city || !addr.state) {
      return { success: false, error: "Order has an incomplete shipping address." };
    }
    const phone = addr.phone || order.customerPhone;
    if (!phone) return { success: false, error: "Order has no phone number." };

    const payload = {
      order_id: order.orderNumber,
      order_date: new Date(order.createdAt).toISOString().replace("T", " ").slice(0, 16),
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
      billing_customer_name: addr.firstName || order.customerName || "Customer",
      billing_last_name: addr.lastName || "",
      billing_address: addr.address1,
      billing_address_2: addr.address2 || "",
      billing_city: addr.city,
      billing_pincode: addr.postalCode,
      billing_state: addr.state,
      billing_country: addr.country || "India",
      billing_email: addr.email || order.customerEmail,
      billing_phone: phone,
      shipping_is_billing: true,
      order_items: order.items.map((item) => ({
        name: item.name,
        sku: item.sku || item.productId,
        units: item.quantity,
        selling_price: item.price,
        discount: 0,
        tax: 0,
        hsn: 0,
      })),
      payment_method: order.paymentMethod === "cod" ? "COD" : "Prepaid",
      sub_total: order.subtotal,
      length: 30,
      breadth: 25,
      height: 8,
      weight: 1.5,
    };

    const res = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Shiprocket order push failed:", res.status, errorData.slice(0, 500));
      return { success: false, error: `Shiprocket rejected the order (${res.status}).` };
    }

    const data = await res.json();
    const shipmentId = data.shipment_id ? String(data.shipment_id) : undefined;
    const awb = data.awb_code ? String(data.awb_code) : undefined;
    const now = new Date().toISOString();

    await updateDoc<Order>("orders", orderId, (o) => ({
      doc: {
        ...o,
        trackingNumber: awb || o.trackingNumber,
        courierName: data.courier_name || o.courierName,
        status: o.status === "paid" || o.status === "payment_pending" ? "processing" : o.status,
        updatedAt: now,
      },
      result: undefined,
    }));
    await upsertDoc<ShipmentRecord>("shipments", {
      id: `shp-${order.id}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      courierName: data.courier_name || "Shiprocket",
      trackingNumber: awb || shipmentId || "",
      status: "SHIPMENT_CREATED",
      isLiveCourier: true,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, awb, shipmentId };
  } catch (err: any) {
    console.error("createShipmentForOrder error:", err);
    return { success: false, error: err?.message || "Unknown error creating shipment" };
  }
}

/**
 * Verifies incoming Shiprocket Tracking Webhook signature (HMAC-SHA256 hex or base64). Fails closed.
 */
export function verifyShiprocketTrackingWebhook(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.SHIPROCKET_TRACKING_WEBHOOK_SECRET || process.env.SHIPROCKET_CHECKOUT_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const hex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const b64 = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const sig = Buffer.from(signatureHeader);
  return [hex, b64].some((expected) => {
    const e = Buffer.from(expected);
    return e.length === sig.length && crypto.timingSafeEqual(e, sig);
  });
}
