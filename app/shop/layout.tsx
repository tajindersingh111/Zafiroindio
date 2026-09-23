import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop All Bedsheets | Cotton, Block Print, Floral | Zafiro Indio",
  description:
    "Browse all Zafiro Indio bedsheets — 100% cotton, hand-block printed floral, minimal, luxury & printed designs from Jaipur. Filter by size, colour & price. Free shipping above ₹999.",
  keywords: [
    "shop bedsheets online India",
    "buy cotton bedsheets",
    "floral bedsheets",
    "block print bedsheets",
    "bedsheets Jaipur",
    "all bedsheets online",
    "bedsheet store India",
  ],
  alternates: { canonical: "https://zafiroindio.com/shop" },
  openGraph: {
    title: "Shop All Bedsheets | Zafiro Indio",
    description:
      "Browse 100+ hand-block printed cotton bedsheets from Jaipur artisans. Multiple sizes, colours and styles.",
    type: "website",
    url: "https://zafiroindio.com/shop",
  },
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
