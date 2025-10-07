"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useSupabase } from "@/components/providers/supabase-provider";
import { KakaoLoginButton } from "@/components/ui/oauth-button";
import { LoggedInHome } from "@/components/logged-in-home";
import {
  fetchCrewList,
  fetchMissionList,
  fetchUserJoinedMissionsRecentRecords,
  fetchUserMissionRanking,
} from "@/lib/supabase/rest";

interface RecentRecord {
  id: string;
  profile_id: string;
  mission_id: string;
  recorded_at: string;
  distance_km: number;
  duration_seconds: number;
  pace_seconds_per_km: number;
  profile: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  mission: {
    id: string;
    title: string;
    crew: {
      name: string;
      slug: string;
    };
  } | null;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
}

export default function Home() {
  const { user, loading, signInWithOAuth, client } = useSupabase();
  const [publicCrews, setPublicCrews] = useState<Awaited<ReturnType<typeof fetchCrewList>>>([]);
  const [publicMissions, setPublicMissions] = useState<Awaited<ReturnType<typeof fetchMissionList>>>([]);
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  const [userRankings, setUserRankings] = useState<Map<string, { rank: number; totalParticipants: number; totalDistance: number }>>(new Map());
  const [unreadNotifications, setUnreadNotifications] = useState<Notification[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [hideHowItWorks, setHideHowItWorks] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHideHowItWorks(localStorage.getItem("hideHowItWorks") === "true");
    }
  }, []);

  useEffect(() => {
    if (user) {
      // 로그인 사용자용 데이터 로드
      setDataLoading(true);
      Promise.all([
        fetchUserJoinedMissionsRecentRecords(user.id, 3),
        client
          .from("notifications")
          .select("*")
          .eq("recipient_id", user.id)
          .eq("read", false)
          .order("created_at", { ascending: false })
          .limit(5),
        fetchCrewList(),
        fetchMissionList(),
      ])
        .then(async ([records, notificationsResult, crewsData, missionsData]) => {
          setRecentRecords(records);
          setUnreadNotifications(notificationsResult.data || []);
          setPublicCrews(crewsData.slice(0, 3));
          setPublicMissions(missionsData.slice(0, 3));

          // 각 미션에 대한 사용자 순위 가져오기
          const missionIds = [...new Set(records.map((r) => r.mission_id))];
          const rankings = await Promise.all(
            missionIds.map(async (missionId) => {
              const ranking = await fetchUserMissionRanking(missionId, user.id);
              return { missionId, ranking };
            })
          );

          const rankingsMap = new Map<string, { rank: number; totalParticipants: number; totalDistance: number }>();
          rankings.forEach(({ missionId, ranking }) => {
            if (ranking) {
              rankingsMap.set(missionId, ranking);
            }
          });
          setUserRankings(rankingsMap);
        })
        .catch((error) => {
          console.error("Failed to fetch user data:", error);
        })
        .finally(() => {
          setDataLoading(false);
        });
    } else if (!loading) {
      // 비로그인 사용자용 데이터 로드
      setDataLoading(true);
      Promise.all([fetchCrewList(), fetchMissionList()])
        .then(([crewsData, missionsData]) => {
          setPublicCrews(crewsData.slice(0, 3));
          setPublicMissions(missionsData.slice(0, 3));
        })
        .catch((error) => {
          console.error("Failed to fetch public data:", error);
        })
        .finally(() => {
          setDataLoading(false);
        });
    }
  }, [user, loading, client]);

  return (
    <div className="min-h-screen bg-muted/40 pb-0">
      <main className="mx-auto max-w-6xl px-0 py-0">
        {loading || dataLoading ? (
          <section className="rounded-2xl border border-border/70 bg-card/80 p-10 text-center shadow-sm">
            <p className="text-muted-foreground">데이터를 불러오는 중...</p>
          </section>
        ) : !user ? (
          <>
            {/* 랜딩 페이지 - 비로그인 사용자용 */}
            <section className="pt-6 px-4 text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                함께 달리는 즐거움
              </h1>
              <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
                러닝 크루와 함께 미션을 완수하고<br />기록을 공유하세요
              </p>
              <p className="mt-3 text-base text-muted-foreground">
                러닝 크루 관리부터 기록 추적, 소셜 기능까지<br />러닝의 모든 순간을 함께합니다
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
            <section className="m-4 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-background p-6 shadow-sm">
                <div className="mb-3 text-4xl">🏃</div>
                <h3 className="mb-2 text-lg font-semibold">러닝 크루</h3>
                <p className="text-sm text-muted-foreground">
                  같은 목표를 가진 러너들과 함께 달리세요
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-background p-6 shadow-sm">
                <div className="mb-3 text-4xl">🎯</div>
                <h3 className="mb-2 text-lg font-semibold">미션 챌린지</h3>
                <p className="text-sm text-muted-foreground">
                  크루별 미션에 참여하고 목표를 달성하세요
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-background p-6 shadow-sm">
                <div className="mb-3 text-4xl">📱</div>
                <h3 className="mb-2 text-lg font-semibold">OCR 기록 분석</h3>
                <p className="text-sm text-muted-foreground">
                  앱 스크린샷을 업로드하면 자동으로 기록을 인식합니다
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-background p-6 shadow-sm">
                <div className="mb-3 text-4xl">💬</div>
                <h3 className="mb-2 text-lg font-semibold">소셜 기능</h3>
                <p className="text-sm text-muted-foreground">
                  좋아요와 댓글로 함께 응원하고 격려하세요
                </p>
              </div>
            </section>

            {/* How It Works */}
            <section className="m-4 mt-12 rounded-xl border border-border/70 bg-background p-8 shadow-sm">
              <h2 className="mb-6 text-center text-2xl font-bold">시작하기</h2>
              <div className="grid gap-6 md:grid-cols-4">
                <div className="text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-xl font-bold text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 mx-auto">
                    1
                  </div>
                  <h3 className="mb-2 font-semibold">카카오 로그인</h3>
                  <p className="text-sm text-muted-foreground">
                    간편하게 카카오 계정으로 시작하세요
                  </p>
                </div>

                <div className="text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-xl font-bold text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 mx-auto">
                    2
                  </div>
                  <h3 className="mb-2 font-semibold">크루 찾기</h3>
                  <p className="text-sm text-muted-foreground">
                    내 지역의 크루를 찾거나 직접 만들어보세요
                  </p>
                </div>

                <div className="text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-xl font-bold text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 mx-auto">
                    3
                  </div>
                  <h3 className="mb-2 font-semibold">미션 참여</h3>
                  <p className="text-sm text-muted-foreground">
                    크루의 미션에 참여하고 목표에 도전하세요
                  </p>
                </div>

                <div className="text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-xl font-bold text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 mx-auto">
                    4
                  </div>
                  <h3 className="mb-2 font-semibold">기록 업로드</h3>
                  <p className="text-sm text-muted-foreground">
                    러닝 앱 스크린샷을 업로드하면 OCR이 자동 분석합니다
                  </p>
                </div>
              </div>
            </section>

            {/* Beta Notice */}
            <section className="m-4 mt-8 rounded-xl border border-orange-200 bg-orange-50 p-6 dark:border-orange-800 dark:bg-orange-950/30">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🚀</div>
                <div className="flex-1">
                  <h3 className="mb-2 text-lg font-semibold text-orange-900 dark:text-orange-200">
                    베타 테스트 중입니다
                  </h3>
                  <p className="mb-3 text-sm text-orange-700 dark:text-orange-300">
                    RunningCrew는 현재 베타 버전입니다. 서비스를 이용하시면서 불편한 점이나 개선사항이 있으시면 언제든지 알려주세요.
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                      <span>💡</span>
                      <span>페이지 하단 피드백 버튼으로 의견 전달</span>
                    </div>
                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                      <span>🐛</span>
                      <span>버그 제보 환영</span>
                    </div>
                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                      <span>✨</span>
                      <span>개선 아이디어 제안</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 크루 & 미션 미리보기 */}
            <section className="m-4 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-background p-6 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold">인기 크루</h3>
                  <p className="mt-1 text-sm text-muted-foreground">활발하게 활동 중인 러닝 크루들</p>
                </div>
                <div>
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
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-background p-6 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold">진행 중인 미션</h3>
                  <p className="mt-1 text-sm text-muted-foreground">지금 참여할 수 있는 미션들</p>
                </div>
                <div>
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
                </div>
              </div>
            </section>
          </>
        ) : (
          <LoggedInHome
            user={user}
            recentRecords={recentRecords}
            userRankings={userRankings}
            unreadNotifications={unreadNotifications}
            publicCrews={publicCrews}
            publicMissions={publicMissions}
            hideHowItWorks={hideHowItWorks}
            onHideHowItWorksChange={(hide) => {
              setHideHowItWorks(hide);
              localStorage.setItem("hideHowItWorks", String(hide));
            }}
          />
        )}
      </main>
    </div>
  );
}

