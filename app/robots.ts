import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://zafiroindio.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          // Personal or transactional: nothing here is for a search engine.
          "/cart",
          "/checkout",
          "/order-success",
          "/account",
          "/track",
          "/wishlist",
          // Trade/wholesale price list: shared by direct link only, not for search.
          "/wholesale",
          "/wholesale-catalogue.html",
          // /search and /login are not listed here on purpose: they carry a noindex tag, and a crawler only
          // honours a noindex on a page it is allowed to fetch.
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
