import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Secure checkout — pay by UPI, card, net banking or Cash on Delivery.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  // CheckoutClient reads ?mode=buy-now, so it needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <CheckoutClient />
    </Suspense>
  );
}
