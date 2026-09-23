import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/cart",
          "/checkout",
          "/order-success",
          "/account/",
        ],
      },
    ],
    sitemap: "https://zafiroindio.com/sitemap.xml",
  };
}
