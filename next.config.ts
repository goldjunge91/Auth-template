import type { NextConfig } from "next";
import "./src/env.js";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "*",
    "localhost:3000",
    "127.0.0.1:3000"
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
      },
    ],
    unoptimized: true,
  },
  // Already doing linting and typechecking as separate tasks in CI
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
