import type { Metadata } from "next";
import Link from "next/link";
import { PackageX, Repeat, Video } from "lucide-react";
import { RETURN_WINDOW_DAYS } from "@/lib/returns/policy";
import { getStoreContact, whatsappLink } from "@/lib/storefront/contact";

export const metadata: Metadata = {
  title: "Return, Exchange & Refund Policy",
  description: "Damaged products can be returned; everything else is exchange only. An unboxing video is required for every return or exchange request.",
  alternates: { canonical: "/return-policy" },
};

// Reads the support contact from settings at request time.
export const dynamic = "force-dynamic";

const RULES = [
  {
    Icon: PackageX,
    title: "Returns only for damaged products",
    text: "If your order arrives damaged (torn, stained, cut, or with a printing or stitching defect), you can return it for a refund or ask for a replacement.",
  },
  {
    Icon: Repeat,
    title: "Everything else is exchange only",
    text: "Wrong size, a different colour or design, or you simply changed your mind: we will exchange it. These cases are not refunded.",
  },
  {
    Icon: Video,
    title: "Unboxing video is mandatory",
    text: "Record one continuous video while opening the parcel. Without this video we cannot accept any return or exchange request.",
  },
];

export default async function ReturnPolicyPage() {
  const contact = await getStoreContact();
  const wa = whatsappLink(contact, "Hi Zafiro Indio, I have a question about a return / exchange.");

  return (
    <main className="blockprint-bg">
      <div className="container section policy" style={{ maxWidth: 860 }}>
        <nav className="policy-crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link> <span>/</span> <span>Return &amp; Exchange Policy</span>
        </nav>

        <header style={{ textAlign: "center", marginBottom: 28 }}>
          <span className="eyebrow">Customer care</span>
          <h1 className="serif" style={{ fontSize: "clamp(32px,5vw,48px)", margin: "10px 0 0" }}>Return, Exchange &amp; Refund Policy</h1>
          <div className="ornament"><i /></div>
        </header>

        <div className="policy-rules">
          {RULES.map(({ Icon, title, text }) => (
            <div key={title} className="lux-card policy-rule">
              <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          ))}
        </div>

        <section className="lux-card policy-body">
          <h2 className="serif">1. When you can raise a request</h2>
          <ul>
            <li>Raise a return or exchange request within <strong>{RETURN_WINDOW_DAYS} days of delivery</strong>.</li>
            <li>Only <strong>delivered</strong> orders can have a request.</li>
            <li>One request per order. Mention every affected item in the same request.</li>
          </ul>

          <h2 className="serif">2. Returns (damaged products only)</h2>
          <ul>
            <li>A return is accepted only when the product reached you damaged: torn, stained, cut, or with a printing or stitching defect.</li>
            <li>The damage must be clearly visible in your unboxing video.</li>
            <li>Once approved, our team will share the pickup or return-shipping steps.</li>
            <li>After the product reaches us and is checked, the refund goes to your original payment method. If you prefer, we can send a replacement instead.</li>
          </ul>

          <h2 className="serif">3. Exchanges (all other cases)</h2>
          <ul>
            <li>Every case that is not a damaged product is <strong>exchange only</strong>: wrong size, different colour or design, or a change of mind.</li>
            <li>The product must be unused, unwashed and in its original packaging with tags.</li>
            <li>You can exchange for another size or design. If the new item costs more, you pay the difference.</li>
            <li>Exchanges are not refunded in cash or to the original payment method.</li>
          </ul>

          <h2 className="serif">4. The unboxing (opening) video is mandatory</h2>
          <p>Without an unboxing video, <strong>no return or exchange is accepted</strong>. To be valid, the video must:</p>
          <ul>
            <li>Start with the <strong>sealed parcel</strong>, with the shipping label and order number clearly visible.</li>
            <li>Be <strong>one continuous recording</strong> with no cuts, pauses or edits, until the product is fully out of the packet.</li>
            <li>Clearly show the product and, for a return, the damage.</li>
            <li>Be uploaded with your request (any common phone video format, up to 100 MB; recording in 720p keeps the file small).</li>
          </ul>
          <p className="policy-tip">Tip: start recording before you cut the tape on every Zafiro Indio parcel.</p>

          <h2 className="serif">5. How to request a return or exchange</h2>
          <ol>
            <li>Go to <Link href="/account">My Orders</Link> (or <Link href="/track">Track Order</Link>) and enter your order number with the phone or email you ordered with.</li>
            <li>Tap <strong>Return / Exchange</strong>, choose return (damaged) or exchange, and describe the issue.</li>
            <li>Upload your unboxing video and submit.</li>
            <li>Our team watches the video and approves or rejects the request. You will hear from us by email or phone with the next steps.</li>
          </ol>

          <h2 className="serif">6. When a request is rejected</h2>
          <ul>
            <li>No unboxing video, or a video that is cut, edited or does not show the sealed parcel.</li>
            <li>A return request for a product that is not damaged (you can still ask for an exchange within the window).</li>
            <li>Products that are used, washed or not in their original packaging (for exchanges).</li>
            <li>Requests raised after {RETURN_WINDOW_DAYS} days from delivery.</li>
          </ul>

          <h2 className="serif">7. Hand-block printing is not a defect</h2>
          <p>Each piece is printed by hand with wooden blocks. Small shifts in colour, alignment or print are the mark of handwork, not damage, and are not a reason for return.</p>

          <h2 className="serif">8. Cancellations</h2>
          <p>You can cancel an order from <Link href="/account">My Orders</Link> until it is shipped. Any prepaid amount is refunded to the original payment method.</p>

          <h2 className="serif">9. Contact us</h2>
          <p>
            Questions about a return or exchange? Email <a href={`mailto:${contact.email}`}>{contact.email}</a>
            {contact.phone && <> or call <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>{contact.phone}</a></>}
            {wa && <> or <a href={wa} target="_blank" rel="noopener noreferrer">message us on WhatsApp</a></>}.
          </p>
        </section>

        <div style={{ textAlign: "center", marginTop: 28 }}>
          <Link className="btn gold" href="/account">Start a return or exchange</Link>
        </div>
      </div>
    </main>
  );
}
