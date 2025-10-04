"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useSupabase } from "@/components/providers/supabase-provider";
import { RecordCard } from "@/components/record-card";
import {
  fetchUserParticipatingMissions,
  fetchUserOverallStats,
  fetchUserJoinedCrews,
} from "@/lib/supabase/rest";

function formatDuration(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return hrs > 0 ? `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatPace(paceSeconds?: number | null) {
  if (!paceSeconds || paceSeconds <= 0) return "-";
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}'${secs.toString().padStart(2, "0")}"`;
}

function formatDateRange(start: string, end: string) {
  const startDate = new Intl.DateTimeFormat("ko", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(start));
  const endDate = new Intl.DateTimeFormat("ko", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(end));
  return `${startDate} - ${endDate}`;
}

export default function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params);
  const { user, loading: authLoading } = useSupabase();
  const [profileUser, setProfileUser] = useState<{ id: string; display_name: string; avatar_url?: string | null } | null>(null);
  const [missions, setMissions] = useState<Awaited<ReturnType<typeof fetchUserParticipatingMissions>>>([]);
  const [recentRecords, setRecentRecords] = useState<Array<{
    id: string;
    recordedAt: string;
    distanceKm: number;
    durationSeconds: number;
    paceSecondsPerKm: number | null;
    visibility: string;
    createdAt: string;
    notes: string | null;
    imagePath: string | null;
    mission: { id: string; title: string } | null;
  }>>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchUserOverallStats>> | null>(null);
  const [joinedCrews, setJoinedCrews] = useState<Awaited<ReturnType<typeof fetchUserJoinedCrews>>>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const isOwnProfile = user?.id === resolvedParams.userId;

  useEffect(() => {
    async function loadProfileData() {
      setDataLoading(true);

      try {
        // 프로필 사용자 정보 조회
        const { getBrowserSupabaseClient } = await import("@/lib/supabase/browser-client");
        const supabase = getBrowserSupabaseClient();

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id,display_name,avatar_url")
          .eq("id", resolvedParams.userId)
          .single();

        if (profileError || !profileData) {
          console.error("Failed to load profile:", profileError);
          return;
        }

        setProfileUser(profileData);

        // 사용자 데이터 로드
        const [missionsData, statsData, crewsData] = await Promise.all([
          fetchUserParticipatingMissions(resolvedParams.userId),
          fetchUserOverallStats(resolvedParams.userId),
          fetchUserJoinedCrews(resolvedParams.userId),
        ]);

        // 기록 조회 (본인: 모든 기록, 타인: 공개 기록만)
        const recordsQuery = supabase
          .from("records")
          .select("id,recorded_at,distance_km,duration_seconds,pace_seconds_per_km,visibility,created_at,image_path,notes,mission:missions(id,title,crew:crews(name))")
          .eq("profile_id", resolvedParams.userId)
          .order("created_at", { ascending: false })
          .limit(10);

        // 타인의 프로필인 경우 공개 기록만 필터링
        if (!isOwnProfile) {
          recordsQuery.eq("visibility", "public");
        }

        const { data: recordsData, error: recordsError } = await recordsQuery;

        if (recordsError) {
          console.error("Failed to load records:", recordsError);
        }

        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedRecords = (recordsData || []).map((record: any) => ({
          id: record.id,
          recordedAt: record.recorded_at,
          distanceKm: record.distance_km,
          durationSeconds: record.duration_seconds,
          paceSecondsPerKm: record.pace_seconds_per_km,
          visibility: record.visibility,
          createdAt: record.created_at,
          notes: record.notes,
          imagePath: record.image_path && SUPABASE_URL
            ? `${SUPABASE_URL}/storage/v1/object/public/records-raw/${record.image_path}`
            : null,
          mission: record.mission,
        }));

        setMissions(missionsData);
        setRecentRecords(formattedRecords);
        setStats(statsData);
        setJoinedCrews(crewsData);
      } catch (error) {
        console.error("Failed to fetch profile data:", error);
      } finally {
        setDataLoading(false);
      }
    }

    void loadProfileData();
  }, [resolvedParams.userId, isOwnProfile]);

  if (authLoading || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">사용자를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 pb-4">
      <main className="mx-auto max-w-6xl px-0 py-0">
        {/* 프로필 헤더 */}
        <section className="bg-background p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-border/60 bg-muted">
              {profileUser.avatar_url ? (
                <Image
                  src={profileUser.avatar_url}
                  alt={profileUser.display_name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-3xl font-bold text-muted-foreground">
                  {profileUser.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{profileUser.display_name}</h1>
              {isOwnProfile && (
                <Link
                  href="/profile"
                  className="mt-2 inline-block text-sm text-muted-foreground hover:text-foreground"
                >
                  프로필 수정 →
                </Link>
              )}
            </div>
          </div>

          {/* 통계 */}
          {stats && (
            <div className="mt-6 grid grid-cols-3 gap-4 rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">총 거리</p>
                <p className="mt-1 text-xl font-bold">{stats.totalDistanceKm.toFixed(1)} km</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">총 시간</p>
                <p className="mt-1 text-xl font-bold">{formatDuration(stats.totalDurationSeconds)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">평균 페이스</p>
                <p className="mt-1 text-xl font-bold">{formatPace(stats.avgPaceSecondsPerKm)}</p>
              </div>
            </div>
          )}
        </section>

        {/* 참여 중인 크루 */}
        {joinedCrews.length > 0 && (
          <section className="mt-1 bg-white px-4 py-6 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
            <div>
              <h2 className="text-xl font-bold">참여 중인 크루</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {joinedCrews.length}개의 크루에 참여 중입니다.
              </p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {joinedCrews.map((crew) => (
                <Link
                  key={crew.id}
                  href={`/crews/${crew.slug}`}
                  className="block overflow-hidden rounded-2xl border border-border/40 bg-background shadow-sm transition hover:shadow-md"
                >
                  <div className="relative h-32 w-full bg-gradient-to-br from-muted/50 to-muted">
                    {crew.logoImageUrl && (
                      <Image src={crew.logoImageUrl} alt={crew.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{crew.name}</h3>
                      <span className="text-xs text-muted-foreground">{crew.memberCount}명</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{crew.activityRegion}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 참여 중인 미션 */}
        {missions.length > 0 && (
          <section className="mt-1 bg-white px-4 py-6 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
            <div>
              <h2 className="text-xl font-bold">참여 중인 미션</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                현재 참여하고 있는 미션 목록입니다.
              </p>
            </div>

            <div className="mt-4 space-y-4">
              {missions.map((mission) => (
                <Link
                  key={mission.id}
                  href={`/missions/${mission.id}`}
                  className="block rounded-2xl border border-border/40 bg-background p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{mission.title}</h3>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            mission.status === "active"
                              ? "bg-green-100 text-green-700"
                              : mission.status === "upcoming"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {mission.status === "active" ? "진행중" : mission.status === "upcoming" ? "예정" : "종료"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{mission.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span>📍 {mission.crewName}</span>
                        <span>📅 {formatDateRange(mission.startDate, mission.endDate)}</span>
                        <span>🎯 {mission.targetDistanceKm}km 목표</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 최근 업로드 기록 */}
        <section className="mt-1 bg-white px-4 py-6 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
          <div>
            <h2 className="text-xl font-bold">최근 업로드 기록</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isOwnProfile ? "최근 업로드한 기록입니다." : "최근 공개 기록입니다."}
            </p>
          </div>

          {recentRecords.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-border/60 bg-muted/30 p-8 text-center">
              <p className="text-sm text-muted-foreground">아직 업로드한 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {recentRecords.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  showUserInfo={false}
                  showEditLink={isOwnProfile}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
