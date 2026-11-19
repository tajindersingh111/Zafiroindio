import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bulk & Wholesale Orders",
  description:
    "Wholesale hand block printed bedsheets, table linen and home textiles for hotels, resorts, retailers and corporate gifting. Custom prints and quantities, made in Jaipur.",
  alternates: { canonical: "https://zafiroindio.com/bulk-order" },
  openGraph: {
    title: "Bulk & Wholesale Orders | Zafiro Indio",
    description: "Wholesale hand block printed home textiles for hotels, retailers and corporate gifting.",
    type: "website",
    url: "https://zafiroindio.com/bulk-order",
    images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "Zafiro Indio hand block printed home textiles from Jaipur" }],
  },
};

export default function BulkOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
