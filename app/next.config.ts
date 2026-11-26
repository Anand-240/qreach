import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Lets a production build run next to `next dev` without sharing .next
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
