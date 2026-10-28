import type { NextConfig } from "next";
import { TOUR_EMBED_ORIGINS } from "./src/lib/tour-hosts";

// Content-Security-Policy limited to directives that do not require script nonces.
// frame-src only allows the external virtual-tour providers we know how to embed.
const csp = [
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  `frame-src 'self' ${TOUR_EMBED_ORIGINS.join(" ")}`,
].join("; ");

const nextConfig: NextConfig = {
  // Flatmarket is an authenticated, per-user application: we use the classic
  // dynamic rendering model rather than Cache Components.
  cacheComponents: false,
  poweredByHeader: false,
  serverExternalPackages: ["sharp", "@react-pdf/renderer", "pg"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        source: "/(app|admin)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/s/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
