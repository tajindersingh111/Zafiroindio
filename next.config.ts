import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  images: {
    // Product photos come from the WordPress media library as ~900 KB, 2560 px JPEGs. Resized WebP
    // copies (see lib/img.ts) are ~20x smaller and cached for 31 days.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "zafiroindio.com", pathname: "/wp-content/uploads/**" },
      { protocol: "https", hostname: "www.zafiroindio.com", pathname: "/wp-content/uploads/**" },
    ],
    formats: ["image/webp"],
    qualities: [75],
    minimumCacheTTL: 2678400,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // Shiprocket's checkout SDK runs in this page and pulls in whichever payment/OTP provider the
            // shopper picks (Razorpay, Cashfree, BillDesk, PayU, OTPless, CRED ...), and that list changes
            // without notice. A host allowlist here silently broke checkout, and with 'unsafe-inline'
            // (needed by the SDK) it added little XSS protection. So: any HTTPS source, never plain http,
            // data: scripts, plugins or framing of this site.
            // 'unsafe-eval' is REQUIRED in production too: Shiprocket's sr-cdn.shiprocket.in/sr-promise
            // script evaluates code, and blocking it breaks the checkout SDK (it only ever worked in dev).
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
              "style-src 'self' 'unsafe-inline' https:",
              "font-src 'self' data: https:",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https: wss:",
              "frame-src 'self' https:",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https:",
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
