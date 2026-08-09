import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ireland.apollo.olxcdn.com',
      },
      {
        protocol: 'https',
        hostname: '*.apollo.olxcdn.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.riastatic.com',
      },
    ],
  },
};

export default nextConfig;
