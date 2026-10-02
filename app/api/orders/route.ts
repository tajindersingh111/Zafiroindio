import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Order, Product } from "@/lib/db/types";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

// Public POST endpoint for Customer Checkout
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, any>;
    const orders = readCollection<Order>("orders");
    const products = readCollection<Product>("products");
    const now = new Date().toISOString();
    const count = orders.length + 1;

    // Validate customer inputs
    const customerName = (body.customerName || "").trim();
    const customerEmail = (body.customerEmail || "").trim();
    const customerPhone = (body.customerPhone || "").trim();
    const billing = body.billing || {};
    const shipping = body.shipping || {};
    const items = Array.isArray(body.items) ? body.items : [];
    const paymentMethod = body.paymentMethod || "cod";
    const paymentStatus = body.paymentStatus || (paymentMethod === "cod" ? "pending" : "paid");

    if (!customerName || items.length === 0) {
      return NextResponse.json(
        { error: "Customer name and at least 1 item are required to place an order." },
        { status: 400 }
      );
    }

    // Generate unique Order Number & ID
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randHex = crypto.randomBytes(2).toString("hex").toUpperCase();
    const orderNumber = `ZI-${dateStr}-${String(count).padStart(4, "0")}-${randHex}`;

    // Process line items & reduce inventory stock
    const processedItems = items.map((item: any, idx: number) => {
      const product = products.find((p) => p.slug === item.productId || p.id === item.productId);
      const price = Number(item.price ?? product?.price ?? 0);
      const quantity = Number(item.quantity ?? 1);

      // Decrement stock if product found
      if (product) {
        product.stock = Math.max(0, product.stock - quantity);
        if (product.stock === 0) product.stockStatus = "out_of_stock";
      }

      return {
        id: uuidv4(),
        productId: product?.id || item.productId || `prod-${idx}`,
        name: item.name || product?.name || "Product",
        sku: item.sku || product?.sku || `ZI-ITEM-${idx}`,
        quantity,
        price,
        total: price * quantity,
        discount: 0,
        tax: 0,
        attributes: item.attributes || []
      };
    });

    // Save updated products stock
    if (products.length > 0) {
      writeCollection("products", products);
    }

    const subtotal = processedItems.reduce((acc, i) => acc + i.total, 0);
    const discount = Number(body.discount || 0);
    const shippingCost = Number(body.shippingCost || 0);
    const grandTotal = Math.max(0, Number(body.total || subtotal - discount + shippingCost));

    const newOrder: Order = {
      id: uuidv4(),
      orderNumber,
      customerName,
      customerEmail,
      customerPhone,
      status: "paid",
      paymentStatus: paymentStatus as any,
      paymentMethod: paymentMethod as any,
      type: "retail",
      subtotal,
      discount,
      couponDiscount: discount,
      shippingCost,
      tax: 0,
      total: grandTotal,
      couponCode: body.couponCode,
      notes: [],
      billing: {
        firstName: billing.firstName || customerName.split(" ")[0] || "Customer",
        lastName: billing.lastName || customerName.split(" ").slice(1).join(" ") || "",
        address1: billing.address1 || "",
        city: billing.city || "",
        state: billing.state || "",
        postalCode: billing.postalCode || "",
        country: billing.country || "India",
        phone: billing.phone || customerPhone,
        email: billing.email || customerEmail
      },
      shipping: {
        firstName: shipping.firstName || customerName.split(" ")[0] || "Customer",
        lastName: shipping.lastName || customerName.split(" ").slice(1).join(" ") || "",
        address1: shipping.address1 || "",
        city: shipping.city || "",
        state: shipping.state || "",
        postalCode: shipping.postalCode || "",
        country: shipping.country || "India",
        phone: shipping.phone || customerPhone,
        email: shipping.email || customerEmail
      },
      items: processedItems,
      createdAt: now,
      updatedAt: now
    };

    // Append to orders collection
    const updatedOrders = [newOrder, ...orders];
    writeCollection("orders", updatedOrders);

    // Auto-create shipment AWB record
    try {
      const { createShipmentForOrder } = require("@/lib/shipping/provider");
      createShipmentForOrder({ order: newOrder }).catch(() => {});
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Order placed successfully!",
      order: {
        id: newOrder.id,
        orderNumber: newOrder.orderNumber,
        total: newOrder.total,
        status: newOrder.status
      }
    });
  } catch (error: any) {
    console.error("Public place order error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error while placing order." },
      { status: 500 }
    );
  }
}
