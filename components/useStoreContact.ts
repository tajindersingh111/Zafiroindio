"use client";

import { useEffect, useState } from "react";
import type { StoreContact } from "@/lib/storefront/contact";

/** Support contact from Admin → Settings; `whatsapp` stays "" until a real number is set. */
export function useStoreContact(): StoreContact | null {
  const [contact, setContact] = useState<StoreContact | null>(null);
  useEffect(() => {
    fetch("/api/store-contact")
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => c && setContact(c))
      .catch(() => {});
  }, []);
  return contact;
}

export function waLink(contact: StoreContact | null, text: string): string {
  return contact?.whatsapp ? `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(text)}` : "";
}
