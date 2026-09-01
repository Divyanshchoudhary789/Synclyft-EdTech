import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@synclyft/ui", "@synclyft/lib"],
  turbopack: {
    root: path.join(import.meta.dirname, "../.."),
  },
  // Webpack fallback for legacy UMD/CommonJS deps (e.g. @mediapipe/face_mesh).
  webpack: (config) => config,
  typescript: {
    // Types are checked in CI / `turbo run typecheck`; keep builds fast.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
