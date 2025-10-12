"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { StatCard } from "@/components/admin/stat-card";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeCrews: 0,
    activeMissions: 0,
    totalRecords: 0,
    todayUsers: 0,
    todayRecords: 0,
    usersChange: 0,
    usersChangePositive: true,
    recordsChange: 0,
    recordsChangePositive: true,
    recentUsers: [] as Array<{
      id: string;
      username: string;
      full_name: string | null;
      created_at: string;
    }>,
    recentRecords: [] as Array<{
      id: string;
      title: string;
      distance: number;
      user_id: string;
      created_at: string;
      profiles: { username: string; full_name: string | null } | null;
    }>,
  });

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
        await loadStats();
        setLoading(false);
      } catch (error) {
        console.error("세션 확인 오류:", error);
        router.push("/admin-login");
      }
    };

    checkSession();
  }, [router]);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/admin/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("통계 로드 오류:", error);
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
    <AdminLayout username={username}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            서비스 전체 현황을 확인하세요
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="총 사용자"
            value={stats.totalUsers.toLocaleString()}
            icon="👥"
            subtitle="전체 가입자"
          />
          <StatCard
            title="활성 크루"
            value={stats.activeCrews.toLocaleString()}
            icon="🏃"
            subtitle="운영 중인 크루"
          />
          <StatCard
            title="진행중 미션"
            value={stats.activeMissions.toLocaleString()}
            icon="🎯"
            subtitle="활성 미션"
          />
          <StatCard
            title="총 기록"
            value={stats.totalRecords.toLocaleString()}
            icon="📝"
            subtitle="누적 러닝 기록"
          />
        </div>

        {/* 오늘의 활동 */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">오늘의 활동</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              title="신규 가입자"
              value={stats.todayUsers.toLocaleString()}
              icon="✨"
              change={{
                value: Math.abs(stats.usersChange),
                isPositive: stats.usersChangePositive,
              }}
            />
            <StatCard
              title="등록된 기록"
              value={stats.todayRecords.toLocaleString()}
              icon="📊"
              change={{
                value: Math.abs(stats.recordsChange),
                isPositive: stats.recordsChangePositive,
              }}
            />
          </div>
        </div>

        {/* 관리 메뉴 */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">빠른 관리</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              onClick={() => router.push("/admin-dashboard/users")}
              className="cursor-pointer rounded-lg border border-border bg-background p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-4 text-4xl">👥</div>
              <h3 className="mb-2 text-xl font-semibold">사용자 관리</h3>
              <p className="text-sm text-muted-foreground">
                사용자 목록 조회 및 상세 정보 확인
              </p>
            </div>

            {/* 크루 관리 카드 */}
            <div
              onClick={() => router.push("/admin-dashboard/crews")}
              className="cursor-pointer rounded-lg border border-border bg-background p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-4 text-4xl">🏃</div>
              <h3 className="mb-2 text-xl font-semibold">크루 관리</h3>
              <p className="text-sm text-muted-foreground">
                크루 목록 조회 및 멤버 관리
              </p>
            </div>

            {/* 미션 관리 카드 */}
            <div
              onClick={() => router.push("/admin-dashboard/missions")}
              className="cursor-pointer rounded-lg border border-border bg-background p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-4 text-4xl">🎯</div>
              <h3 className="mb-2 text-xl font-semibold">미션 관리</h3>
              <p className="text-sm text-muted-foreground">
                미션 목록 조회 및 진행 상태 확인
              </p>
            </div>

            {/* 신고 관리 카드 */}
            <div className="cursor-not-allowed rounded-lg border border-border bg-background p-6 shadow-sm opacity-50">
              <div className="mb-4 text-4xl">🚨</div>
              <h3 className="mb-2 text-xl font-semibold">신고 관리</h3>
              <p className="text-sm text-muted-foreground">
                사용자 신고 내역 검토 및 처리 (준비 중)
              </p>
            </div>

            {/* 통계 카드 */}
            <div className="cursor-not-allowed rounded-lg border border-border bg-background p-6 shadow-sm opacity-50">
              <div className="mb-4 text-4xl">📈</div>
              <h3 className="mb-2 text-xl font-semibold">통계</h3>
              <p className="text-sm text-muted-foreground">
                사용자, 크루, 기록 등의 통계 정보 (준비 중)
              </p>
            </div>
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 최근 가입자 */}
          <div className="rounded-lg border border-border bg-background p-6">
            <h3 className="mb-4 font-semibold">최근 가입자</h3>
            {stats.recentUsers.length > 0 ? (
              <div className="space-y-3">
                {stats.recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {user.full_name || user.username}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        @{user.username}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-4">
                최근 가입자가 없습니다
              </div>
            )}
          </div>

          {/* 최근 기록 */}
          <div className="rounded-lg border border-border bg-background p-6">
            <h3 className="mb-4 font-semibold">최근 기록</h3>
            {stats.recentRecords.length > 0 ? (
              <div className="space-y-3">
                {stats.recentRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{record.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {record.profiles?.full_name || record.profiles?.username || "알 수 없음"} · {(record.distance / 1000).toFixed(2)}km
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(record.created_at).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-4">
                최근 기록이 없습니다
              </div>
            )}
          </div>
        </div>

        {/* 빠른 링크 */}
        <div className="rounded-lg border border-border bg-background p-6">
          <h3 className="mb-4 font-semibold">빠른 링크</h3>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://runningcrew.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:text-blue-600 hover:underline"
            >
              🔗 메인 서비스 바로가기
            </a>
            <a
              href="https://blzupvegyrakpkbhxhfp.supabase.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:text-blue-600 hover:underline"
            >
              🗄️ Supabase 대시보드
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
