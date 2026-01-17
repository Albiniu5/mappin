import type { NextConfig } from "next";

const nextConfig: any = {
  output: 'standalone',

  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // (Swap memory enabled on server)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
