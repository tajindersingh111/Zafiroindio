import { cached } from "@/lib/cache";
import { readSettings } from "@/lib/db/store";
import type { StoreSettings } from "@/lib/db/types";

export type StoreContact = { email: string; phone: string; whatsapp: string };

const FALLBACK_EMAIL = "hello@zafiroindio.com";

/** The "98765 xxxxx" demo numbers that shipped as defaults; never link customers to them. */
const isPlaceholder = (digits: string) => /^(91)?98765\d{5}$/.test(digits) || /^(\d)\1+$/.test(digits.slice(-10));

/** Support e-mail / phone from Admin → Settings (store phone doubles as the WhatsApp number). */
export function getStoreContact(): Promise<StoreContact> {
  return cached("store-contact", 5 * 60_000, async () => {
    const s = (await readSettings<Partial<StoreSettings>>("settings").catch(() => null)) ?? {};
    const digits = String(s.storePhone || "").replace(/\D/g, "");
    const usable = digits.length >= 10 && !isPlaceholder(digits);
    return {
      email: String(s.storeEmail || "").trim() || FALLBACK_EMAIL,
      phone: usable ? String(s.storePhone).trim() : "",
      whatsapp: usable ? (digits.length === 10 ? `91${digits}` : digits) : "",
    };
  });
}

/** wa.me link with a prefilled message, or "" when no real number is set. */
export function whatsappLink(contact: StoreContact, text: string): string {
  return contact.whatsapp ? `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(text)}` : "";
}
