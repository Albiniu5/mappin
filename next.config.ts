import type { NextConfig } from "next";

const nextConfig: any = {
  output: 'standalone',
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // (Swap memory enabled on server)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
