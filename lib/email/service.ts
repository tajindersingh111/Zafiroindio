import type { Order } from "@/lib/db/types";
import { upsertDoc } from "@/lib/db/store";

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
  order: Partial<Order> & { id: string; orderNumber: string; customerEmail: string; customerName: string; total: number },
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
      bodyMessage = `We have received your order ${order.orderNumber} for ₹${order.total.toLocaleString("en-IN")}.`;
      break;
    case "PAYMENT_SUCCESS":
      subject = `Payment Received — ${order.orderNumber} | Zafiro Indio`;
      headline = "Payment Successful";
      bodyMessage = `Your payment of ₹${order.total.toLocaleString("en-IN")} for order ${order.orderNumber} has been verified and confirmed.`;
      break;
    case "PAYMENT_FAILED":
      subject = `Payment Action Required — ${order.orderNumber} | Zafiro Indio`;
      headline = "Payment Failed";
      bodyMessage = `Payment attempt for order ${order.orderNumber} was unsuccessful.`;
      break;
    case "INVOICE_GENERATED":
      subject = `Tax Invoice ${extraDetails?.invoiceNumber || order.orderNumber} | Zafiro Indio`;
      headline = "Your Tax Invoice Is Ready";
      bodyMessage = `Your official tax invoice for order ${order.orderNumber} has been generated.`;
      break;
    case "ORDER_SHIPPED":
      subject = `Your Order Has Shipped — ${order.orderNumber} | Zafiro Indio`;
      headline = "On Its Way!";
      bodyMessage = `Great news! Order ${order.orderNumber} has been handed over to courier.`;
      break;
    case "OUT_FOR_DELIVERY":
      subject = `Out For Delivery Today — ${order.orderNumber} | Zafiro Indio`;
      headline = "Arriving Today!";
      bodyMessage = `Your package ${order.orderNumber} is out for delivery today.`;
      break;
    case "ORDER_DELIVERED":
      subject = `Order Delivered — ${order.orderNumber} | Zafiro Indio`;
      headline = "Delivered!";
      bodyMessage = `Your order ${order.orderNumber} has been delivered successfully.`;
      break;
    case "ORDER_CANCELLED":
      subject = `Order Cancelled — ${order.orderNumber} | Zafiro Indio`;
      headline = "Order Cancelled";
      bodyMessage = `Order ${order.orderNumber} has been cancelled.`;
      break;
    case "REFUND_COMPLETED":
      subject = `Refund Processed — ₹${extraDetails?.refundAmount || order.total} | Zafiro Indio`;
      headline = "Refund Completed";
      bodyMessage = `A refund for order ${order.orderNumber} has been credited.`;
      break;
    case "RETURN_REQUESTED":
      subject = `Return Request Received — ${order.orderNumber} | Zafiro Indio`;
      headline = "Return Request Received";
      bodyMessage = `We have received your return request for order ${order.orderNumber}.`;
      break;
  }

  const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const trackLink = extraDetails?.trackingUrl ? `<p><a href="${esc(extraDetails.trackingUrl)}">Track your shipment</a></p>` : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f7f1e6;font-family:Georgia,serif;color:#1b1f3b">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#fffdf8;border-top:4px solid #b08d3c">
<p style="letter-spacing:4px;font-size:12px;color:#b08d3c;margin:0">ZAFIRO INDIO</p>
<h1 style="font-weight:normal;font-size:26px;margin:12px 0">${esc(headline)}</h1>
<p>Namaste ${esc((order.customerName || "").split(" ")[0] || "")},</p>
<p>${esc(bodyMessage)}</p>${trackLink}
${site ? `<p><a href="${esc(site)}/track">Track order</a></p>` : ""}
<p style="font-size:12px;color:#777;margin-top:32px">Handblock bedding, Jaipur.</p></div></body></html>`;

  let sentStatus: "SENT" | "LOGGED_ONLY" | "FAILED" = "LOGGED_ONLY";
  let errorMsg: string | undefined = undefined;

  const host = process.env.SMTP_HOST;
  if (host && order.customerEmail) {
    try {
      const nodemailer = (await import("nodemailer")).default;
      const port = Number(process.env.SMTP_PORT || 587);
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: order.customerEmail,
        subject,
        html,
        text: `${headline}\n\n${bodyMessage}`,
      });
      sentStatus = "SENT";
    } catch (err: any) {
      sentStatus = "FAILED";
      errorMsg = err?.message || "Email dispatch failed";
      console.error("[email] send failed:", errorMsg);
    }
  } else {
    errorMsg = "SMTP not configured; email was not sent.";
  }

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
  await upsertDoc<EmailLogEntry>("email-logs", newLog).catch((e) => console.error("[email] log persist failed", e));

  return { success: sentStatus !== "FAILED", logId };
}
