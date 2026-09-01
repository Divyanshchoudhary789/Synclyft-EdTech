import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence Turbopack webpack config warning/error by providing an empty turbopack configuration
  turbopack: {},
  // Force fallback to Webpack to support legacy UMD/CommonJS packages like @mediapipe/face_mesh
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
