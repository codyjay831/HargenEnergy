import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/admin/block-work",
        destination: "/admin/clients",
        permanent: false,
      },
      {
        source: "/portal/block-work",
        destination: "/portal/requests",
        permanent: false,
      },
    ];
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
      : "script-src 'self' 'unsafe-inline' https://js.stripe.com";

    const csp = [
      "default-src 'self'",
      "img-src 'self' data: https:",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://api.stripe.com https://*.blob.vercel-storage.com https://*.public.blob.vercel-storage.com https://*.private.blob.vercel-storage.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
  widenClientFileUpload: true,
});
