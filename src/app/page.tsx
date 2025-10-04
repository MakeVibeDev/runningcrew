"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSupabase } from "@/components/providers/supabase-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KakaoLoginButton } from "@/components/ui/oauth-button";
import {
  fetchCrewList,
  fetchMissionList,
} from "@/lib/supabase/rest";

export default function Home() {
  const { user, loading, signInWithOAuth } = useSupabase();
  const router = useRouter();
  const [publicCrews, setPublicCrews] = useState<Awaited<ReturnType<typeof fetchCrewList>>>([]);
  const [publicMissions, setPublicMissions] = useState<Awaited<ReturnType<typeof fetchMissionList>>>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // 로그인한 사용자는 본인 프로필 대시보드로 리다이렉트
  useEffect(() => {
    if (!loading && user) {
      router.push(`/profile/${user.id}`);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) {
      // 비로그인 사용자용 데이터 로드
      setDataLoading(true);
      Promise.all([
        fetchCrewList(),
        fetchMissionList(),
      ])
        .then(([crewsData, missionsData]) => {
          setPublicCrews(crewsData.slice(0, 3)); // 상위 3개만
          setPublicMissions(missionsData.slice(0, 3)); // 상위 3개만
        })
        .catch((error) => {
          console.error("Failed to fetch public data:", error);
        })
        .finally(() => {
          setDataLoading(false);
        });
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-muted/40 pb-4">
      <main className="mx-auto max-w-6xl px-0 py-0">
        {loading || dataLoading ? (
          <section className="rounded-2xl border border-border/70 bg-card/80 p-10 text-center shadow-sm">
            <p className="text-muted-foreground">데이터를 불러오는 중...</p>
          </section>
        ) : !user ? (
          <>
            {/* 랜딩 페이지 - 비로그인 사용자용 */}
            <section className="m-4 text-center">
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
            <section className="m-4 grid gap-6 md:grid-cols-3">
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
        ) : null}
      </main>
    </div>
  );
}

