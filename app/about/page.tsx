import type { Metadata } from "next";
import AboutContent from "@/components/site/AboutContent";

const BASE_URL = "https://zafiroindio.com";

export const metadata: Metadata = {
  title: "About Zafiro Indio | Jaipur Handblock Cotton Bedsheets",
  description:
    "Discover the story of Zafiro Indio — a Jaipur-based home textile brand crafting hand-block printed cotton bedsheets with traditional Rajasthani artisans. Our philosophy, craft, and values.",
  keywords: [
    "Zafiro Indio about",
    "Jaipur handblock bedsheets",
    "Indian textile brand",
    "Rajasthani block print",
    "artisan bedsheets India",
    "cotton bedsheets Jaipur",
    "handcrafted bedding India",
  ],
  alternates: { canonical: `${BASE_URL}/about` },
  openGraph: {
    title: "About Zafiro Indio | Jaipur Handblock Cotton Bedsheets",
    description:
      "A Jaipur-based home textile brand rooted in Rajasthani artisan craftsmanship. Discover our story.",
    type: "website",
    url: `${BASE_URL}/about`,
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Zafiro Indio",
  description:
    "Jaipur-based home textile brand specialising in hand-block printed cotton bedsheets crafted by traditional Rajasthani artisans.",
  url: BASE_URL,
  logo: `${BASE_URL}/zafiro-logo-dark.png`,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Jaipur",
    addressRegion: "Rajasthan",
    addressCountry: "IN",
  },
  geo: { "@type": "GeoCoordinates", latitude: 26.9124, longitude: 75.7873 },
  areaServed: { "@type": "Country", name: "India" },
  foundingDate: "2020",
  numberOfEmployees: { "@type": "QuantitativeValue", value: 15 },
  knowsAbout: ["hand block printing", "cotton bedsheets", "Rajasthani textiles", "home decor"],
  sameAs: [],
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "About", item: `${BASE_URL}/about` },
  ],
};

export default function About() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <AboutContent />
    </>
  );
}
