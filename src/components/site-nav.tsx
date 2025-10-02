"use client";

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
    <header className="border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.svg"
            alt="RunningCrew"
            width={200}
            height={40}
            priority
          />
        </Link>
        <div className="flex items-center gap-4">
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
      </div>
    </header>
  );
}
