"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/admin/badge";

interface CrewDetail {
  crew: {
    id: string;
    name: string;
    description: string | null;
    avatar_url: string | null;
    is_public: boolean;
    max_members: number | null;
    location: string | null;
    tags: string[] | null;
    created_at: string;
  };
  leader: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  members: Array<{
    userId: string;
    role: string;
    joinedAt: string;
    profile: {
      id: string;
      username: string;
      full_name: string | null;
      avatar_url: string | null;
    };
  }>;
  missions: Array<{
    id: string;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
    goal_type: string;
    goal_value: number;
  }>;
  recentMembers: Array<{
    joined_at: string;
    profiles: {
      username: string;
      full_name: string | null;
    };
  }>;
  stats: {
    totalMembers: number;
    totalMissions: number;
    activeMissions: number;
  };
}

export default function CrewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const crewId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [crewDetail, setCrewDetail] = useState<CrewDetail | null>(null);

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
        await loadCrewDetail();
        setLoading(false);
      } catch (error) {
        console.error("세션 확인 오류:", error);
        router.push("/admin-login");
      }
    };

    checkSession();
  }, [router, crewId]);

  const loadCrewDetail = async () => {
    try {
      const response = await fetch(`/api/admin/crews/${crewId}`);
      if (response.ok) {
        const data = await response.json();
        setCrewDetail(data);
      }
    } catch (error) {
      console.error("크루 상세 정보 로드 오류:", error);
    }
  };

  const getMissionStatus = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();

    if (end >= now) {
      return <Badge variant="success">진행중</Badge>;
    }
    return <Badge variant="default">종료</Badge>;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!crewDetail) {
    return (
      <AdminLayout username={username}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">크루를 찾을 수 없습니다.</p>
        </div>
      </AdminLayout>
    );
  }

  const { crew, leader, members, missions, recentMembers, stats } = crewDetail;

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

        {/* 크루 정보 헤더 */}
        <div className="rounded-lg border border-border bg-background p-6">
          <div className="flex items-start gap-6">
            {crew.avatar_url && (
              <img
                src={crew.avatar_url}
                alt={crew.name}
                className="h-24 w-24 rounded-full"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{crew.name}</h1>
                {crew.is_public ? (
                  <Badge variant="success">공개</Badge>
                ) : (
                  <Badge variant="default">비공개</Badge>
                )}
              </div>
              {crew.description && (
                <p className="mt-2 text-sm">{crew.description}</p>
              )}
              {crew.location && (
                <p className="mt-2 text-sm text-muted-foreground">📍 {crew.location}</p>
              )}
              {crew.tags && crew.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {crew.tags.map((tag, index) => (
                    <Badge key={index} size="sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                생성일: {new Date(crew.created_at).toLocaleDateString("ko-KR")}
                {crew.max_members && ` · 최대 인원: ${crew.max_members}명`}
              </p>
            </div>
          </div>
        </div>

        {/* 크루장 정보 */}
        {leader && (
          <div className="rounded-lg border border-border bg-background p-6">
            <h2 className="mb-4 text-lg font-semibold">크루장</h2>
            <div className="flex items-center gap-3">
              {leader.avatar_url && (
                <img
                  src={leader.avatar_url}
                  alt={leader.username}
                  className="h-12 w-12 rounded-full"
                />
              )}
              <div>
                <div className="font-medium">{leader.username}</div>
                {leader.full_name && (
                  <div className="text-sm text-muted-foreground">{leader.full_name}</div>
                )}
              </div>
              <button
                onClick={() => router.push(`/admin-dashboard/users/${leader.id}`)}
                className="ml-auto text-sm text-blue-500 hover:text-blue-600"
              >
                상세보기 →
              </button>
            </div>
          </div>
        )}

        {/* 통계 카드 */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="전체 멤버"
            value={stats.totalMembers.toString()}
            icon="👥"
            subtitle={crew.max_members ? `최대 ${crew.max_members}명` : undefined}
          />
          <StatCard
            title="전체 미션"
            value={stats.totalMissions.toString()}
            icon="🎯"
          />
          <StatCard
            title="진행중 미션"
            value={stats.activeMissions.toString()}
            icon="🔥"
          />
        </div>

        {/* 멤버 목록 */}
        <div className="rounded-lg border border-border bg-background p-6">
          <h2 className="mb-4 text-lg font-semibold">멤버 목록</h2>
          {members.length > 0 ? (
            <div className="space-y-3">
              {members.slice(0, 10).map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {member.profile.avatar_url && (
                      <img
                        src={member.profile.avatar_url}
                        alt={member.profile.username}
                        className="h-10 w-10 rounded-full"
                      />
                    )}
                    <div>
                      <div className="font-medium">{member.profile.username}</div>
                      {member.profile.full_name && (
                        <div className="text-xs text-muted-foreground">
                          {member.profile.full_name}
                        </div>
                      )}
                    </div>
                    <Badge size="sm" variant="info">
                      {member.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString("ko-KR")}
                    </div>
                    <button
                      onClick={() => router.push(`/admin-dashboard/users/${member.userId}`)}
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      상세보기 →
                    </button>
                  </div>
                </div>
              ))}
              {members.length > 10 && (
                <p className="text-center text-sm text-muted-foreground pt-2">
                  + {members.length - 10}명 더보기
                </p>
              )}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              멤버가 없습니다
            </p>
          )}
        </div>

        {/* 미션 목록 */}
        <div className="rounded-lg border border-border bg-background p-6">
          <h2 className="mb-4 text-lg font-semibold">미션 목록</h2>
          {missions.length > 0 ? (
            <div className="space-y-3">
              {missions.map((mission) => (
                <div
                  key={mission.id}
                  className="flex items-start justify-between border-b border-border pb-3 last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium">{mission.title}</div>
                      {getMissionStatus(mission.end_date)}
                    </div>
                    {mission.description && (
                      <p className="text-sm text-muted-foreground mb-1">
                        {mission.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(mission.start_date).toLocaleDateString("ko-KR")} ~{" "}
                      {new Date(mission.end_date).toLocaleDateString("ko-KR")}
                      {" · "}
                      목표: {mission.goal_type === "distance" ? `${mission.goal_value}km` : `${mission.goal_value}회`}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/admin-dashboard/missions/${mission.id}`)}
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    상세보기 →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              미션이 없습니다
            </p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
