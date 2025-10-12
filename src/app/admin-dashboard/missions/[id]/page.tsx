"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/admin/badge";

interface MissionDetail {
  mission: {
    id: string;
    title: string;
    description: string | null;
    crew_id: string;
    start_date: string;
    end_date: string;
    goal_type: string;
    goal_value: number;
    reward_points: number | null;
    created_at: string;
  };
  crew: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  participants: Array<{
    userId: string;
    progress: number;
    completed: boolean;
    joinedAt: string;
    profile: {
      id: string;
      username: string;
      full_name: string | null;
      avatar_url: string | null;
    };
  }>;
  stats: {
    totalParticipants: number;
    completedParticipants: number;
    averageProgress: number;
    completionRate: number;
  };
}

export default function MissionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const missionId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [missionDetail, setMissionDetail] = useState<MissionDetail | null>(null);

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
        await loadMissionDetail();
        setLoading(false);
      } catch (error) {
        console.error("세션 확인 오류:", error);
        router.push("/admin-login");
      }
    };

    checkSession();
  }, [router, missionId]);

  const loadMissionDetail = async () => {
    try {
      const response = await fetch(`/api/admin/missions/${missionId}`);
      if (response.ok) {
        const data = await response.json();
        setMissionDetail(data);
      }
    } catch (error) {
      console.error("미션 상세 정보 로드 오류:", error);
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

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-green-500";
    if (progress >= 75) return "bg-blue-500";
    if (progress >= 50) return "bg-orange-500";
    return "bg-gray-300";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!missionDetail) {
    return (
      <AdminLayout username={username}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">미션을 찾을 수 없습니다.</p>
        </div>
      </AdminLayout>
    );
  }

  const { mission, crew, participants, stats } = missionDetail;

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

        {/* 미션 정보 헤더 */}
        <div className="rounded-lg border border-border bg-background p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{mission.title}</h1>
                {getMissionStatus(mission.end_date)}
              </div>
              {mission.description && (
                <p className="text-sm mb-4">{mission.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div>
                  📅 {new Date(mission.start_date).toLocaleDateString("ko-KR")} ~{" "}
                  {new Date(mission.end_date).toLocaleDateString("ko-KR")}
                </div>
                <div>
                  🎯 목표:{" "}
                  {mission.goal_type === "distance"
                    ? `${mission.goal_value}km`
                    : `${mission.goal_value}회`}
                </div>
                {mission.reward_points && (
                  <div>🏆 보상: {mission.reward_points}P</div>
                )}
              </div>
            </div>
          </div>

          {/* 크루 정보 */}
          {crew && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-3">
                {crew.avatar_url && (
                  <img
                    src={crew.avatar_url}
                    alt={crew.name}
                    className="h-10 w-10 rounded-full"
                  />
                )}
                <div>
                  <div className="text-xs text-muted-foreground">소속 크루</div>
                  <div className="font-medium">{crew.name}</div>
                </div>
                <button
                  onClick={() => router.push(`/admin-dashboard/crews/${crew.id}`)}
                  className="ml-auto text-sm text-blue-500 hover:text-blue-600"
                >
                  크루 상세보기 →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 통계 카드 */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="전체 참가자"
            value={stats.totalParticipants.toString()}
            icon="👥"
          />
          <StatCard
            title="완료자"
            value={stats.completedParticipants.toString()}
            icon="✅"
          />
          <StatCard
            title="평균 진행률"
            value={`${stats.averageProgress}%`}
            icon="📊"
          />
          <StatCard
            title="완료율"
            value={`${stats.completionRate}%`}
            icon="🎯"
          />
        </div>

        {/* 참가자 목록 */}
        <div className="rounded-lg border border-border bg-background p-6">
          <h2 className="mb-4 text-lg font-semibold">참가자 목록</h2>
          {participants.length > 0 ? (
            <div className="space-y-4">
              {participants.map((participant) => (
                <div
                  key={participant.userId}
                  className="border-b border-border pb-4 last:border-0"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {participant.profile.avatar_url && (
                        <img
                          src={participant.profile.avatar_url}
                          alt={participant.profile.username}
                          className="h-10 w-10 rounded-full"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">
                            {participant.profile.username}
                          </div>
                          {participant.completed && (
                            <Badge variant="success" size="sm">
                              완료
                            </Badge>
                          )}
                        </div>
                        {participant.profile.full_name && (
                          <div className="text-xs text-muted-foreground">
                            {participant.profile.full_name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">
                        {participant.progress}%
                      </div>
                      <button
                        onClick={() =>
                          router.push(
                            `/admin-dashboard/users/${participant.userId}`
                          )
                        }
                        className="text-sm text-blue-500 hover:text-blue-600"
                      >
                        상세보기 →
                      </button>
                    </div>
                  </div>
                  {/* 진행률 바 */}
                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor(
                        participant.progress
                      )}`}
                      style={{ width: `${Math.min(participant.progress, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              참가자가 없습니다
            </p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
