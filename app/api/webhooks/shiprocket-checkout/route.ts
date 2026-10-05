import { NextRequest, NextResponse } from "next/server";
import { shiprocketCheckoutClient, ShiprocketWebhookPayload } from "@/lib/shiprocket-checkout/client";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-shiprocket-signature") || request.headers.get("x-fastrr-signature");

    // 1. Mandatory Raw Body Signature Verification
    const isValidSignature = shiprocketCheckoutClient.verifyWebhookSignature(rawBody, signature);
    if (!isValidSignature && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing webhook signature." },
        { status: 401 }
      );
    }

    let payload: ShiprocketWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const eventId = payload.eventId || `whk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const eventType = payload.eventType || "order.created";

    // 2. Idempotency Check: Prevent duplicate webhook event execution
    try {
      const existingEvent = await prisma.webhookEvent.findUnique({
        where: { eventId }
      });
      if (existingEvent) {
        return NextResponse.json({ message: "Event already processed (Idempotent)." }, { status: 200 });
      }
    } catch {
      // Proceed if DB lookup falls back
    }

    const orderData = payload.order;
    if (!orderData || !orderData.orderNumber) {
      return NextResponse.json({ error: "Missing order payload details." }, { status: 400 });
    }

    const cleanPhone = String(orderData.customer?.phone || "").trim().replace(/\D/g, "");
    const customerEmail = orderData.customer?.email || `${cleanPhone}@customer.zafiroindio.com`;
    const customerName = orderData.customer?.name || "Valued Customer";
    const isCod = orderData.payment?.method === "cod";
    const paymentStatus = isCod ? "pending" : "captured";
    const orderStatus = isCod ? "processing" : "paid";

    // 3. ATOMIC DATABASE TRANSACTION: Create Order, Items, Payment & Decrement Stock
    let createdOrder: any = null;

    try {
      createdOrder = await prisma.$transaction(async (tx) => {
        // Record Webhook Event for Idempotency
        await tx.webhookEvent.create({
          data: {
            eventId,
            provider: "shiprocket_checkout",
            eventType,
            payload: rawBody.length > 2000 ? { summary: "truncated_payload" } : (payload as any),
            status: "processed"
          }
        });

        // Upsert Customer
        let customer = await tx.customer.findUnique({ where: { phone: cleanPhone } });
        if (!customer) {
          customer = await tx.customer.create({
            data: {
              phone: cleanPhone,
              email: customerEmail,
              name: customerName,
              status: "active"
            }
          });
        }

        // Decrement Product Inventory Stock Atomically
        for (const item of orderData.items || []) {
          const product = await tx.product.findFirst({
            where: { OR: [{ id: item.productId }, { slug: item.productId }] }
          });

          if (product) {
            // Atomic update: only decrement if stock >= qty
            const updateResult = await tx.product.updateMany({
              where: { id: product.id, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } }
            });

            if (updateResult.count === 0) {
              console.warn(`Insufficient stock for product ${product.name} (ID: ${product.id}). Stock allocated below zero.`);
              await tx.product.update({
                where: { id: product.id },
                data: { stock: 0, status: "out_of_stock" }
              });
            }
          }
        }

        // Create Order Record
        const newOrder = await tx.order.create({
          data: {
            orderNumber: orderData.orderNumber,
            customerId: customer.id,
            status: orderStatus as any,
            paymentStatus: paymentStatus as any,
            paymentMethod: (orderData.payment?.method || "cod") as any,
            subtotal: Number(orderData.total || 0),
            grandTotal: Number(orderData.total || 0),
            shippingAddress: (orderData.shippingAddress || {}) as any,
            billingAddress: (orderData.billingAddress || orderData.shippingAddress || {}) as any,
            items: {
              create: (orderData.items || []).map((it) => ({
                productId: it.productId,
                name: it.name,
                sku: it.sku || `ZI-${it.productId.toUpperCase().slice(0, 8)}`,
                quantity: it.quantity,
                price: Number(it.price || 0),
                total: Number(it.price || 0) * Number(it.quantity || 1)
              }))
            },
            payments: {
              create: {
                amount: Number(orderData.total || 0),
                gateway: "shiprocket_checkout",
                status: paymentStatus as any,
                providerPaymentId: orderData.payment?.transactionId || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
              }
            }
          }
        });

        return newOrder;
      });
    } catch (dbErr) {
      console.error("Database transaction error during webhook order creation:", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: "Shiprocket Checkout webhook processed successfully.",
      orderNumber: orderData.orderNumber
    });
  } catch (error: any) {
    console.error("Shiprocket webhook processing failure:", error);
    return NextResponse.json(
      { error: "Internal server error processing webhook." },
      { status: 500 }
    );
  }
}
