import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "./policy.css";
import "./home.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WelcomeDiscountModal from "@/components/WelcomeDiscountModal";
import { StoreProvider } from "@/components/StoreProvider";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: { default: "Zafiro Indio | Handblock Cotton Bedsheets from Jaipur", template: "%s | Zafiro Indio" },
  // No shipping threshold here: it changed once already, and a number quoted in every search result goes stale.
  description: "Hand block printed 100% cotton bedsheets, rugs, table runners and sofa throws, made by traditional artisans in Jaipur, Rajasthan. Easy 7-day exchanges.",
  keywords: ["handblock bedsheets", "cotton bedsheets Jaipur", "block print bedsheets India", "Rajasthani bedsheets", "Zafiro Indio", "buy bedsheets online India"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://zafiroindio.com"),
  openGraph: {
    title: "Zafiro Indio | Handblock Cotton Bedsheets from Jaipur",
    description: "Authentic hand-block printed cotton bedsheets, rugs and table linen from Jaipur artisans.",
    type: "website",
    siteName: "Zafiro Indio",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true }
};

/** Google Tag Manager container. GA4, Ads and other tags are added inside GTM, not in this code. */
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-MLQDFKGV";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        {GTM_ID && (
          <>
            <Script id="gtm" strategy="afterInteractive">
              {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
            </Script>
            <noscript>
              <iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} />
            </noscript>
          </>
        )}
        <AuthProvider>
          <StoreProvider>
            <Header />
            {children}
            <Footer />
            <WelcomeDiscountModal />
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
