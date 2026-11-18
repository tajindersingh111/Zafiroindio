import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import PolicyPage, { type PolicySection } from "@/components/site/PolicyPage";
import { getStoreContact } from "@/lib/storefront/contact";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What personal information Zafiro Indio collects, why, who it is shared with, and the choices and rights you have over it.",
  alternates: { canonical: "/privacy-policy" },
};

// Contact details come from Admin → Settings; refresh them every few minutes.
export const revalidate = 300;

export default async function PrivacyPolicyPage() {
  const c = await getStoreContact();

  const sections: PolicySection[] = [
    {
      id: "who-we-are",
      title: "Who we are",
      body: (
        <>
          <p>
            This Privacy Policy explains how <strong>{c.businessName}</strong> (&ldquo;Zafiro Indio&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses and protects your personal
            information when you browse our website, sign in, place an order or contact us. We handle your data in line with the Information
            Technology Act, 2000 and the Digital Personal Data Protection Act, 2023.
          </p>
          <p>
            You can reach us at <a href={`mailto:${c.email}`}>{c.email}</a> or by post at {c.address}.
          </p>
        </>
      ),
    },
    {
      id: "what-we-collect",
      title: "Information we collect",
      body: (
        <>
          <ul>
            <li>
              <strong>Sign-in details.</strong> The e-mail address you use to sign in, and the one-time codes we send you. We keep only a
              scrambled form of each code, and it expires within minutes.
            </li>
            <li>
              <strong>Order details.</strong> Your name, delivery and billing address, phone number, e-mail address, the items you ordered, the order value
              and any coupon you used.
            </li>
            <li>
              <strong>Payment information.</strong> Online payments are processed by our payment gateway, Razorpay. We receive the payment status and a
              reference number. We <strong>do not see or store</strong> your card number, CVV, UPI PIN or net-banking credentials.
            </li>
            <li>
              <strong>Return and exchange requests.</strong> The reason for the request and the unboxing video or photos you upload.
            </li>
            <li>
              <strong>Messages and sign-ups.</strong> Anything you send us, and the name, e-mail address or phone number you give when you subscribe to our
              newsletter or claim an offer.
            </li>
            <li>
              <strong>Technical information.</strong> Basic details such as your IP address and browser type, which our servers log to keep the site secure and
              to detect fraud and abuse.
            </li>
          </ul>
          <p>
            Your cart, wishlist, recently viewed products and the pages you spend time on are kept <strong>in your own browser</strong> so the site can remember
            them and suggest products. They are not sent to our servers.
          </p>
        </>
      ),
    },
    {
      id: "how-we-use",
      title: "How we use your information",
      body: (
        <ul>
          <li>To process, deliver and support your orders, including payments, invoices, returns, exchanges and refunds.</li>
          <li>To sign you in and keep your account secure.</li>
          <li>To send order confirmations, shipping and delivery updates by e-mail and WhatsApp.</li>
          <li>To answer your questions and resolve complaints.</li>
          <li>To prevent fraud, abuse and security incidents.</li>
          <li>To send newsletters or offers, only if you subscribed. You can unsubscribe at any time.</li>
          <li>To meet legal, tax and accounting obligations.</li>
        </ul>
      ),
    },
    {
      id: "consent",
      title: "Consent and lawful use",
      body: (
        <p>
          We use your personal data with your consent, or for purposes the law allows, such as delivering an order you placed. Where we rely on consent, you can
          withdraw it at any time by contacting us; this does not affect what we did before you withdrew it, and we may still need to keep certain records that
          the law requires.
        </p>
      ),
    },
    {
      id: "sharing",
      title: "Who we share it with",
      body: (
        <>
          <p>We share information only with the service providers we need to run the store, and only what each one needs to do its job:</p>
          <ul>
            <li>
              <strong>Payment gateway</strong> (Razorpay) to take and refund payments.
            </li>
            <li>
              <strong>Courier and logistics partners</strong>, including our shipping platform ShipMozo, who receive your name, phone number, address and the
              contents of the parcel so they can deliver it.
            </li>
            <li>
              <strong>E-mail and messaging providers</strong>, who deliver your sign-in codes and order updates (order updates may also be sent over the WhatsApp Business Platform).
            </li>
            <li>
              <strong>Hosting and infrastructure providers</strong> that store our data and keep the site running.
            </li>
            <li>
              <strong>Authorities</strong>, when we are required to by law or to protect our rights and the safety of others.
            </li>
          </ul>
          <p>
            <strong>We do not sell your personal information.</strong> If the business is ever sold or reorganised, your information may transfer to the new
            owner, who must honour this policy.
          </p>
        </>
      ),
    },
    {
      id: "cookies",
      title: "Cookies and local storage",
      body: (
        <>
          <ul>
            <li>
              <strong>Sign-in cookie.</strong> When you sign in we set a secure cookie that keeps you signed in for up to 60 days. Signing out removes it.
            </li>
            <li>
              <strong>Browser storage.</strong> Your cart, wishlist, recently viewed products and pop-up preferences are stored in your browser. Clearing your
              browser data removes them.
            </li>
            <li>
              <strong>Payment window.</strong> When you pay online, Razorpay&rsquo;s checkout loads and may set its own cookies, governed by Razorpay&rsquo;s own
              privacy policy.
            </li>
          </ul>
          <p>We do not use advertising or cross-site tracking cookies on this website.</p>
        </>
      ),
    },
    {
      id: "retention",
      title: "How long we keep it",
      body: (
        <p>
          We keep personal information for as long as we need it for the purpose it was collected, and for as long as tax, accounting and other laws require us
          to keep order and invoice records. Sign-in codes expire within minutes. When information is no longer needed, we delete it or make it anonymous.
        </p>
      ),
    },
    {
      id: "security",
      title: "How we protect it",
      body: (
        <p>
          The site is served over an encrypted connection, access to customer data is limited to the people who need it, and payments go through a PCI&nbsp;DSS-compliant
          gateway. No system is completely secure, so we cannot guarantee absolute security, but we work to keep your information safe and will tell you and the
          authorities about a breach where the law requires.
        </p>
      ),
    },
    {
      id: "your-rights",
      title: "Your rights",
      body: (
        <>
          <p>Under the Digital Personal Data Protection Act, 2023 you may:</p>
          <ul>
            <li>ask for a summary of the personal data we hold about you and how it is used;</li>
            <li>ask us to correct or complete inaccurate data;</li>
            <li>ask us to delete your data, subject to records we must keep by law;</li>
            <li>withdraw your consent to any use that depends on it, including marketing messages;</li>
            <li>nominate someone to exercise these rights on your behalf if you cannot; and</li>
            <li>make a complaint, as described below.</li>
          </ul>
          <p>
            Write to <a href={`mailto:${c.email}`}>{c.email}</a> from the e-mail address or phone number on your account so we can verify it is you. We reply
            promptly and in any case within 30 days.
          </p>
        </>
      ),
    },
    {
      id: "children",
      title: "Children",
      body: <p>Our website is meant for adults. We do not knowingly collect personal data from anyone under 18. If you believe a child has given us information, contact us and we will delete it.</p>,
    },
    {
      id: "changes",
      title: "Changes to this policy",
      body: <p>We may update this policy as our services or the law change. The &ldquo;last updated&rdquo; date at the top shows the latest version, and for significant changes we will say so on the site.</p>,
    },
    {
      id: "grievance",
      title: "Questions and complaints",
      body: (
        <>
          <p>
            For any privacy question or complaint, contact our grievance officer at <a href={`mailto:${c.email}`}>{c.email}</a>. We acknowledge complaints within
            48 hours and aim to resolve them within one month. See our <Link href="/contact">contact page</Link> for the full details.
          </p>
        </>
      ),
    },
  ];

  return (
    <PolicyPage
      current="/privacy-policy"
      eyebrow="Your privacy"
      title="Privacy Policy"
      updated="7 November 2026"
      intro={<p>Plain answers to what we collect, why we collect it, who sees it, and what you can do about it. We collect only what we need to deliver your order and look after you.</p>}
      highlights={[
        { icon: <LockKeyhole size={20} strokeWidth={1.6} />, title: "Payments stay with Razorpay", text: "We never see or store your card, CVV, UPI PIN or net-banking details." },
        { icon: <ShieldCheck size={20} strokeWidth={1.6} />, title: "We do not sell your data", text: "It is shared only with the partners that deliver, bill and message you for your order." },
        { icon: <UserCheck size={20} strokeWidth={1.6} />, title: "You are in control", text: "Ask to see, correct or delete your data, or stop marketing messages, any time." },
      ]}
      sections={sections}
    />
  );
}
