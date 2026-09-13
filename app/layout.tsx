import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { StoreProvider } from "@/components/StoreProvider";

export const metadata: Metadata = {
  title: { default: "Zafiro | Beautiful Bedsheets for Beautiful Homes", template: "%s | Zafiro" },
  description: "Shop premium, beautiful bedsheets by Zafiro. Timeless prints, soft fabrics and everyday comfort for beautiful bedrooms.",
  keywords: ["bedsheets", "premium bedsheets", "cotton bedsheets", "Zafiro", "home decor", "Indian bedsheets"],
  metadataBase: new URL("https://zafiro.example"),
  openGraph: { title: "Zafiro | Beautiful Bedsheets for Beautiful Homes", description: "Thoughtfully designed bedsheets for everyday comfort and timeless style.", type: "website" },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <StoreProvider>
          <Header />
          {children}
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
