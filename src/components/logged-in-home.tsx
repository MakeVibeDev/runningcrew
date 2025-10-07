"use client";

import Image from "next/image";
import Link from "next/link";

import { LatestReleaseBanner } from "@/components/latest-release-banner";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
}

interface Crew {
  id: string;
  slug: string;
  name: string;
  logoImageUrl: string | null;
  activityRegion: string;
  memberCount: number;
  ownerProfile?: {
    display_name: string;
    avatar_url: string | null;
  } | null;
}

interface Mission {
  id: string;
  title: string;
  participantsCount: number;
  crew?: {
    name: string;
  } | null;
}

interface User {
  id: string;
  email?: string;
}

interface UserMission {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  crew_id: string;
  crew: {
    id: string;
    name: string;
    slug: string;
  };
  joined_at: string;
}

interface LoggedInHomeProps {
  user: User;
  recentRecords: Array<{
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
  }>;
  userRankings: Map<string, { rank: number; totalParticipants: number; totalDistance: number }>;
  userJoinedMissions: UserMission[];
  unreadNotifications: Notification[];
  publicCrews: Crew[];
  publicMissions: Mission[];
  hideHowItWorks: boolean;
  onHideHowItWorksChange: (hide: boolean) => void;
}

export function LoggedInHome({
  recentRecords,
  userRankings,
  userJoinedMissions,
  unreadNotifications,
  publicCrews,
  publicMissions,
  hideHowItWorks,
  onHideHowItWorksChange,
}: LoggedInHomeProps) {
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPace = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}'${secs.toString().padStart(2, "0")}"`;
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-0">
      {/* 최신 릴리즈 배너 */}
      <LatestReleaseBanner />

      {/* 미확인 알림 */}
      {unreadNotifications.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-background p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">읽지 않은 알림</h2>
            <Link
              href="/notifications"
              className="text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              모두 보기
            </Link>
          </div>
          <div className="space-y-3">
            {unreadNotifications.map((notification) => (
              <Link
                key={notification.id}
                href="/notifications"
                className="block rounded-lg border border-border/40 bg-muted/20 p-4 transition hover:bg-muted/40"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {notification.type === "MISSION_CREATED" && "🎯"}
                    {notification.type === "CREW_JOIN_REQUEST" && "👥"}
                    {notification.type === "CREW_JOIN_APPROVED" && "✅"}
                    {notification.type === "RECORD_LIKED" && "❤️"}
                    {notification.type === "RECORD_COMMENTED" && "💬"}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{notification.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 참여 미션의 최근 기록 */}
      {(userJoinedMissions.length > 0 || recentRecords.length > 0) && (
        <section className="rounded-xl border border-border/60 bg-background p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">참여 미션의 최근 기록</h2>
            <Link
              href={userJoinedMissions.length > 0 ? `/missions/${userJoinedMissions[0].id}` : "/missions"}
              className="text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              더보기
            </Link>
          </div>
          <div className="space-y-4">
            {/* 참여 중인 미션 카드 */}
            {userJoinedMissions.map((mission) => {
              const ranking = userRankings.get(mission.id);
              return (
                <Link
                  key={mission.id}
                  href={`/missions/${mission.id}`}
                  className="block rounded-lg border border-border/60 bg-muted/10 p-4 transition hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold">{mission.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {mission.crew.name} · 참가 중
                      </p>
                    </div>
                    {ranking && (
                      <div className="flex-shrink-0 rounded-lg bg-orange-100 px-3 py-2 text-center dark:bg-orange-950/30">
                        <p className="text-xs text-orange-700 dark:text-orange-400">내 순위</p>
                        <p className="text-lg font-bold text-orange-700 dark:text-orange-400">
                          {ranking.rank}위 / {ranking.totalParticipants}명
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}

            {/* 최근 기록 */}
            {recentRecords.map((record) => (
              <div key={record.id} className="rounded-lg border border-border/40 bg-muted/20 p-4">
                <div className="flex items-start gap-4">
                  {/* 프로필 이미지 */}
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted">
                    {record.profile?.avatar_url ? (
                      <Image
                        src={record.profile.avatar_url}
                        alt={record.profile.display_name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-lg font-semibold text-muted-foreground">
                        {record.profile?.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* 기록 정보 */}
                  <div className="flex-1">
                    <p className="font-semibold">{record.profile?.display_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.mission?.crew.name} · {record.mission?.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      <span>🏃 {record.distance_km.toFixed(2)}km</span>
                      <span>⏱️ {formatDuration(record.duration_seconds)}</span>
                      <span>⚡ {formatPace(record.pace_seconds_per_km)}/km</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 크루 & 미션 미리보기 */}
      <section className="grid gap-6 md:grid-cols-2">
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

                      <div className="relative bg-background/80 p-4 backdrop-blur-sm">
                        <div className="flex items-start gap-3">
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

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{crew.name}</h3>
                              <span className="text-xs text-muted-foreground">{crew.memberCount}명</span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{crew.activityRegion}</p>
                          </div>

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
      
      {/* 시작하기 섹션 */}
      {!hideHowItWorks && (
        <section className="rounded-xl border border-border/70 bg-background p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">시작하기</h2>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={hideHowItWorks}
                onChange={(e) => onHideHowItWorksChange(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border text-orange-500 focus:ring-orange-500"
              />
              다시 보지 않기
            </label>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-xl font-bold text-orange-600 dark:bg-orange-950/30 dark:text-orange-400">
                1
              </div>
              <h3 className="mb-2 font-semibold">카카오 로그인</h3>
              <p className="text-sm text-muted-foreground">간편하게 카카오 계정으로 시작하세요</p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-xl font-bold text-orange-600 dark:bg-orange-950/30 dark:text-orange-400">
                2
              </div>
              <h3 className="mb-2 font-semibold">크루 찾기</h3>
              <p className="text-sm text-muted-foreground">내 지역의 크루를 찾거나 직접 만들어보세요</p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-xl font-bold text-orange-600 dark:bg-orange-950/30 dark:text-orange-400">
                3
              </div>
              <h3 className="mb-2 font-semibold">미션 참여</h3>
              <p className="text-sm text-muted-foreground">크루의 미션에 참여하고 목표에 도전하세요</p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-xl font-bold text-orange-600 dark:bg-orange-950/30 dark:text-orange-400">
                4
              </div>
              <h3 className="mb-2 font-semibold">기록 업로드</h3>
              <p className="text-sm text-muted-foreground">러닝 앱 스크린샷을 업로드하면 OCR이 자동 분석합니다</p>
            </div>
          </div>
        </section>
      )}

      {/* Beta Notice */}
      <section className="rounded-xl border border-orange-200 bg-orange-50 p-6 dark:border-orange-800 dark:bg-orange-950/30">
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
                <span>페이지 하단 버그 및 문의하기 버튼으로 의견 전달</span>
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

      {/* 주요 기능 소개 */}
      {/* <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/70 bg-background p-6 shadow-sm">
          <div className="mb-3 text-4xl">🏃</div>
          <h3 className="mb-2 text-lg font-semibold">러닝 크루</h3>
          <p className="text-sm text-muted-foreground">같은 목표를 가진 러너들과 함께 달리세요</p>
        </div>

        <div className="rounded-xl border border-border/70 bg-background p-6 shadow-sm">
          <div className="mb-3 text-4xl">🎯</div>
          <h3 className="mb-2 text-lg font-semibold">미션 챌린지</h3>
          <p className="text-sm text-muted-foreground">크루별 미션에 참여하고 목표를 달성하세요</p>
        </div>

        <div className="rounded-xl border border-border/70 bg-background p-6 shadow-sm">
          <div className="mb-3 text-4xl">📱</div>
          <h3 className="mb-2 text-lg font-semibold">OCR 기록 분석</h3>
          <p className="text-sm text-muted-foreground">앱 스크린샷을 업로드하면 자동으로 기록을 인식합니다</p>
        </div>

        <div className="rounded-xl border border-border/70 bg-background p-6 shadow-sm">
          <div className="mb-3 text-4xl">💬</div>
          <h3 className="mb-2 text-lg font-semibold">소셜 기능</h3>
          <p className="text-sm text-muted-foreground">좋아요와 댓글로 함께 응원하고 격려하세요</p>
        </div>
      </section> */}

      
    </main>
  );
}
