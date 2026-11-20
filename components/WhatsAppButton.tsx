"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useStoreContact, waLink } from "@/components/useStoreContact";

const BUBBLE_KEY = "zi-wa-bubble-closed";

/**
 * Floating WhatsApp chat button, bottom right on every storefront page, with a short greeting bubble
 * that appears a few seconds in. The chat opens with a message that names the page the shopper was on,
 * so support knows which product they mean. Hidden in the admin and at checkout (it would sit over the
 * payment buttons), and until a real store number is set in Admin → Settings.
 */
export default function WhatsAppButton() {
  const contact = useStoreContact();
  const pathname = usePathname() || "/";
  const [bubble, setBubble] = useState(false);

  useEffect(() => {
    let closed = false;
    try {
      closed = sessionStorage.getItem(BUBBLE_KEY) === "1";
    } catch {}
    if (closed) return;
    const t = setTimeout(() => setBubble(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!contact?.whatsapp || pathname.startsWith("/admin") || pathname.startsWith("/checkout")) return null;

  const closeBubble = () => {
    setBubble(false);
    try {
      sessionStorage.setItem(BUBBLE_KEY, "1");
    } catch {}
  };

  const onProduct = pathname.startsWith("/products/");
  const pageUrl = typeof window !== "undefined" ? window.location.href.split("#")[0] : "";
  const message = onProduct
    ? `Hi Zafiro Indio, I have a question about this product: ${pageUrl}`
    : "Hi Zafiro Indio, I need some help.";
  const href = waLink(contact, message);

  return (
    <div className="wa-float">
      {bubble && (
        <div className="wa-bubble" role="status">
          <button type="button" className="wa-bubble-x" aria-label="Close" onClick={closeBubble}>
            ×
          </button>
          <p className="wa-bubble-title">Hi there 👋</p>
          <p className="wa-bubble-text">Need help choosing a size or design? Chat with us on WhatsApp.</p>
          <a href={href} target="_blank" rel="noopener noreferrer" className="wa-bubble-cta" onClick={closeBubble}>
            Start chat
          </a>
        </div>
      )}
      <a href={href} target="_blank" rel="noopener noreferrer" className="wa-btn" aria-label="Chat with us on WhatsApp" onClick={closeBubble}>
        <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
          <path
            fill="#fff"
            d="M16.004 3C9.38 3 3.99 8.39 3.99 15.014c0 2.12.554 4.19 1.607 6.015L3.9 27.1l6.24-1.637a12 12 0 0 0 5.86 1.513h.005c6.622 0 12.013-5.39 12.013-12.014C28.018 8.39 22.627 3 16.004 3Zm0 21.95h-.004a9.95 9.95 0 0 1-5.07-1.39l-.364-.216-3.703.971.99-3.61-.237-.37a9.93 9.93 0 0 1-1.524-5.32c0-5.505 4.48-9.985 9.917-9.985 5.507 0 9.987 4.48 9.987 9.986 0 5.506-4.48 9.935-9.992 9.935Zm5.47-7.43c-.3-.15-1.773-.875-2.048-.975-.274-.1-.474-.15-.674.15-.2.3-.774.975-.949 1.175-.175.2-.35.225-.65.075-.3-.15-1.266-.467-2.411-1.488-.891-.795-1.493-1.777-1.668-2.077-.175-.3-.019-.462.131-.611.135-.134.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.674-1.625-.924-2.225-.243-.584-.49-.505-.674-.514l-.574-.01c-.2 0-.525.075-.8.375-.274.3-1.048 1.025-1.048 2.5s1.073 2.9 1.223 3.1c.15.2 2.112 3.225 5.117 4.522.715.309 1.273.493 1.708.631.718.228 1.371.196 1.887.119.576-.086 1.773-.725 2.023-1.425.25-.7.25-1.3.175-1.425-.075-.125-.275-.2-.575-.35Z"
          />
        </svg>
      </a>
    </div>
  );
}
