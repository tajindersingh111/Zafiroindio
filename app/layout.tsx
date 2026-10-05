import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WelcomeDiscountModal from "@/components/WelcomeDiscountModal";
import { StoreProvider } from "@/components/StoreProvider";

export const metadata: Metadata = {
  title: { default: "Zafiro Indio | Handblock Cotton Bedsheets from Jaipur", template: "%s | Zafiro Indio" },
  description: "Shop authentic hand-block printed 100% cotton bedsheets by Zafiro Indio — crafted by traditional artisans in Jaipur, Rajasthan. Free shipping above ₹999. Easy 7-day returns.",
  keywords: ["handblock bedsheets", "cotton bedsheets Jaipur", "block print bedsheets India", "Rajasthani bedsheets", "Zafiro Indio", "buy bedsheets online India"],
  metadataBase: new URL("https://zafiroindio.com"),
  openGraph: { title: "Zafiro Indio | Handblock Cotton Bedsheets from Jaipur", description: "Authentic hand-block printed cotton bedsheets from Jaipur artisans. Shop floral, minimal, luxury & printed collections.", type: "website" },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet" />
        <script src="https://fastrr-cdn.shiprocket.in/fastrr.js" data-app-id="5b91efa1-d315-406a-b560-0d8be6067c9a" defer></script>
        <script src="https://cdn.pickrr.com/assets/js/fastrr.js" data-app-id="5b91efa1-d315-406a-b560-0d8be6067c9a" defer></script>
        <script src="https://checkout.shiprocket.in/shiprocket-checkout.js" data-app-id="5b91efa1-d315-406a-b560-0d8be6067c9a" defer></script>
      </head>
      <body>
        <StoreProvider>
          <Header />
          {children}
          <Footer />
          <WelcomeDiscountModal />
        </StoreProvider>
      </body>
    </html>
  );
}

