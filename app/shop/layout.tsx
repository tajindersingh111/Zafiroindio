import type { Metadata } from "next";

export const metadata: Metadata = {
  // The root layout adds " | Zafiro Indio", so the brand is not repeated here.
  title: "Shop Handblock Bedsheets, Rugs & Table Linen",
  description:
    "Hand block printed cotton bedsheets, rugs, table runners, sofa throws and quilted bedcovers, made by artisans in Jaipur. Easy 7-day exchanges.",
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
    title: "Shop Handblock Bedsheets, Rugs & Table Linen | Zafiro Indio",
    description: "Hand block printed cotton home textiles made by artisans in Jaipur.",
    type: "website",
    url: "https://zafiroindio.com/shop",
    images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "Zafiro Indio hand block printed home textiles from Jaipur" }],
  },
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
