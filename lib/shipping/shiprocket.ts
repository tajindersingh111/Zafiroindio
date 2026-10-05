import { prisma } from "@/lib/db/prisma";
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
 * Pushes a confirmed order to Shiprocket for fulfillment.
 */
export async function createShipmentForOrder(orderId: string): Promise<{ success: boolean; awb?: string; error?: string }> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    const token = await getShiprocketToken();
    if (!token) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "processing" }
      });
      return { success: false, error: "Shiprocket auth token unavailable" };
    }

    const shippingAddr = (order.shippingAddress || order.billingAddress || {}) as Record<string, any>;
    const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION || "Primary";

    const payload = {
      order_id: order.orderNumber,
      order_date: new Date(order.createdAt).toISOString().replace("T", " ").slice(0, 19),
      pickup_location: pickupLocation,
      billing_customer_name: shippingAddr.name || shippingAddr.firstName || "Customer",
      billing_last_name: shippingAddr.lastName || "",
      billing_address: shippingAddr.address1 || "Address Line 1",
      billing_address_2: shippingAddr.address2 || "",
      billing_city: shippingAddr.city || "New Delhi",
      billing_pincode: shippingAddr.postalCode || "110001",
      billing_state: shippingAddr.state || "Delhi",
      billing_country: shippingAddr.country || "India",
      billing_email: shippingAddr.email || "customer@example.com",
      billing_phone: shippingAddr.phone || "9999999999",
      shipping_is_billing: true,
      order_items: order.items.map((item) => ({
        name: item.name,
        sku: item.sku || item.productId || "SKU",
        units: item.quantity,
        selling_price: item.price,
        discount: item.discount,
        tax: item.tax,
        hsn: 0
      })),
      payment_method: order.paymentMethod === "cod" ? "COD" : "Prepaid",
      sub_total: order.subtotal,
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5
    };

    const res = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      const awbCode = data.awb_code || (data.shipment_id ? String(data.shipment_id) : undefined);

      await prisma.order.update({
        where: { id: orderId },
        data: { status: "processing" }
      });

      return { success: true, awb: awbCode };
    } else {
      const errorData = await res.text();
      console.error("Shiprocket order push failed:", errorData);

      await prisma.order.update({
        where: { id: orderId },
        data: { status: "processing" }
      });

      return { success: false, error: errorData };
    }
  } catch (err: any) {
    console.error("createShipmentForOrder error:", err);
    return { success: false, error: err?.message || "Unknown error creating shipment" };
  }
}

/**
 * Verifies incoming Shiprocket Tracking Webhook signature.
 */
export function verifyShiprocketTrackingWebhook(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.SHIPROCKET_TRACKING_WEBHOOK_SECRET || process.env.SHIPROCKET_CHECKOUT_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signatureHeader) return false;

  try {
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}
