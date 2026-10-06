import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" }
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"} https://*.shiprocket.in https://*.fastrr.app https://checkout.shiprocket.in https://*.pickrr.com https://cdn.pickrr.com https://*.fastrr.com`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.shiprocket.in https://*.fastrr.app https://*.pickrr.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://*.shiprocket.in https://*.fastrr.app https://*.pickrr.com",
              "connect-src 'self' https://*.shiprocket.in https://fastrr-api.shiprocket.in https://*.fastrr.app https://*.pickrr.com https://*.fastrr.com",
              "frame-src 'self' https://*.shiprocket.in https://*.fastrr.app https://*.pickrr.com https://*.fastrr.com",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join("; ")
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
