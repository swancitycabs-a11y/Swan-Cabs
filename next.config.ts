import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/book-taxi",
        destination: "/book",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
