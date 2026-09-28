import type { NextConfig } from "next";

// Hosts that next/image is allowed to optimize. The local storage driver serves
// files from /api/files/*, so only remote S3/Cloudinary style hosts are listed.
const remoteImageHosts = (process.env.IMAGE_REMOTE_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["sharp", "nodemailer", "@prisma/client", "@prisma/adapter-pg"],
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 90],
    remotePatterns: [
      ...remoteImageHosts.map((hostname) => ({ protocol: "https" as const, hostname })),
      { protocol: "https", hostname: "*.tile.openstreetmap.org" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Never let browsers or CDNs cache private user data.
        source: "/(dashboard|messages|favorites|settings|admin)/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default nextConfig;
