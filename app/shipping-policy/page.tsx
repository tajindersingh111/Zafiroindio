import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, PackageCheck, Truck } from "lucide-react";
import PolicyPage, { type PolicySection } from "@/components/site/PolicyPage";
import { getStoreContact } from "@/lib/storefront/contact";
import { getShippingTerms, rupees } from "@/lib/storefront/shipping-terms";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy",
  description: "Where Zafiro Indio delivers, shipping charges, free-shipping value, delivery times, tracking and what happens if a parcel cannot be delivered.",
  alternates: { canonical: "/shipping-policy" },
};

// The charges below come from Admin → Settings, so refresh them every few minutes.
export const revalidate = 300;

export default async function ShippingPolicyPage() {
  const [c, t] = await Promise.all([getStoreContact(), getShippingTerms()]);

  const sections: PolicySection[] = [
    {
      id: "where",
      title: "Where we deliver",
      body: (
        <>
          <p>
            We deliver across India through trusted courier partners. We do not ship outside India at the moment. Enter your PIN code on any product page to check that
            we can deliver there and whether Cash on Delivery is available. A few remote PIN codes may not be serviceable by our couriers.
          </p>
        </>
      ),
    },
    {
      id: "charges",
      title: "Shipping charges",
      body: (
        <>
          <div className="pol-table-wrap">
            <table className="pol-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Shipping</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{rupees(t.freeShippingMinOrder)} and above</td>
                  <td>
                    <strong>Free</strong>
                  </td>
                </tr>
                <tr>
                  <td>Below {rupees(t.freeShippingMinOrder)}</td>
                  <td>{rupees(t.shippingFee)} flat</td>
                </tr>
                <tr>
                  <td>Cash on Delivery</td>
                  <td>Plus a {rupees(t.codFee)} handling fee</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Some products ship free or carry their own Cash on Delivery charge. Whatever applies to your order, <strong>the exact amount is shown at checkout before you pay</strong>,
            and it never changes afterwards.
          </p>
        </>
      ),
    },
    {
      id: "time",
      title: "Delivery time",
      body: (
        <>
          <p>
            Most orders reach you within <strong>3–7 business days</strong> of being placed. Remote and hard-to-reach PIN codes can take longer, and weather, festivals,
            strikes or courier delays are outside our control, so please treat delivery dates as estimates rather than guarantees.
          </p>
        </>
      ),
    },
    {
      id: "processing",
      title: "Order confirmation and dispatch",
      body: (
        <ul>
          <li>You receive a confirmation by e-mail and WhatsApp as soon as your order is placed.</li>
          <li>We prepare each order and hand it to the courier as quickly as we can. Orders that need a manual check, for example after a stock issue, may take a little longer, and we will tell you.</li>
          <li>When your parcel ships, we send you the courier name and tracking number.</li>
        </ul>
      ),
    },
    {
      id: "tracking",
      title: "Tracking your order",
      body: (
        <p>
          Follow your parcel any time on our <Link href="/track">Track Order</Link> page using your order number and the phone number or e-mail you ordered with. If you are
          signed in, your orders and their live status are also in <Link href="/account/orders">My Orders</Link>.
        </p>
      ),
    },
    {
      id: "delivery-attempts",
      title: "If a parcel cannot be delivered",
      body: (
        <>
          <p>
            Couriers usually make more than one delivery attempt and may call you. Please keep your phone reachable, and for Cash on Delivery orders keep the exact amount ready.
          </p>
          <ul>
            <li>If delivery fails and the parcel returns to us, a <strong>prepaid</strong> order is refunded to your original payment method.</li>
            <li>A <strong>Cash on Delivery</strong> order that is refused or cannot be delivered is cancelled, and nothing is charged.</li>
            <li>If the address or phone number was wrong, contact us at once. Once a parcel has shipped, we may not be able to change it.</li>
          </ul>
        </>
      ),
    },
    {
      id: "damage",
      title: "Damaged or wrong parcels",
      body: (
        <p>
          Please record a continuous video while you open every parcel, starting with the sealed packet. It is required for any return or exchange, and it is the quickest way
          for us to put things right if something arrives damaged. The full steps are in our <Link href="/return-policy">Return, Exchange & Refund Policy</Link>.
        </p>
      ),
    },
    {
      id: "contact",
      title: "Need help with a delivery?",
      body: (
        <p>
          Write to <a href={`mailto:${c.email}`}>{c.email}</a>
          {c.phone && <> or call {c.phone}</>} with your order number, and we will chase it with the courier for you.
        </p>
      ),
    },
  ];

  return (
    <PolicyPage
      current="/shipping-policy"
      eyebrow="Delivery"
      title="Shipping & Delivery Policy"
      updated="7 November 2026"
      intro={<p>How your order travels from our floor to your door: where we deliver, what it costs, how long it takes, and what happens if something goes wrong.</p>}
      highlights={[
        { icon: <Truck size={20} strokeWidth={1.6} />, title: `Free above ${rupees(t.freeShippingMinOrder)}`, text: "Orders at or above this value ship free anywhere we deliver in India." },
        { icon: <PackageCheck size={20} strokeWidth={1.6} />, title: "3–7 business days", text: "Typical delivery time. Remote PIN codes can take longer." },
        { icon: <Banknote size={20} strokeWidth={1.6} />, title: "Cash on Delivery", text: "Available on eligible orders and PIN codes, with a small handling fee." },
      ]}
      sections={sections}
    />
  );
}
