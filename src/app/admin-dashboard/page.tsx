"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");

  useEffect(() => {
    // 세션 확인
    const checkSession = async () => {
      try {
        const response = await fetch("/api/admin/session");
        const data = await response.json();

        if (!data.authenticated) {
          router.push("/admin-login");
          return;
        }

        setUsername(data.username);
        setLoading(false);
      } catch (error) {
        console.error("세션 확인 오류:", error);
        router.push("/admin-login");
      }
    };

    checkSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin-login");
    } catch (error) {
      console.error("로그아웃 오류:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      {/* 헤더 */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold">🛠️ 관리자 대시보드</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {username} 님
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="mb-2 text-lg font-semibold">관리 메뉴</h2>
          <p className="text-sm text-muted-foreground">
            아래 메뉴에서 원하는 관리 기능을 선택하세요.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* 기록 관리 카드 */}
          <div
            onClick={() => router.push("/admin-dashboard/records")}
            className="cursor-pointer rounded-lg border border-border bg-background p-6 shadow-sm transition-all hover:shadow-md"
          >
            <div className="mb-4 text-4xl">📊</div>
            <h3 className="mb-2 text-xl font-semibold">기록 관리</h3>
            <p className="text-sm text-muted-foreground">
              사용자들의 러닝 기록을 조회, 수정, 삭제할 수 있습니다.
            </p>
          </div>

          {/* 사용자 관리 카드 */}
          <div
            className="cursor-not-allowed rounded-lg border border-border bg-background p-6 shadow-sm opacity-50"
          >
            <div className="mb-4 text-4xl">👥</div>
            <h3 className="mb-2 text-xl font-semibold">사용자 관리</h3>
            <p className="text-sm text-muted-foreground">
              사용자 목록 조회 및 권한 관리 (준비 중)
            </p>
          </div>

          {/* 크루 관리 카드 */}
          <div
            className="cursor-not-allowed rounded-lg border border-border bg-background p-6 shadow-sm opacity-50"
          >
            <div className="mb-4 text-4xl">🏃</div>
            <h3 className="mb-2 text-xl font-semibold">크루 관리</h3>
            <p className="text-sm text-muted-foreground">
              크루 목록 조회 및 설정 관리 (준비 중)
            </p>
          </div>

          {/* 미션 관리 카드 */}
          <div
            className="cursor-not-allowed rounded-lg border border-border bg-background p-6 shadow-sm opacity-50"
          >
            <div className="mb-4 text-4xl">🎯</div>
            <h3 className="mb-2 text-xl font-semibold">미션 관리</h3>
            <p className="text-sm text-muted-foreground">
              미션 생성, 수정 및 진행 상태 관리 (준비 중)
            </p>
          </div>

          {/* 통계 카드 */}
          <div
            className="cursor-not-allowed rounded-lg border border-border bg-background p-6 shadow-sm opacity-50"
          >
            <div className="mb-4 text-4xl">📈</div>
            <h3 className="mb-2 text-xl font-semibold">통계</h3>
            <p className="text-sm text-muted-foreground">
              사용자, 크루, 기록 등의 통계 정보 (준비 중)
            </p>
          </div>

          {/* 설정 카드 */}
          <div
            className="cursor-not-allowed rounded-lg border border-border bg-background p-6 shadow-sm opacity-50"
          >
            <div className="mb-4 text-4xl">⚙️</div>
            <h3 className="mb-2 text-xl font-semibold">설정</h3>
            <p className="text-sm text-muted-foreground">
              시스템 설정 및 환경 변수 관리 (준비 중)
            </p>
          </div>
        </div>

        {/* 메인으로 돌아가기 */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← 메인으로 돌아가기
          </button>
        </div>
      </main>
    </div>
  );
}
