import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [
      {
        source: "/auth/create-workspace",
        destination: "/create-workspace",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
