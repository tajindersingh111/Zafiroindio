import type { Metadata } from "next";

// Search results are a different page for every query: none of them belongs in a search engine's index,
// and the title is their own rather than a copy of the home page's.
export const metadata: Metadata = {
  title: "Search",
  description: "Search Zafiro Indio's hand block printed bedsheets, rugs, table runners and sofa throws.",
  robots: { index: false, follow: true },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
