import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Handshake, Scale } from "lucide-react";
import PolicyPage, { type PolicySection } from "@/components/site/PolicyPage";
import { getStoreContact } from "@/lib/storefront/contact";
import { RETURN_WINDOW_DAYS } from "@/lib/returns/policy";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that apply when you browse, order from or use zafiroindio.com: orders, pricing, payments, delivery, returns and more.",
  alternates: { canonical: "/terms" },
};

export const revalidate = 300;

export default async function TermsPage() {
  const c = await getStoreContact();

  const sections: PolicySection[] = [
    {
      id: "acceptance",
      title: "About these terms",
      body: (
        <>
          <p>
            These Terms & Conditions govern your use of this website and any purchase you make from <strong>{c.businessName}</strong> (&ldquo;Zafiro Indio&rdquo;,
            &ldquo;we&rdquo;, &ldquo;us&rdquo;). By browsing the site, creating an account or placing an order, you agree to them together with our{" "}
            <Link href="/privacy-policy">Privacy Policy</Link>, <Link href="/shipping-policy">Shipping Policy</Link> and{" "}
            <Link href="/return-policy">Return, Exchange & Refund Policy</Link>. If you do not agree, please do not use the site.
          </p>
        </>
      ),
    },
    {
      id: "eligibility",
      title: "Who can order",
      body: (
        <p>
          You must be at least 18 years old, or use the site under the supervision of a parent or guardian, and be able to enter a binding contract under Indian
          law. Orders are for personal use. If you want to buy in quantity, please use our <Link href="/bulk-order">bulk order enquiry</Link>.
        </p>
      ),
    },
    {
      id: "account",
      title: "Your account",
      body: (
        <>
          <p>
            You sign in with a one-time code sent to your e-mail address. You are responsible for keeping that inbox secure and for
            everything done through your account. Never share a code with anyone; we will never ask you for one. Tell us straight away if you think someone else has
            used your account.
          </p>
          <p>You can check out as a guest without an account, but then you will not see your order history on the site.</p>
        </>
      ),
    },
    {
      id: "products",
      title: "Our products",
      body: (
        <>
          <p>
            We take care to describe and photograph every product accurately. Screens differ, so colours may look slightly different in person. Our fabrics are
            <strong> hand block printed</strong>: small variations in colour, alignment and print are part of the process and are not defects. See our{" "}
            <Link href="/return-policy">return policy</Link> for what counts as damage.
          </p>
        </>
      ),
    },
    {
      id: "pricing",
      title: "Prices and availability",
      body: (
        <ul>
          <li>All prices are in Indian Rupees (₹).</li>
          <li>The total you pay, including any shipping charge, Cash on Delivery fee and discount, is shown at checkout <strong>before</strong> you pay.</li>
          <li>Products are subject to availability. If an item runs out, or a price or description was clearly wrong, we may cancel that order and refund anything you paid in full.</li>
          <li>Prices and offers can change without notice, but a change never affects an order that has already been confirmed.</li>
        </ul>
      ),
    },
    {
      id: "orders",
      title: "Placing and confirming an order",
      body: (
        <ul>
          <li>Your order is a request to buy. It is confirmed when you receive our confirmation by e-mail or WhatsApp.</li>
          <li>We may decline or cancel an order for stock, pricing or payment reasons, or if we suspect fraud or misuse. If you have already paid, you will be refunded in full.</li>
          <li>Please check your delivery address and phone number carefully. We cannot always change them once a parcel has shipped.</li>
        </ul>
      ),
    },
    {
      id: "payments",
      title: "Payments and coupons",
      body: (
        <ul>
          <li>
            <strong>Pay online</strong> by UPI, card, net banking or wallet through Razorpay. Your payment details go directly to Razorpay and are never stored by us.
          </li>
          <li>
            <strong>Cash on Delivery</strong> is available on eligible orders. A handling fee may apply and is shown at checkout. Please keep the exact amount ready.
          </li>
          <li>Coupons are valid only for the period, minimum spend and products stated with them, and cannot be exchanged for cash.</li>
        </ul>
      ),
    },
    {
      id: "delivery",
      title: "Delivery",
      body: (
        <p>
          We ship across India through courier partners. Delivery times, charges and what happens if a parcel cannot be delivered are set out in our{" "}
          <Link href="/shipping-policy">Shipping & Delivery Policy</Link>. Delivery dates are estimates, not guarantees.
        </p>
      ),
    },
    {
      id: "returns",
      title: "Returns, exchanges, cancellations and refunds",
      body: (
        <p>
          You can cancel an order until it ships, and request a return (damaged products) or an exchange within {RETURN_WINDOW_DAYS} days of delivery. An unboxing video is
          required for every return or exchange request. The full rules are in our <Link href="/return-policy">Return, Exchange & Refund Policy</Link>, which forms part of
          these terms.
        </p>
      ),
    },
    {
      id: "intellectual-property",
      title: "Our content",
      body: (
        <p>
          The Zafiro Indio name, logo, designs, photographs, text and everything else on this site belong to us or are used with permission. You may view and share
          pages for personal use, but you may not copy, reproduce, scrape or sell any of it without our written permission.
        </p>
      ),
    },
    {
      id: "acceptable-use",
      title: "Using the site properly",
      body: (
        <ul>
          <li>Do not use the site unlawfully, or in a way that harms, overloads or interferes with it.</li>
          <li>Do not try to access accounts, systems or data that are not yours, or use bots or scripts to place orders, request codes or scrape content.</li>
          <li>Do not post reviews or other content that is false, abusive, infringing or unlawful. Reviews are moderated, and by submitting one you let us display it on the site.</li>
        </ul>
      ),
    },
    {
      id: "liability",
      title: "Limits on our responsibility",
      body: (
        <>
          <p>
            We work hard to keep the site accurate and available, but it is provided &ldquo;as is&rdquo;, and it may occasionally be unavailable or contain errors. To the
            fullest extent the law allows, we are not liable for indirect or consequential losses, and our total liability for any claim relating to an order is limited
            to the amount you paid for that order.
          </p>
          <p>Nothing in these terms limits any right you have as a consumer under Indian law that cannot be limited by agreement.</p>
        </>
      ),
    },
    {
      id: "law",
      title: "Governing law",
      body: (
        <p>
          These terms are governed by the laws of India. Subject to your rights as a consumer, the courts at Jaipur, Rajasthan have jurisdiction over any dispute arising
          from them. We would always rather solve a problem directly with you first, so please <Link href="/contact">contact us</Link>.
        </p>
      ),
    },
    {
      id: "changes",
      title: "Changes to these terms",
      body: <p>We may update these terms from time to time. The &ldquo;last updated&rdquo; date shows the current version, and the version in force when you place an order is the one that applies to that order.</p>,
    },
    {
      id: "contact",
      title: "Contact and grievances",
      body: (
        <p>
          Questions, complaints or feedback: <a href={`mailto:${c.email}`}>{c.email}</a>
          {c.phone && <> or {c.phone}</>}. We acknowledge complaints within 48 hours and aim to resolve them within one month. Full details are on our{" "}
          <Link href="/contact">contact page</Link>.
        </p>
      ),
    },
  ];

  return (
    <PolicyPage
      current="/terms"
      eyebrow="The small print"
      title="Terms & Conditions"
      updated="7 November 2026"
      intro={<p>The rules for shopping with us, in plain language. They are here to protect you and us, and to keep every order smooth.</p>}
      highlights={[
        { icon: <BadgeCheck size={20} strokeWidth={1.6} />, title: "Clear prices", text: "The full total, including shipping and any fee, is shown before you pay." },
        { icon: <Handshake size={20} strokeWidth={1.6} />, title: "Fair cancellations", text: "If we cancel an order, you get back everything you paid." },
        { icon: <Scale size={20} strokeWidth={1.6} />, title: "Your consumer rights stay", text: "Nothing here takes away rights Indian law gives you." },
      ]}
      sections={sections}
    />
  );
}
