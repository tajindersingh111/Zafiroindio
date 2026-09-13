import { NextResponse } from "next/server";
import crypto from "crypto";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Order, WebhookEventRecord } from "@/lib/db/types";
import { generateInvoiceForOrder } from "@/lib/db/invoices";
import { sendTransactionalEmail } from "@/lib/email/service";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "razorpay_mock_webhook_secret_827361";

    if (signature && process.env.RAZORPAY_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventId = payload.event_id || payload.id || `evt_${Date.now()}`;
    const eventType = payload.event || "payment.captured";

    // Idempotency Check: Avoid processing duplicate webhook events
    const processedEvents = readCollection<WebhookEventRecord>("webhook_events");
    if (processedEvents.some(e => e.eventId === eventId)) {
      return NextResponse.json({ message: "Event already processed (Idempotent)." }, { status: 200 });
    }

    // Process event payload
    const paymentEntity = payload.payload?.payment?.entity || {};
    const orderEntity = payload.payload?.order?.entity || {};
    const razorpayOrderId = paymentEntity.order_id || orderEntity.id;
    const razorpayPaymentId = paymentEntity.id;

    if (razorpayOrderId) {
      const orders = readCollection<Order>("orders");
      const idx = orders.findIndex(o => o.transactionId === razorpayPaymentId || o.orderNumber === orderEntity.receipt);

      if (idx >= 0) {
        const order = orders[idx];

        if (eventType === "payment.captured" || eventType === "order.paid") {
          order.status = "paid";
          order.paymentStatus = "paid";
          order.transactionId = razorpayPaymentId || order.transactionId;
          order.updatedAt = new Date().toISOString();
          orders[idx] = order;
          writeCollection("orders", orders);

          const invoice = generateInvoiceForOrder(order);
          await sendTransactionalEmail("PAYMENT_SUCCESS", order);
          if (invoice) {
            await sendTransactionalEmail("INVOICE_GENERATED", order, { invoiceNumber: invoice.invoiceNumber });
          }
        } else if (eventType === "payment.failed") {
          order.status = "payment_failed";
          order.paymentStatus = "failed";
          order.updatedAt = new Date().toISOString();
          orders[idx] = order;
          writeCollection("orders", orders);

          await sendTransactionalEmail("PAYMENT_FAILED", order);
        }
      }
    }

    // Save processed webhook record for idempotency
    processedEvents.unshift({
      id: `whk-${Date.now()}`,
      eventId,
      provider: "razorpay",
      eventType,
      processedAt: new Date().toISOString(),
      payloadSummary: JSON.stringify({ eventType, razorpayOrderId, razorpayPaymentId }).substring(0, 200)
    });
    writeCollection("webhook_events", processedEvents);

    return NextResponse.json({ status: "success", eventId });
  } catch (error) {
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}
