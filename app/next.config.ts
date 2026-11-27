import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Lets a production build run next to `next dev` without sharing .next
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Pin the workspace root to app/, so a lockfile in a parent folder is not picked up
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
