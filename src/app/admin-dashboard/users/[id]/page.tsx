"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/admin/badge";

interface UserDetail {
  user: {
    id: string;
    username: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    bio: string | null;
    location: string | null;
    created_at: string;
  };
  crews: Array<{
    id: string;
    name: string;
    avatar_url: string | null;
    created_at: string;
  }>;
  records: Array<{
    id: string;
    title: string;
    distance: number;
    duration: number;
    created_at: string;
  }>;
  sanctions: Array<{
    id: string;
    type: string;
    reason: string;
    start_at: string;
    end_at: string | null;
    is_active: boolean;
    admin_users: { username: string } | null;
    created_at: string;
  }>;
  stats: {
    totalCrews: number;
    totalRecords: number;
    totalDistance: number;
  };
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/admin/session");
        const data = await response.json();

        if (!data.authenticated) {
          router.push("/admin-login");
          return;
        }

        setUsername(data.username);
        await loadUserDetail();
        setLoading(false);
      } catch (error) {
        console.error("세션 확인 오류:", error);
        router.push("/admin-login");
      }
    };

    checkSession();
  }, [router, userId]);

  const loadUserDetail = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserDetail(data);
      }
    } catch (error) {
      console.error("사용자 상세 정보 로드 오류:", error);
    }
  };

  const getSanctionBadge = (type: string) => {
    switch (type) {
      case "ban":
        return <Badge variant="danger">영구정지</Badge>;
      case "suspension":
        return <Badge variant="warning">일시정지</Badge>;
      case "warning":
        return <Badge variant="info">경고</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!userDetail) {
    return (
      <AdminLayout username={username}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">사용자를 찾을 수 없습니다.</p>
        </div>
      </AdminLayout>
    );
  }

  const { user, crews, records, sanctions, stats } = userDetail;

  return (
    <AdminLayout username={username}>
      <div className="space-y-6">
        {/* 뒤로 가기 */}
        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 목록으로 돌아가기
        </button>

        {/* 사용자 정보 헤더 */}
        <div className="rounded-lg border border-border bg-background p-6">
          <div className="flex items-start gap-6">
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.username}
                className="h-24 w-24 rounded-full"
              />
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{user.username}</h1>
              {user.full_name && (
                <p className="mt-1 text-lg text-muted-foreground">{user.full_name}</p>
              )}
              {user.email && (
                <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
              )}
              {user.location && (
                <p className="mt-1 text-sm text-muted-foreground">📍 {user.location}</p>
              )}
              {user.bio && (
                <p className="mt-3 text-sm">{user.bio}</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                가입일: {new Date(user.created_at).toLocaleDateString("ko-KR")}
              </p>
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="가입한 크루"
            value={stats.totalCrews.toString()}
            icon="🏃"
          />
          <StatCard
            title="등록한 기록"
            value={stats.totalRecords.toString()}
            icon="📝"
          />
          <StatCard
            title="총 러닝 거리"
            value={`${(stats.totalDistance / 1000).toFixed(1)}km`}
            icon="🎯"
          />
        </div>

        {/* 크루 목록 */}
        <div className="rounded-lg border border-border bg-background p-6">
          <h2 className="mb-4 text-lg font-semibold">가입한 크루</h2>
          {crews.length > 0 ? (
            <div className="space-y-3">
              {crews.map((crew) => (
                <div
                  key={crew.id}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {crew.avatar_url && (
                      <img
                        src={crew.avatar_url}
                        alt={crew.name}
                        className="h-10 w-10 rounded-full"
                      />
                    )}
                    <div>
                      <div className="font-medium">{crew.name}</div>
                      <div className="text-xs text-muted-foreground">
                        가입: {new Date(crew.created_at).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/admin-dashboard/crews/${crew.id}`)}
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    상세보기 →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              가입한 크루가 없습니다
            </p>
          )}
        </div>

        {/* 최근 기록 */}
        <div className="rounded-lg border border-border bg-background p-6">
          <h2 className="mb-4 text-lg font-semibold">최근 기록</h2>
          {records.length > 0 ? (
            <div className="space-y-3">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                >
                  <div>
                    <div className="font-medium">{record.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {(record.distance / 1000).toFixed(2)}km · {Math.floor(record.duration / 60)}분 · {new Date(record.created_at).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/admin-dashboard/records?recordId=${record.id}`)}
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    상세보기 →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              등록한 기록이 없습니다
            </p>
          )}
        </div>

        {/* 제재 이력 */}
        <div className="rounded-lg border border-border bg-background p-6">
          <h2 className="mb-4 text-lg font-semibold">제재 이력</h2>
          {sanctions.length > 0 ? (
            <div className="space-y-3">
              {sanctions.map((sanction) => (
                <div
                  key={sanction.id}
                  className="border-b border-border pb-3 last:border-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getSanctionBadge(sanction.type)}
                        {sanction.is_active && (
                          <Badge variant="danger" size="sm">활성</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium mb-1">{sanction.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        관리자: {sanction.admin_users?.username || "알 수 없음"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        시작: {new Date(sanction.start_at).toLocaleDateString("ko-KR")}
                        {sanction.end_at && ` ~ 종료: ${new Date(sanction.end_at).toLocaleDateString("ko-KR")}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              제재 이력이 없습니다
            </p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
