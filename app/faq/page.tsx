import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage, { type PolicySection } from "@/components/site/PolicyPage";
import { getStoreContact } from "@/lib/storefront/contact";
import { getShippingTerms, rupees } from "@/lib/storefront/shipping-terms";
import { RETURN_WINDOW_DAYS } from "@/lib/returns/policy";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Answers to common questions about ordering, payment, shipping, returns, exchanges and your account at Zafiro Indio.",
  alternates: { canonical: "/faq" },
};

export const revalidate = 300;

type QA = { q: string; a: string; link?: { href: string; label: string } };
type Group = { id: string; title: string; items: QA[] };

export default async function FaqPage() {
  const [c, t] = await Promise.all([getStoreContact(), getShippingTerms()]);

  const groups: Group[] = [
    {
      id: "orders",
      title: "Ordering and payment",
      items: [
        {
          q: "How do I place an order?",
          a: "Add what you like to your cart, go to checkout, enter your delivery address, choose how you would like to pay and place the order. You can check out as a guest or signed in.",
        },
        {
          q: "Which payment methods do you accept?",
          a: "You can pay online by UPI, card, net banking or wallet through Razorpay. Cash on Delivery is available on eligible orders and PIN codes.",
        },
        {
          q: "Is it safe to pay on your website?",
          a: "Yes. Online payments are handled by Razorpay, a PCI DSS-compliant payment gateway. Your card, UPI or net-banking details go straight to them, and we never see or store them.",
        },
        {
          q: "Do I need an account?",
          a: "No, you can check out as a guest. If you sign in, you can see all your orders in one place and your address is filled in for you. There is no password: we send a one-time code to your mobile number on WhatsApp, or to your e-mail.",
          link: { href: "/login", label: "Sign in" },
        },
        {
          q: "How do I use a coupon?",
          a: "Enter your coupon code at checkout and tap Apply. Coupons are valid for the period, minimum spend and products stated with them. If a code does not work, the checkout tells you why.",
        },
        {
          q: "Can I cancel or change my order?",
          a: "You can cancel from My Orders any time before the order ships, and any amount you paid is refunded. To change an address or phone number, contact us as soon as possible. Once a parcel has shipped we may not be able to change it.",
          link: { href: "/account", label: "My Orders" },
        },
      ],
    },
    {
      id: "shipping",
      title: "Shipping and delivery",
      items: [
        {
          q: "How long does delivery take?",
          a: "Most orders reach you within 3–7 business days of being placed. Remote PIN codes can take longer. Delivery dates are estimates.",
        },
        {
          q: "How much is shipping?",
          a: `Shipping is free on orders of ${rupees(t.freeShippingMinOrder)} and above, and ${rupees(t.shippingFee)} below that. Cash on Delivery adds a ${rupees(t.codFee)} handling fee. The exact amount is always shown at checkout before you pay.`,
          link: { href: "/shipping-policy", label: "Shipping policy" },
        },
        {
          q: "Do you deliver all over India?",
          a: "Yes. Enter your PIN code on any product page to check delivery and Cash on Delivery for your area. We do not ship outside India at the moment.",
        },
        {
          q: "How do I track my order?",
          a: "We send you the courier and tracking number when your parcel ships. You can also follow it any time on the Track Order page with your order number and the phone or e-mail you ordered with.",
          link: { href: "/track", label: "Track my order" },
        },
      ],
    },
    {
      id: "returns",
      title: "Returns, exchanges and refunds",
      items: [
        {
          q: "What is your return policy?",
          a: `Returns are accepted for damaged products only. Every other case, such as a different size, colour or design, is exchange only. Raise a request within ${RETURN_WINDOW_DAYS} days of delivery.`,
          link: { href: "/return-policy", label: "Full return policy" },
        },
        {
          q: "Why do you need an unboxing video?",
          a: "A continuous video of you opening the sealed parcel is the clearest way to show what arrived and in what condition. It is required for every return or exchange request, so please start recording before you cut the tape.",
        },
        {
          q: "When will I get my refund?",
          a: "Online refunds go back to the payment method you used and usually arrive within 5–7 business days of the refund being issued, depending on your bank. For Cash on Delivery orders we will ask for a UPI ID or bank account to send it to.",
        },
      ],
    },
    {
      id: "products",
      title: "Our products",
      items: [
        {
          q: "What does hand block printed mean?",
          a: "Each design is printed by hand using carved wooden blocks, one impression at a time. That is why small variations in colour, alignment and print are normal, and a sign of handwork rather than a defect.",
        },
        {
          q: "Do you take bulk or wholesale orders?",
          a: "Yes. Send us an enquiry and our team will get back to you.",
          link: { href: "/bulk-order", label: "Bulk order enquiry" },
        },
      ],
    },
    {
      id: "privacy",
      title: "Your data",
      items: [
        {
          q: "How do I see or delete my data?",
          a: `Write to ${c.email} from the e-mail address or phone number on your account and we will help. See our Privacy Policy for how your information is used.`,
          link: { href: "/privacy-policy", label: "Privacy policy" },
        },
      ],
    },
  ];

  const sections: PolicySection[] = groups.map((g) => ({
    id: g.id,
    title: g.title,
    body: (
      <div className="pol-faq">
        {g.items.map((item) => (
          <details key={item.q} className="pol-faq-item">
            <summary>{item.q}</summary>
            <div className="pol-faq-answer">
              <p>{item.a}</p>
              {item.link && (
                <p>
                  <Link href={item.link.href}>{item.link.label} →</Link>
                </p>
              )}
            </div>
          </details>
        ))}
      </div>
    ),
  }));

  // Plain-text version of the same answers for search engines (FAQ rich results).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((g) => g.items).map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PolicyPage
        current="/faq"
        eyebrow="Help centre"
        title="Frequently Asked Questions"
        updated="7 November 2026"
        intro={<p>Quick answers to the things people ask us most. Cannot find yours? Write to us and we will help.</p>}
        sections={sections}
      />
    </>
  );
}
