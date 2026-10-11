import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // These are CommonJS packages whose named exports get mangled by webpack's
  // ESM interop in the production server build. Marking them server-external
  // makes Next require() them from node_modules at runtime instead of bundling.
  serverExternalPackages: ["pdf-lib", "qrcode"],
};

export default nextConfig;
