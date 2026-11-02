import type { NextConfig } from "next";

const api = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/$/, "");

/** Every screen is live, per-admin data fetched in the browser, so nothing here is cached on the server. */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // The default corner sits on top of the signed-in admin's name.
  devIndicators: { position: "bottom-right" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_PROXY !== "1") return [];
    // Socket.IO's path gets its trailing slash back here, because Next would redirect a request that had one.
    return [
      { source: "/api/:path*", destination: `${api}/api/:path*` },
      { source: "/socket.io", destination: `${api}/socket.io/` },
    ];
  },
  async headers() {
    const connect = [api, api.replace(/^http/, "ws")].join(" ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next's inline bootstrap needs 'unsafe-inline'; 'unsafe-eval' is only for the dev server's fast refresh.
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              `connect-src 'self' ${connect}`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
