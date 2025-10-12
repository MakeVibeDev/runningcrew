"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
  username?: string;
}

export function AdminLayout({ children, username }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin-login");
    } catch (error) {
      console.error("로그아웃 오류:", error);
    }
  };

  const navigation = [
    { name: "대시보드", href: "/admin-dashboard", icon: "📊" },
    { name: "사용자", href: "/admin-dashboard/users", icon: "👥" },
    { name: "크루", href: "/admin-dashboard/crews", icon: "🏃" },
    { name: "미션", href: "/admin-dashboard/missions", icon: "🎯" },
    { name: "기록", href: "/admin-dashboard/records", icon: "📝" },
    { name: "신고", href: "/admin-dashboard/reports", icon: "🚨" },
    { name: "통계", href: "/admin-dashboard/analytics", icon: "📈" },
  ];

  return (
    <div className="min-h-screen bg-muted/40">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/admin-dashboard" className="flex items-center gap-2">
            <span className="text-2xl font-bold">🛠️ RunningCrew Admin</span>
          </Link>
          <div className="flex items-center gap-4">
            {username && (
              <span className="text-sm text-muted-foreground">
                {username} 님
              </span>
            )}
            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto flex gap-6 px-4 py-6">
        {/* 사이드바 */}
        <aside className="w-64 shrink-0">
          <nav className="sticky top-24 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* 메인 컨텐츠 */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
