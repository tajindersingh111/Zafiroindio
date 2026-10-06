import { redirect } from "next/navigation";

/** Checkout is hosted by Shiprocket and started from the cart; keep old /checkout links working. */
export default function CheckoutPage() {
  redirect("/cart");
}
