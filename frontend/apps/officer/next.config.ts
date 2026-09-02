import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@synclyft/ui", "@synclyft/lib"],
  turbopack: {
    root: path.join(import.meta.dirname, "../.."),
  },
  compiler: {
    // Strip console.* (except error/warn) from production bundles.
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  // Webpack fallback for legacy UMD/CommonJS deps (e.g. @mediapipe/face_mesh).
  webpack: (config) => config,
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
