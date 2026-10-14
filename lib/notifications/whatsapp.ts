import type { Order } from "@/lib/db/types";
import { readSettings, upsertDoc } from "@/lib/db/store";

/** WhatsApp fields saved from Admin → Settings. */
type WhatsAppSettings = {
  storeName?: string;
  whatsappProvider?: string;
  whatsappToken?: string;
  /** Meta: phone number id · Twilio: sender number · Green API: idInstance */
  whatsappPhoneId?: string;
  /** Twilio only */
  whatsappAccountSid?: string;
  /** Meta only: approved template; without one Meta only delivers inside a 24h customer-service window. */
  whatsappTemplateName?: string;
  whatsappTemplateLang?: string;
  whatsappOrderConfirm?: boolean;
};

export interface WhatsAppLogEntry {
  id: string;
  event: "ORDER_CONFIRMED" | "TEST";
  provider: string;
  to: string;
  orderId?: string;
  orderNumber?: string;
  status: "SENT" | "SKIPPED" | "FAILED";
  error?: string;
  sentAt: string;
}

type SendResult = { ok: true } | { ok: false; error: string };
type Message = { text: string; templateParams: string[] };

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
const TIMEOUT_MS = 10_000;

/** Indian numbers in any common format ("098765 43210", "+91-98765-43210") → "919876543210". */
export function normalizeWhatsAppNumber(raw: string | undefined): string | null {
  let digits = (raw ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function orderMessage(order: Order, storeName: string): Message {
  const firstName = order.customerName?.trim().split(/\s+/)[0] || "there";
  const items = order.items.map((i) => `• ${i.name} × ${i.quantity}`).join("\n");
  const payment = order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentStatus === "paid" ? "Paid online" : "Payment pending";
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://zafiroindio.com";
  const text = [
    `Hi ${firstName}! 🙏`,
    `Thank you for shopping with ${storeName}. Your order *${order.orderNumber}* is confirmed.`,
    "",
    items,
    "",
    `Total: *${rupees(order.total)}* (${payment})`,
    "",
    `We'll message you the tracking details as soon as it ships. Track anytime: ${site}/track?q=${encodeURIComponent(order.orderNumber)}`,
  ].join("\n");
  return { text, templateParams: [firstName, order.orderNumber, rupees(order.total)] };
}

async function postJson(url: string, init: RequestInit): Promise<SendResult> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.ok) return { ok: true };
    const body = await res.text().catch(() => "");
    return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 300)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function send(s: WhatsAppSettings, to: string, msg: Message): Promise<SendResult> {
  const token = s.whatsappToken?.trim();
  const id = s.whatsappPhoneId?.trim();
  if (!token || !id) return { ok: false, error: "WhatsApp is not configured (token / phone id missing)." };

  switch (s.whatsappProvider || "meta") {
    case "meta": {
      const template = s.whatsappTemplateName?.trim();
      const payload = template
        ? {
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: template,
              language: { code: s.whatsappTemplateLang?.trim() || "en" },
              components: [{ type: "body", parameters: msg.templateParams.map((text) => ({ type: "text", text })) }],
            },
          }
        : { messaging_product: "whatsapp", to, type: "text", text: { body: msg.text, preview_url: false } };
      return postJson(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(id)}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    case "twilio": {
      const sid = s.whatsappAccountSid?.trim();
      const from = normalizeWhatsAppNumber(id);
      if (!sid || !from) return { ok: false, error: "Twilio needs the Account SID and a sender number." };
      return postJson(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ From: `whatsapp:+${from}`, To: `whatsapp:+${to}`, Body: msg.text }).toString(),
      });
    }
    case "greenapi":
      return postJson(`https://api.green-api.com/waInstance${encodeURIComponent(id)}/sendMessage/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: `${to}@c.us`, message: msg.text }),
      });
    default:
      return { ok: false, error: `Unknown WhatsApp provider "${s.whatsappProvider}".` };
  }
}

async function log(entry: Omit<WhatsAppLogEntry, "id" | "sentAt">) {
  const sentAt = new Date().toISOString();
  const id = `wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await upsertDoc<WhatsAppLogEntry>("whatsapp-logs", { id, sentAt, ...entry }).catch((e) => console.error("[whatsapp] log persist failed", e));
}

/**
 * Sends the customer an order-confirmation WhatsApp, if it is switched on in Admin → Settings.
 * Never throws: a WhatsApp failure must not affect the order.
 */
export async function sendOrderConfirmationWhatsApp(order: Order): Promise<void> {
  const s = (await readSettings<WhatsAppSettings>("settings").catch(() => null)) ?? {};
  if (s.whatsappOrderConfirm === false || !s.whatsappToken?.trim() || !s.whatsappPhoneId?.trim()) return;

  const provider = s.whatsappProvider || "meta";
  const to = normalizeWhatsAppNumber(order.customerPhone || order.shipping?.phone || order.billing?.phone);
  const base = { event: "ORDER_CONFIRMED" as const, provider, orderId: order.id, orderNumber: order.orderNumber };
  if (!to) return log({ ...base, to: order.customerPhone ?? "", status: "SKIPPED", error: "No valid phone number on the order." });

  const result = await send(s, to, orderMessage(order, s.storeName?.trim() || "Zafiro Indio"));
  if (!result.ok) console.error(`[whatsapp] order ${order.orderNumber} failed:`, result.error);
  await log({ ...base, to, status: result.ok ? "SENT" : "FAILED", error: result.ok ? undefined : result.error });
}

/** Admin → Settings "Send test message": uses the saved settings, reports the provider's answer. */
export async function sendTestWhatsApp(rawTo: string): Promise<SendResult> {
  const s = (await readSettings<WhatsAppSettings>("settings")) ?? {};
  const to = normalizeWhatsAppNumber(rawTo);
  if (!to) return { ok: false, error: "Enter a valid mobile number." };
  const storeName = s.storeName?.trim() || "Zafiro Indio";
  const result = await send(s, to, {
    text: `This is a test message from ${storeName}. WhatsApp order notifications are working ✅`,
    templateParams: ["Test", "TEST-0001", rupees(0)],
  });
  await log({ event: "TEST", provider: s.whatsappProvider || "meta", to, status: result.ok ? "SENT" : "FAILED", error: result.ok ? undefined : result.error });
  return result;
}
