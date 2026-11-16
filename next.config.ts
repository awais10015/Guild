import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  // the on-disk turbopack cache corrupts when processes are killed mid-compile;
  // dev stays in-memory for reliability (builds still use the file cache)
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
  // NOTE: never put better-auth here — it imports react, and an external
  // require() resolves a second React instance whose dispatcher is null
  // during SSR ("Invalid hook call" on every useSession() call).
  serverExternalPackages: ["mongoose", "mongodb", "nodemailer", "cloudinary"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
