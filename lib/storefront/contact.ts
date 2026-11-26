import { cached } from "@/lib/cache";
import { readSettings } from "@/lib/db/store";
import type { StoreSettings } from "@/lib/db/types";

export type StoreContact = {
  email: string;
  phone: string;
  whatsapp: string;
  /** Name the business trades and invoices under (Admin → Settings → Registered business name). */
  businessName: string;
  /** GST number, shown on the policy pages and contact page only when set. */
  gstin: string;
  /** One-line postal address, or "" when none is set. */
  address: string;
  /** Support hours, e.g. "Mon–Sat · 10AM–7PM IST". */
  hours: string;
  /** Name and designation of the grievance officer, or "" to show a generic "Customer Care". */
  grievanceOfficer: string;
  /** Social profile links; only https URLs ever get through. */
  social: { instagram: string; facebook: string; youtube: string };
};

const FALLBACK_EMAIL = "info@zafiroindio.com";
const FALLBACK_HOURS = "Mon–Sat · 10AM–7PM IST";
const FALLBACK_ADDRESS = "Jaipur, Rajasthan, India";

/** The "98765 xxxxx" demo numbers that shipped as defaults; never link customers to them. */
const isPlaceholder = (digits: string) => /^(91)?98765\d{5}$/.test(digits) || /^(\d)\1+$/.test(digits.slice(-10));

const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
/** A social link is only ever rendered as an outbound href, so insist on https. */
const httpsUrl = (v: unknown) => {
  const url = clean(v, 300);
  return /^https:\/\/[^\s]+$/i.test(url) ? url : "";
};

type SettingsWithBusiness = Partial<StoreSettings> & {
  businessLegalName?: string;
  gstin?: string;
  supportHours?: string;
  grievanceOfficer?: string;
  socialInstagram?: string;
  socialFacebook?: string;
  socialYoutube?: string;
};

/** Support e-mail / phone / business details from Admin → Settings (store phone doubles as the WhatsApp number). */
export function getStoreContact(): Promise<StoreContact> {
  return cached("store-contact", 5 * 60_000, async () => {
    const s = (await readSettings<SettingsWithBusiness>("settings").catch(() => null)) ?? {};
    const digits = String(s.storePhone || "").replace(/\D/g, "");
    const usable = digits.length >= 10 && !isPlaceholder(digits);

    const a = s.storeAddress;
    const line = [a?.address1, a?.city, [a?.state, a?.postalCode].filter(Boolean).join(" – ")].map((x) => clean(x)).filter(Boolean).join(", ");

    return {
      email: String(s.storeEmail || "").trim() || FALLBACK_EMAIL,
      phone: usable ? String(s.storePhone).trim() : "",
      whatsapp: usable ? (digits.length === 10 ? `91${digits}` : digits) : "",
      businessName: clean(s.businessLegalName) || clean(s.storeName) || "Zafiro Indio",
      gstin: clean(s.gstin, 20).toUpperCase(),
      address: line || FALLBACK_ADDRESS,
      hours: clean(s.supportHours) || FALLBACK_HOURS,
      grievanceOfficer: clean(s.grievanceOfficer, 120),
      social: { instagram: httpsUrl(s.socialInstagram), facebook: httpsUrl(s.socialFacebook), youtube: httpsUrl(s.socialYoutube) },
    };
  });
}

/** wa.me link with a prefilled message, or "" when no real number is set. */
export function whatsappLink(contact: StoreContact, text: string): string {
  return contact.whatsapp ? `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(text)}` : "";
}
