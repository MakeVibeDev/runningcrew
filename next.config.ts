import type { NextConfig } from "next";

// 앱 타입 확인: admin 또는 main (default)
const isAdminApp = process.env.NEXT_PUBLIC_APP_TYPE === "admin";

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

  async redirects() {
    if (isAdminApp) {
      // Admin 앱: 루트를 admin-dashboard로 리다이렉트 + 서비스 라우트 차단
      return [
        {
          source: "/",
          destination: "/admin-dashboard",
          permanent: false,
        },
        {
          source: "/missions/:path*",
          destination: "/admin-dashboard",
          permanent: false,
        },
        {
          source: "/crews/:path*",
          destination: "/admin-dashboard",
          permanent: false,
        },
        {
          source: "/records/:path*",
          destination: "/admin-dashboard",
          permanent: false,
        },
        {
          source: "/members/:path*",
          destination: "/admin-dashboard",
          permanent: false,
        },
      ];
    } else {
      // Main 앱에서는 admin 라우트 접근 차단
      return [
        {
          source: "/admin-dashboard/:path*",
          destination: "/",
          permanent: false,
        },
        {
          source: "/admin-login",
          destination: "/",
          permanent: false,
        },
      ];
    }
  },
};

export default nextConfig;
