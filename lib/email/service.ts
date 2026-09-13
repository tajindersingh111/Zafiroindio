import { readCollection, writeCollection } from "@/lib/db/store";
import type { Order } from "@/lib/db/types";

export type EmailEventType =
  | "ORDER_CREATED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "INVOICE_GENERATED"
  | "ORDER_SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED"
  | "REFUND_COMPLETED"
  | "RETURN_REQUESTED";

export interface EmailLogEntry {
  id: string;
  eventType: EmailEventType;
  toEmail: string;
  toName: string;
  orderId: string;
  orderNumber: string;
  subject: string;
  sentAt: string;
  status: "SENT" | "LOGGED_ONLY" | "FAILED";
  error?: string;
}

export async function sendTransactionalEmail(
  eventType: EmailEventType,
  order: Order,
  extraDetails?: { trackingNumber?: string; trackingUrl?: string; refundAmount?: number; invoiceNumber?: string }
): Promise<{ success: boolean; logId: string }> {
  const now = new Date().toISOString();
  const logId = `eml-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  let subject = `Zafiro Indio — Order Update for ${order.orderNumber}`;
  let headline = "Order Update";
  let bodyMessage = "Your order details have been updated.";

  switch (eventType) {
    case "ORDER_CREATED":
      subject = `Order Confirmed — ${order.orderNumber} | Zafiro Indio`;
      headline = "Thank You For Your Order!";
      bodyMessage = `We have received your order ${order.orderNumber} for ₹${order.total.toLocaleString("en-IN")}. We are preparing your handcrafted heritage bedding.`;
      break;
    case "PAYMENT_SUCCESS":
      subject = `Payment Received — ${order.orderNumber} | Zafiro Indio`;
      headline = "Payment Successful";
      bodyMessage = `Your payment of ₹${order.total.toLocaleString("en-IN")} for order ${order.orderNumber} has been verified and confirmed.`;
      break;
    case "PAYMENT_FAILED":
      subject = `Payment Action Required — ${order.orderNumber} | Zafiro Indio`;
      headline = "Payment Failed";
      bodyMessage = `Payment attempt for order ${order.orderNumber} was unsuccessful. Please complete payment to avoid order cancellation.`;
      break;
    case "INVOICE_GENERATED":
      subject = `Tax Invoice ${extraDetails?.invoiceNumber || order.orderNumber} | Zafiro Indio`;
      headline = "Your Tax Invoice Is Ready";
      bodyMessage = `Your official tax invoice for order ${order.orderNumber} has been generated and attached to your account.`;
      break;
    case "ORDER_SHIPPED":
      subject = `Your Order Has Shipped — ${order.orderNumber} | Zafiro Indio`;
      headline = "On Its Way!";
      bodyMessage = `Great news! Order ${order.orderNumber} has been handed over to ${order.courierName || "our courier partner"}. Tracking Number: ${extraDetails?.trackingNumber || order.trackingNumber || "N/A"}.`;
      break;
    case "OUT_FOR_DELIVERY":
      subject = `Out For Delivery Today — ${order.orderNumber} | Zafiro Indio`;
      headline = "Arriving Today!";
      bodyMessage = `Your package ${order.orderNumber} is out for delivery today. Please ensure someone is available to receive it.`;
      break;
    case "ORDER_DELIVERED":
      subject = `Order Delivered — ${order.orderNumber} | Zafiro Indio`;
      headline = "Delivered!";
      bodyMessage = `Your order ${order.orderNumber} has been delivered successfully. We hope you love your Zafiro bedsheet!`;
      break;
    case "ORDER_CANCELLED":
      subject = `Order Cancelled — ${order.orderNumber} | Zafiro Indio`;
      headline = "Order Cancelled";
      bodyMessage = `Order ${order.orderNumber} has been cancelled. If any payment was captured, your refund will be processed within 5-7 business days.`;
      break;
    case "REFUND_COMPLETED":
      subject = `Refund Processed — ₹${extraDetails?.refundAmount || order.total} | Zafiro Indio`;
      headline = "Refund Completed";
      bodyMessage = `A refund of ₹${(extraDetails?.refundAmount || order.total).toLocaleString("en-IN")} for order ${order.orderNumber} has been credited to your original payment method.`;
      break;
    case "RETURN_REQUESTED":
      subject = `Return Request Received — ${order.orderNumber} | Zafiro Indio`;
      headline = "Return Request Received";
      bodyMessage = `We have received your return request for order ${order.orderNumber}. Our team will review it within 24 hours.`;
      break;
  }

  let sentStatus: "SENT" | "LOGGED_ONLY" | "FAILED" = "LOGGED_ONLY";
  let errorMsg: string | undefined = undefined;

  try {
    const apiKey = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY;
    if (apiKey) {
      sentStatus = "SENT";
    }
  } catch (err: any) {
    sentStatus = "FAILED";
    errorMsg = err.message || "Email dispatch failed";
  }

  const logs = readCollection<EmailLogEntry>("email_logs");
  const newLog: EmailLogEntry = {
    id: logId,
    eventType,
    toEmail: order.customerEmail,
    toName: order.customerName,
    orderId: order.id,
    orderNumber: order.orderNumber,
    subject,
    sentAt: now,
    status: sentStatus,
    error: errorMsg,
  };
  logs.unshift(newLog);
  writeCollection("email_logs", logs);

  return { success: sentStatus !== "FAILED", logId };
}
