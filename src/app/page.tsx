"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useSupabase } from "@/components/providers/supabase-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KakaoLoginButton } from "@/components/ui/oauth-button";
import {
  fetchUserParticipatingMissions,
  fetchUserRecentRecords,
  fetchUserOverallStats,
  fetchCrewList,
  fetchMissionList,
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

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}.${month}.${day} ${hours}:${minutes}`;
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
  const { user, loading, profile, signInWithOAuth } = useSupabase();
  const [missions, setMissions] = useState<Awaited<ReturnType<typeof fetchUserParticipatingMissions>>>([]);
  const [recentRecords, setRecentRecords] = useState<Awaited<ReturnType<typeof fetchUserRecentRecords>>>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchUserOverallStats>> | null>(null);
  const [joinedCrews, setJoinedCrews] = useState<Awaited<ReturnType<typeof fetchUserJoinedCrews>>>([]);
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
      fetchUserJoinedCrews(user.id),
    ])
      .then(([missionsData, recordsData, statsData, crewsData]) => {
        setMissions(missionsData);
        setRecentRecords(recordsData);
        setStats(statsData);
        setJoinedCrews(crewsData);
      })
      .catch((error) => {
        console.error("Failed to fetch dashboard data:", error);
      })
      .finally(() => {
        setDataLoading(false);
      });
  }, [user]);

  return (
    <div className="min-h-screen bg-muted/40 pb-4">
      <main className="mx-auto max-w-6xl px-2 py-0">
        {loading || dataLoading ? (
          <section className="rounded-2xl border border-border/70 bg-card/80 p-10 text-center shadow-sm">
            <p className="text-muted-foreground">데이터를 불러오는 중...</p>
          </section>
        ) : !user ? (
          <>
            {/* 랜딩 페이지 - 비로그인 사용자용 */}
            <section className="mb-12 text-center mt-8">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                함께 달리는 즐거움
              </h1>
              <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
                러닝 크루와 함께 미션을 완수하고 기록을 공유하세요
              </p>
              <div className="mt-8 flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  카카오 계정으로 시작하기
                </p>
                <KakaoLoginButton
                  onClick={() => {
                    void signInWithOAuth("kakao");
                  }}
                  disabled={loading}
                />
                <Link
                  href="/crews"
                  className="mt-2 rounded-full border border-border bg-background px-8 py-3 text-base font-semibold hover:bg-muted"
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
            <section className="m-4">
              <Card className="relative overflow-hidden border-border/70">
                {/* 블러 배경 - YouTube Music 스타일 */}
                {(profile?.avatar_url || user?.user_metadata?.avatar_url) && (
                  <div className="absolute inset-0">
                    {/* 확대된 블러 배경 이미지 */}
                    <Image
                      src={profile?.avatar_url || (user?.user_metadata?.avatar_url as string)}
                      alt=""
                      fill
                      className="scale-[2] object-cover blur-[120px] saturate-[2.5] brightness-[1.3]"
                      sizes="1200px"
                      priority
                    />
                    {/* 그라데이션 오버레이 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-background/30 via-background/50 to-background/70" />
                  </div>
                )}

                {/* 컨텐츠 */}
                <div className="relative backdrop-blur-sm">
                  <CardHeader className="pb-6">
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-white/20 bg-muted shadow-lg ring-4 ring-black/5">
                        {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                          <Image
                            src={profile?.avatar_url || (user?.user_metadata?.avatar_url as string)}
                            alt="프로필"
                            fill
                            sizes="80px"
                            className="object-cover"
                            priority
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-emerald-500/10 text-2xl text-emerald-700">
                            {(profile?.display_name || user?.email || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold">
                          {profile?.display_name || user?.email || "러너"}님의 대시보드
                        </CardTitle>
                        <CardDescription className="mt-1">전체 미션 활동 요약</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-6">
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
                </div>
              </Card>
            </section>

            <div>
              <section className="mt-1 bg-white px-4 py-4 shadow-[0_1px_0_0_rgba(0,0,0,0.1)] border border-gray-100">
                <div>
                  <h2 className="text-2xl font-bold">참여 중인 미션</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    현재 참여하고 있는 미션 목록입니다.
                  </p>
                </div>
                {missions.length === 0 ? (
                  <div className="rounded-2xl border border-border/40 bg-muted/30 p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      참여 중인 미션이 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {missions.map((mission) => (
                      <Link
                        key={mission.id}
                        href={`/missions/${mission.id}`}
                        className="block rounded-2xl border border-border/40 bg-muted/30 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
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
              </section>

              <section className="mt-1 space-y-4 mt-1 bg-white px-4 py-4 shadow-[0_1px_0_0_rgba(0,0,0,0.1)] border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">최근 업로드 기록</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      최근 등록한 러닝 기록입니다.
                    </p>
                  </div>
                  <Link
                    href="/records/upload"
                    className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
                  >
                    기록 등록
                  </Link>
                </div>
                {recentRecords.length === 0 ? (
                  <div className="rounded-2xl border border-border/40 bg-background p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <p className="text-sm text-muted-foreground">
                      아직 등록한 기록이 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentRecords.map((record) => (
                      <div
                        key={record.id}
                        className="group relative overflow-hidden rounded-2xl border border-border/40 bg-background p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                      >
                        {/* 배경 장식 */}
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/5 transition-all group-hover:scale-110" />

                        <div className="relative flex items-center gap-4">
                          {/* 왼쪽: 거리 강조 */}
                          <div className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 ring-1 ring-emerald-500/20">
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                              {record.distanceKm.toFixed(1)}
                            </div>
                            <div className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70">
                              km
                            </div>
                          </div>

                          {/* 오른쪽: 정보 */}
                          <div className="flex-1 space-y-2">
                            {/* 첫 번째 줄: 날짜와 미션명 */}
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">
                                {formatDate(record.recordedAt)}
                              </span>
                              <span className="text-sm font-medium text-foreground">
                                {record.mission && typeof record.mission === 'object' && 'title' in record.mission
                                  ? record.mission.title
                                  : "미션 정보 없음"}
                              </span>
                            </div>

                            {/* 두 번째 줄: 페이스, 시간 */}
                            <div className="flex gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">⏱️</span>
                                <span className="font-semibold">{formatPace(record.paceSecondsPerKm)}</span>
                                <span className="text-xs text-muted-foreground">/km</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">🕐</span>
                                <span className="font-semibold">{formatDuration(record.durationSeconds)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-1 grid gap-0 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.1)] md:grid-cols-2 ">
                <div className="space-y-4 px-4 py-4 md:border-r md:border-border/40">
                  <div>
                    <h2 className="text-xl font-bold">크루 탐색</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      새로운 러닝 크루를 찾아보세요.
                    </p>
                  </div>
                  {joinedCrews.length > 0 && (
                    <div>
                      <p className="mb-3 text-sm font-medium text-muted-foreground">가입한 크루</p>
                      <div className="flex flex-wrap gap-3">
                        {joinedCrews.map((crew) => (
                          <Link
                            key={crew.id}
                            href={`/crews/${crew.slug}`}
                            className="group flex flex-col items-center gap-2"
                            title={crew.name}
                          >
                            <div className="relative h-16 w-16 overflow-hidden rounded-xl border-2 border-border/60 bg-muted transition-all group-hover:scale-105 group-hover:border-foreground/40">
                              {crew.logoImageUrl ? (
                                <Image
                                  src={crew.logoImageUrl}
                                  alt={crew.name}
                                  fill
                                  className="object-cover"
                                  sizes="64px"
                                />
                              ) : (
                                <div className="grid h-full w-full place-items-center text-lg font-bold text-muted-foreground">
                                  {crew.name.substring(0, 2)}
                                </div>
                              )}
                            </div>
                            <span className="w-16 truncate text-center text-xs text-muted-foreground">
                              {crew.name}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  <Link
                    href="/crews"
                    className="block rounded-lg border border-border px-4 py-3 text-center text-sm font-medium hover:bg-muted"
                  >
                    크루 목록 보기
                  </Link>
                </div>
              </section>
              
              <section className="mt-1 grid gap-0 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.1)] md:grid-cols-2 ">
                <div className="space-y-4 px-4 py-4 my-2">
                  <div>
                    <h2 className="text-xl font-bold">미션 탐색</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      진행 중인 미션을 확인하세요.
                    </p>
                  </div>
                  <Link
                    href="/missions"
                    className="block rounded-lg border border-border px-4 py-3 text-center text-sm font-medium hover:bg-muted"
                  >
                    미션 목록 보기
                  </Link>
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
