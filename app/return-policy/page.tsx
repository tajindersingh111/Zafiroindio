import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, PackageX, Repeat, Video } from "lucide-react";
import PolicyPage, { type PolicySection } from "@/components/site/PolicyPage";
import { RETURN_WINDOW_DAYS } from "@/lib/returns/policy";
import { getStoreContact, whatsappLink } from "@/lib/storefront/contact";

export const metadata: Metadata = {
  title: "Return, Exchange & Refund Policy",
  description: "Damaged products can be returned; everything else is exchange only. An unboxing video is required for every return or exchange request. How cancellations and refunds work.",
  alternates: { canonical: "/return-policy" },
};

// Contact details come from Admin → Settings; refresh them every few minutes.
export const revalidate = 300;

export default async function ReturnPolicyPage() {
  const contact = await getStoreContact();
  const wa = whatsappLink(contact, "Hi Zafiro Indio, I have a question about a return / exchange.");

  const sections: PolicySection[] = [
    {
      id: "when",
      title: "When you can raise a request",
      body: (
        <ul>
          <li>
            Raise a return or exchange request within <strong>{RETURN_WINDOW_DAYS} days of delivery</strong>.
          </li>
          <li>
            Only <strong>delivered</strong> orders can have a request.
          </li>
          <li>One request per order. Mention every affected item in the same request.</li>
        </ul>
      ),
    },
    {
      id: "returns",
      title: "Returns (damaged products only)",
      body: (
        <ul>
          <li>A return is accepted only when the product reached you damaged: torn, stained, cut, or with a printing or stitching defect.</li>
          <li>The damage must be clearly visible in your unboxing video.</li>
          <li>Once approved, our team will share the pickup or return-shipping steps.</li>
          <li>After the product reaches us and is checked, the refund goes to your original payment method. If you prefer, we can send a replacement instead.</li>
        </ul>
      ),
    },
    {
      id: "exchanges",
      title: "Exchanges (all other cases)",
      body: (
        <ul>
          <li>
            Every case that is not a damaged product is <strong>exchange only</strong>: wrong size, different colour or design, or a change of mind.
          </li>
          <li>The product must be unused, unwashed and in its original packaging with tags.</li>
          <li>You can exchange for another size or design. If the new item costs more, you pay the difference.</li>
          <li>Exchanges are not refunded in cash or to the original payment method.</li>
        </ul>
      ),
    },
    {
      id: "video",
      title: "The unboxing (opening) video is mandatory",
      body: (
        <>
          <p>
            Without an unboxing video, <strong>no return or exchange is accepted</strong>. To be valid, the video must:
          </p>
          <ul>
            <li>
              Start with the <strong>sealed parcel</strong>, with the shipping label and order number clearly visible.
            </li>
            <li>
              Be <strong>one continuous recording</strong> with no cuts, pauses or edits, until the product is fully out of the packet.
            </li>
            <li>Clearly show the product and, for a return, the damage.</li>
            <li>Be uploaded with your request (any common phone video format, up to 100 MB; recording in 720p keeps the file small).</li>
          </ul>
          <p className="policy-tip">Tip: start recording before you cut the tape on every Zafiro Indio parcel.</p>
        </>
      ),
    },
    {
      id: "how",
      title: "How to request a return or exchange",
      body: (
        <ol>
          <li>
            Go to <Link href="/account">My Orders</Link> (or <Link href="/track">Track Order</Link>) and enter your order number with the phone or email you ordered with.
          </li>
          <li>
            Tap <strong>Return / Exchange</strong>, choose return (damaged) or exchange, and describe the issue.
          </li>
          <li>Upload your unboxing video and submit.</li>
          <li>Our team watches the video and approves or rejects the request. You will hear from us by email or phone with the next steps.</li>
        </ol>
      ),
    },
    {
      id: "rejected",
      title: "When a request is rejected",
      body: (
        <ul>
          <li>No unboxing video, or a video that is cut, edited or does not show the sealed parcel.</li>
          <li>A return request for a product that is not damaged (you can still ask for an exchange within the window).</li>
          <li>Products that are used, washed or not in their original packaging (for exchanges).</li>
          <li>Requests raised after {RETURN_WINDOW_DAYS} days from delivery.</li>
        </ul>
      ),
    },
    {
      id: "handwork",
      title: "Hand-block printing is not a defect",
      body: <p>Each piece is printed by hand with wooden blocks. Small shifts in colour, alignment or print are the mark of handwork, not damage, and are not a reason for return.</p>,
    },
    {
      id: "cancellations",
      title: "Cancellations",
      body: (
        <>
          <p>
            You can cancel an order from <Link href="/account">My Orders</Link> until it is shipped. Any prepaid amount is refunded to the original payment method. Once a parcel
            has shipped it cannot be cancelled, but you can still use the return or exchange options above after it arrives.
          </p>
          <p>If we have to cancel your order, for example because an item is out of stock, you will be refunded in full.</p>
        </>
      ),
    },
    {
      id: "refunds",
      title: "How and when refunds are paid",
      body: (
        <>
          <div className="pol-table-wrap">
            <table className="pol-table">
              <thead>
                <tr>
                  <th>Situation</th>
                  <th>What you get</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Prepaid order cancelled before it ships</td>
                  <td>Full refund to the original payment method</td>
                </tr>
                <tr>
                  <td>Damaged product, return approved</td>
                  <td>Refund to the original payment method, or a replacement if you prefer</td>
                </tr>
                <tr>
                  <td>Exchange (any reason other than damage)</td>
                  <td>Exchange for another size or design. No refund</td>
                </tr>
                <tr>
                  <td>Order cancelled by us, or parcel returned undelivered (prepaid)</td>
                  <td>Full refund to the original payment method</td>
                </tr>
                <tr>
                  <td>Cash on Delivery order, refund due</td>
                  <td>Sent to the UPI ID or bank account you give us</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul>
            <li>
              Online refunds are sent back to the same UPI, card, net-banking account or wallet you paid with. They usually arrive within <strong>5–7 business days</strong> of the
              refund being issued; how quickly it shows in your account depends on your bank or card issuer.
            </li>
            <li>For Cash on Delivery orders we will ask you for a UPI ID or bank account to send the refund to. We never ask for card numbers, PINs or OTPs.</li>
            <li>We will e-mail you when a refund is issued.</li>
          </ul>
        </>
      ),
    },
    {
      id: "contact",
      title: "Contact us",
      body: (
        <p>
          Questions about a return, exchange or refund? Email <a href={`mailto:${contact.email}`}>{contact.email}</a>
          {contact.phone && (
            <>
              {" "}
              or call <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>{contact.phone}</a>
            </>
          )}
          {wa && (
            <>
              {" "}
              or{" "}
              <a href={wa} target="_blank" rel="noopener noreferrer">
                message us on WhatsApp
              </a>
            </>
          )}
          .
        </p>
      ),
    },
  ];

  return (
    <PolicyPage
      current="/return-policy"
      eyebrow="Customer care"
      title="Return, Exchange & Refund Policy"
      updated="7 November 2026"
      intro={
        <>
          <p>Simple, fair rules for returns, exchanges, cancellations and refunds, and exactly what we need from you to make any of them quick.</p>
          {/* This page only explains the rules; the request itself is raised against an order, so
              point at the lookup rather than leaving the reader to find it. */}
          <p style={{ marginTop: 18 }}>
            <Link href="/account" className="btn gold">
              Start a return, exchange or cancellation <ArrowRight size={14} />
            </Link>
          </p>
          <p style={{ marginTop: 10, fontSize: 13 }}>
            Enter your order number with the phone number or e-mail you ordered with — no account needed.
          </p>
        </>
      }
      highlights={[
        {
          icon: <PackageX size={20} strokeWidth={1.6} />,
          title: "Returns only for damaged products",
          text: "If your order arrives damaged (torn, stained, cut, or with a printing or stitching defect), you can return it for a refund or ask for a replacement.",
        },
        {
          icon: <Repeat size={20} strokeWidth={1.6} />,
          title: "Everything else is exchange only",
          text: "Wrong size, a different colour or design, or you simply changed your mind: we will exchange it. These cases are not refunded.",
        },
        {
          icon: <Video size={20} strokeWidth={1.6} />,
          title: "Unboxing video is mandatory",
          text: "Record one continuous video while opening the parcel. Without this video we cannot accept any return or exchange request.",
        },
      ]}
      sections={sections}
    />
  );
}
