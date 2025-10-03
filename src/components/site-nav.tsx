"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSupabase } from "@/components/providers/supabase-provider";
import { KakaoLoginButton } from "@/components/ui/oauth-button";
import { cn } from "@/lib/utils";

const baseNavItems = [
  { href: "/", label: "대시보드" },
  { href: "/records/upload", label: "기록 등록" },
  { href: "/missions", label: "미션" },
  { href: "/crews", label: "크루" },
];

export function SiteNav() {
  const pathname = usePathname();
  const { user, profile, loading, signInWithOAuth, signOut } = useSupabase();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = user
    ? [
        ...baseNavItems
      ]
    : baseNavItems;

  const displayName = profile?.display_name
    || user?.user_metadata?.nickname
    || user?.user_metadata?.name
    || user?.user_metadata?.full_name
    || user?.email
    || "러너";

  const avatarUrl = profile?.avatar_url || (user?.user_metadata?.avatar_url as string | undefined);
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <>
      <header className="border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Left side - Logo */}
        <Link href="/" className="flex items-center">
          {/* Desktop: Full logo with text */}
          <Image
            src="/logo_text-removebg.png"
            alt="RunningCrew"
            width={140}
            height={56}
            priority
            style={{ width: '140px', height: 'auto' }}
            className="hidden md:block"
          />
          {/* Mobile: Icon only */}
          <Image
            src="/logo-removebg.png"
            alt="RunningCrew"
            width={40}
            height={40}
            priority
            style={{ width: '40px', height: 'auto' }}
            className="md:hidden"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-4 md:flex">
          <nav className="flex items-center gap-2 text-sm">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3 py-1 transition hover:bg-muted",
                    active ? "bg-foreground text-background" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="relative h-8 w-8 overflow-hidden rounded-full border border-border/60 bg-muted text-xs font-semibold uppercase text-muted-foreground">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt={`${displayName} avatar`} fill sizes="32px" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-emerald-500/10 text-emerald-700">
                        {initials}
                      </div>
                    )}
                  </div>
                  <span className="hidden text-muted-foreground sm:inline">{displayName}님</span>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  disabled={loading}
                  className="rounded-full border border-border px-3 py-1 text-sm font-medium hover:bg-muted"
                >
                  {loading ? "로그아웃 중..." : "로그아웃"}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="hidden text-muted-foreground sm:inline">카카오 계정으로 시작하기</span>
                <KakaoLoginButton onClick={() => void signInWithOAuth("kakao")} disabled={loading} />
              </div>
            )}
          </div>
        </div>

        {/* Mobile - Profile + Hamburger */}
        <div className="flex items-center gap-3 md:hidden">
          {user && (
            <div className="relative h-8 w-8 overflow-hidden rounded-full border border-border/60 bg-muted text-xs font-semibold uppercase text-muted-foreground">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={`${displayName} avatar`} fill sizes="32px" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-emerald-500/10 text-emerald-700">
                  {initials}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 hover:bg-muted"
            aria-label="메뉴"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
        </div>
      </header>

      {/* Mobile Menu Modal */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-y-0 right-0 z-50 w-[280px] bg-background shadow-xl md:hidden">
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
                <h2 className="text-lg font-semibold">메뉴</h2>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-2 hover:bg-muted"
                  aria-label="닫기"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto px-4 py-6">
                <div className="flex flex-col gap-1">
                  {navItems.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "rounded-lg px-4 py-3 text-sm font-medium transition hover:bg-muted",
                          active ? "bg-foreground text-background" : "text-foreground",
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </nav>

              {/* Footer - User Info */}
              <div className="border-t border-border/70 p-4">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-2">
                      <div className="relative h-10 w-10 overflow-hidden rounded-full border border-border/60 bg-muted text-xs font-semibold uppercase text-muted-foreground">
                        {avatarUrl ? (
                          <Image src={avatarUrl} alt={`${displayName} avatar`} fill sizes="40px" />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-emerald-500/10 text-emerald-700">
                            {initials}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium">{displayName}님</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void signOut();
                        setMobileMenuOpen(false);
                      }}
                      disabled={loading}
                      className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                    >
                      {loading ? "로그아웃 중..." : "로그아웃"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="px-2 text-sm text-muted-foreground">
                      카카오 계정으로 시작하기
                    </p>
                    <KakaoLoginButton
                      onClick={() => {
                        void signInWithOAuth("kakao");
                        setMobileMenuOpen(false);
                      }}
                      disabled={loading}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
