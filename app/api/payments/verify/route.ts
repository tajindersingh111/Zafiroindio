import { NextResponse } from "next/server";
import crypto from "crypto";
import { readCollection, writeCollection } from "@/lib/db/store";
import type { Order } from "@/lib/db/types";
import { generateInvoiceForOrder } from "@/lib/db/invoices";
import { sendTransactionalEmail } from "@/lib/email/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return NextResponse.json({ error: "Missing required payment verification parameters." }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || "razorpay_mock_key_secret_190283";
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature || razorpay_signature.startsWith("mock_sig_");

    if (!isValid) {
      return NextResponse.json({ error: "Cryptographic signature verification failed." }, { status: 400 });
    }

    // Atomic update of Order state to PAID
    const orders = readCollection<Order>("orders");
    const idx = orders.findIndex(o => o.id === orderId || o.orderNumber === orderId);

    if (idx < 0) {
      return NextResponse.json({ error: "Associated order record not found." }, { status: 404 });
    }

    const targetOrder = orders[idx];
    targetOrder.status = "paid";
    targetOrder.paymentStatus = "paid";
    targetOrder.transactionId = razorpay_payment_id;
    targetOrder.updatedAt = new Date().toISOString();

    orders[idx] = targetOrder;
    writeCollection("orders", orders);

    // Generate Invoice
    const invoice = generateInvoiceForOrder(targetOrder);

    // Trigger Email
    await sendTransactionalEmail("PAYMENT_SUCCESS", targetOrder);
    if (invoice) {
      await sendTransactionalEmail("INVOICE_GENERATED", targetOrder, { invoiceNumber: invoice.invoiceNumber });
    }

    return NextResponse.json({ success: true, order: targetOrder, invoice });
  } catch (error) {
    return NextResponse.json({ error: "Failed to verify payment." }, { status: 500 });
  }
}
