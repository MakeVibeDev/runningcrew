import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { FeedbackButton } from "@/components/feedback-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RunningCrew - 함께 달리는 즐거움",
    template: "%s | RunningCrew",
  },
  description: "러닝 크루와 함께 미션을 완수하고 기록을 공유하세요. 크루를 만들고, 미션에 도전하고, 러닝 기록을 관리하는 플랫폼입니다.",
  keywords: ["러닝", "러닝크루", "달리기", "마라톤", "운동기록", "러닝앱", "크루", "미션챌린지"],
  authors: [{ name: "RunningCrew" }],
  creator: "RunningCrew",
  publisher: "RunningCrew",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3004"),
  icons: {
    icon: [
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "android-chrome-192x192", url: "/favicon/android-chrome-192x192.png" },
      { rel: "android-chrome-512x512", url: "/favicon/android-chrome-512x512.png" },
    ],
  },
  openGraph: {
    title: "RunningCrew - 함께 달리는 즐거움",
    description: "러닝 크루와 함께 미션을 완수하고 기록을 공유하세요",
    url: "/",
    siteName: "RunningCrew",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 1200,
        alt: "RunningCrew - 함께 달리는 즐거움",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RunningCrew - 함께 달리는 즐거움",
    description: "러닝 크루와 함께 미션을 완수하고 기록을 공유하세요",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
    ? {
        verification: {
          ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && {
            google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
          }),
          ...(process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION && {
            other: {
              "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION,
            },
          }),
        },
      }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        <SupabaseProvider>
          <SiteNav />
          <div className="pb-10">{children}</div>
          <SiteFooter />
          <FeedbackButton />
        </SupabaseProvider>
      </body>
    </html>
  );
}
