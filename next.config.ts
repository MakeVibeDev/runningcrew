import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "k.kakaocdn.net",
      },
      {
        protocol: "http",
        hostname: "k.kakaocdn.net",
      },
      {
        protocol: "https",
        hostname: "blzupvegyrakpkbhxhfp.supabase.co",
      },
    ],
  },
  // CSS 최적화
  experimental: {
    optimizeCss: true, // CSS 최적화 활성화
  },
};

export default nextConfig;
