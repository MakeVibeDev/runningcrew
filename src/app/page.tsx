"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useSupabase } from "@/components/providers/supabase-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchUserParticipatingMissions,
  fetchUserRecentRecords,
  fetchUserOverallStats,
  fetchCrewList,
  fetchMissionList,
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

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ko", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateString));
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

export default function Home() {
  const { user, loading, profile } = useSupabase();
  const [missions, setMissions] = useState<Awaited<ReturnType<typeof fetchUserParticipatingMissions>>>([]);
  const [recentRecords, setRecentRecords] = useState<Awaited<ReturnType<typeof fetchUserRecentRecords>>>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchUserOverallStats>> | null>(null);
  const [publicCrews, setPublicCrews] = useState<Awaited<ReturnType<typeof fetchCrewList>>>([]);
  const [publicMissions, setPublicMissions] = useState<Awaited<ReturnType<typeof fetchMissionList>>>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // 비로그인 사용자용 데이터 로드
      setDataLoading(true);
      Promise.all([
        fetchCrewList(),
        fetchMissionList(),
      ])
        .then(([crewsData, missionsData]) => {
          console.log("Public crews:", crewsData);
          console.log("Public missions:", missionsData);
          setPublicCrews(crewsData.slice(0, 3)); // 상위 3개만
          setPublicMissions(missionsData.slice(0, 3)); // 상위 3개만
        })
        .catch((error) => {
          console.error("Failed to fetch public data:", error);
        })
        .finally(() => {
          setDataLoading(false);
        });
      return;
    }

    // 로그인 사용자용 데이터 로드
    setDataLoading(true);
    Promise.all([
      fetchUserParticipatingMissions(user.id),
      fetchUserRecentRecords(user.id, 5),
      fetchUserOverallStats(user.id),
    ])
      .then(([missionsData, recordsData, statsData]) => {
        setMissions(missionsData);
        setRecentRecords(recordsData);
        setStats(statsData);
      })
      .catch((error) => {
        console.error("Failed to fetch dashboard data:", error);
      })
      .finally(() => {
        setDataLoading(false);
      });
  }, [user]);

  return (
    <div className="min-h-screen bg-muted/40 pb-16">
      <main className="mx-auto max-w-6xl px-6 py-10">
        {loading || dataLoading ? (
          <section className="rounded-2xl border border-border/70 bg-card/80 p-10 text-center shadow-sm">
            <p className="text-muted-foreground">데이터를 불러오는 중...</p>
          </section>
        ) : !user ? (
          <>
            {/* 랜딩 페이지 - 비로그인 사용자용 */}
            <section className="mb-12 text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                함께 달리는 즐거움
              </h1>
              <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
                러닝 크루와 함께 미션을 완수하고 기록을 공유하세요
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href="/auth/login"
                  className="rounded-full bg-foreground px-8 py-3 text-base font-semibold text-background shadow-sm hover:opacity-90"
                >
                  카카오 계정으로 시작하기
                </Link>
                <Link
                  href="/crews"
                  className="rounded-full border border-border bg-background px-8 py-3 text-base font-semibold hover:bg-muted"
                >
                  크루 둘러보기
                </Link>
              </div>
            </section>

            {/* 주요 기능 소개 */}
            <section className="mb-12 grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="mb-2 text-4xl">🏃</div>
                  <CardTitle>러닝 크루</CardTitle>
                  <CardDescription>
                    같은 목표를 가진 러너들과 함께 달리세요
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="mb-2 text-4xl">🎯</div>
                  <CardTitle>미션 챌린지</CardTitle>
                  <CardDescription>
                    크루별 미션에 참여하고 목표를 달성하세요
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="mb-2 text-4xl">📊</div>
                  <CardTitle>기록 관리</CardTitle>
                  <CardDescription>
                    러닝 기록을 업로드하고 통계를 확인하세요
                  </CardDescription>
                </CardHeader>
              </Card>
            </section>

            {/* 크루 & 미션 미리보기 */}
            <section className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>인기 크루</CardTitle>
                  <CardDescription>활발하게 활동 중인 러닝 크루들</CardDescription>
                </CardHeader>
                <CardContent>
                  {publicCrews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">크루 목록을 불러오는 중...</p>
                  ) : (
                    <div className="space-y-3">
                      {publicCrews.map((crew, index) => (
                        <div key={`crew-${crew.id}-${index}`}>
                          <Link
                            href={`/crews/${crew.slug}`}
                            className="group relative block overflow-hidden rounded-lg border border-border/60 transition hover:border-border"
                          >
                            {/* 블러 배경 */}
                            {crew.logoImageUrl && (
                              <div className="absolute inset-0 -z-10">
                                <Image
                                  src={crew.logoImageUrl}
                                  alt=""
                                  fill
                                  className="scale-110 object-cover opacity-20 blur-2xl saturate-150"
                                  sizes="400px"
                                />
                              </div>
                            )}

                            {/* 컨텐츠 */}
                            <div className="relative bg-background/80 p-4 backdrop-blur-sm">
                              <div className="flex items-start gap-3">
                                {/* 크루 로고 */}
                                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
                                  {crew.logoImageUrl ? (
                                    <Image
                                      src={crew.logoImageUrl}
                                      alt={crew.name}
                                      fill
                                      className="object-cover"
                                      sizes="48px"
                                    />
                                  ) : (
                                    <div className="grid h-full w-full place-items-center text-lg font-bold text-muted-foreground">
                                      {crew.name.charAt(0)}
                                    </div>
                                  )}
                                </div>

                                {/* 크루 정보 */}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold">{crew.name}</h3>
                                    <span className="text-xs text-muted-foreground">
                                      {crew.memberCount}명
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {crew.activityRegion}
                                  </p>
                                </div>

                                {/* 리더 프로필 */}
                                <div className="relative flex-shrink-0">
                                  <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-border/60 bg-muted">
                                    {crew.ownerProfile?.avatar_url ? (
                                      <Image
                                        src={crew.ownerProfile.avatar_url}
                                        alt={crew.ownerProfile.display_name ?? "리더"}
                                        fill
                                        className="object-cover"
                                        sizes="40px"
                                      />
                                    ) : (
                                      <div className="grid h-full w-full place-items-center text-sm font-semibold text-muted-foreground">
                                        {crew.ownerProfile?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                                      </div>
                                    )}
                                  </div>
                                  <span className="absolute -right-1 -top-1 text-sm">⭐</span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </div>
                      ))}
                      <Link
                        href="/crews"
                        className="block rounded-lg border border-border px-4 py-3 text-center text-sm font-medium hover:bg-muted"
                      >
                        모든 크루 보기
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>진행 중인 미션</CardTitle>
                  <CardDescription>지금 참여할 수 있는 미션들</CardDescription>
                </CardHeader>
                <CardContent>
                  {publicMissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">미션 목록을 불러오는 중...</p>
                  ) : (
                    <div className="space-y-3">
                      {publicMissions.map((mission, index) => (
                        <div key={`mission-${mission.id}-${index}`}>
                          <Link
                            href={`/missions/${mission.id}`}
                            className="block rounded-lg border border-border/60 bg-background/80 p-4 transition hover:bg-muted/40"
                          >
                            <div className="flex-1">
                              <h3 className="font-semibold">{mission.title}</h3>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {mission.crew?.name} · {mission.participantsCount}명 참여
                              </p>
                            </div>
                          </Link>
                        </div>
                      ))}
                      <Link
                        href="/missions"
                        className="block rounded-lg border border-border px-4 py-3 text-center text-sm font-medium hover:bg-muted"
                      >
                        모든 미션 보기
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        ) : (
          <>
            {/* 통계 요약 카드 */}
            <section className="mb-8">
              <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/20 dark:to-background">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-border/60 bg-muted text-sm font-semibold uppercase text-muted-foreground">
                      {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                        <Image
                          src={profile?.avatar_url || (user?.user_metadata?.avatar_url as string)}
                          alt="프로필"
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-emerald-500/10 text-2xl text-emerald-700">
                          {(profile?.display_name || user?.email || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-2xl">
                        {profile?.display_name || user?.email || "러너"}님의 대시보드
                      </CardTitle>
                      <CardDescription>전체 미션 활동 요약</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">총 기록 수</p>
                      <p className="text-4xl font-bold tracking-tight">{stats?.totalRecords ?? 0}</p>
                      <p className="text-xs text-muted-foreground">전체 활동 횟수</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">총 누적 거리</p>
                      <p className="text-4xl font-bold tracking-tight">
                        {stats?.totalDistanceKm.toFixed(1) ?? 0}
                        <span className="ml-1 text-2xl font-normal text-muted-foreground">km</span>
                      </p>
                      <p className="text-xs text-muted-foreground">전체 미션 합산</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">총 활동 시간</p>
                      <p className="text-4xl font-bold tracking-tight">
                        {formatDuration(stats?.totalDurationSeconds ?? 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">전체 미션 합산</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">평균 페이스</p>
                      <p className="text-4xl font-bold tracking-tight">
                        {stats?.avgPaceSecondsPerKm ? formatPace(stats.avgPaceSecondsPerKm) : "-"}
                        <span className="ml-1 text-2xl font-normal text-muted-foreground">/km</span>
                      </p>
                      <p className="text-xs text-muted-foreground">전체 평균</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>참여 중인 미션</CardTitle>
                  <CardDescription>
                    현재 참여하고 있는 미션 목록입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {missions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      참여 중인 미션이 없습니다.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {missions.map((mission) => (
                        <Link
                          key={mission.id}
                          href={`/missions/${mission.id}`}
                          className="block rounded-xl border border-border/60 bg-background/80 p-4 transition hover:bg-muted/40"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {mission.crew?.name ?? "크루 정보 없음"}
                              </p>
                              <h3 className="text-lg font-semibold">{mission.title}</h3>
                            </div>
                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                              진행 중
                            </span>
                          </div>
                          <div className="mt-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                                기간
                              </p>
                              <p>{formatDateRange(mission.startDate, mission.endDate)}</p>
                            </div>
                            {mission.targetDistanceKm && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                                  목표
                                </p>
                                <p>{mission.targetDistanceKm} km</p>
                              </div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>최근 업로드 기록</CardTitle>
                      <CardDescription>
                        최근 등록한 러닝 기록입니다.
                      </CardDescription>
                    </div>
                    <Link
                      href="/records/upload"
                      className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
                    >
                      기록 등록
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentRecords.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      아직 등록한 기록이 없습니다.
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-border/60">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">날짜</th>
                            <th className="px-4 py-3">미션</th>
                            <th className="px-4 py-3">거리</th>
                            <th className="px-4 py-3">페이스</th>
                            <th className="px-4 py-3">시간</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentRecords.map((record) => (
                            <tr key={record.id} className="border-t border-border/60">
                              <td className="px-4 py-3 text-sm font-medium text-foreground">
                                {formatDate(record.recordedAt)}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {record.mission && typeof record.mission === 'object' && 'title' in record.mission
                                  ? record.mission.title
                                  : "미션 정보 없음"}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium">
                                {record.distanceKm.toFixed(2)} km
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {formatPace(record.paceSecondsPerKm)} /km
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {formatDuration(record.durationSeconds)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="mt-8 grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>크루 탐색</CardTitle>
                  <CardDescription>
                    새로운 러닝 크루를 찾아보세요.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/crews"
                    className="block rounded-lg border border-border px-4 py-3 text-center text-sm font-medium hover:bg-muted"
                  >
                    크루 목록 보기
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>미션 탐색</CardTitle>
                  <CardDescription>
                    진행 중인 미션을 확인하세요.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/missions"
                    className="block rounded-lg border border-border px-4 py-3 text-center text-sm font-medium hover:bg-muted"
                  >
                    미션 목록 보기
                  </Link>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
