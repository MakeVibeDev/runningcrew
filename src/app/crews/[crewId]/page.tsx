import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CrewIntroEditor } from "@/components/crew/crew-intro-editor";
import { CrewJoinButton } from "@/components/crew/crew-join-button";
import { CrewJoinRequestsManager } from "@/components/crew/crew-join-requests-manager";
import { CrewProfileEditor } from "@/components/crew/crew-profile-editor";
import { MissionEditor } from "@/components/crew/mission-editor";
import { NaverSingleMarkerMap } from "@/components/map/naver-single-marker-map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCrewBySlug } from "@/lib/supabase/rest";

export async function generateMetadata({ params }: { params: Promise<{ crewId: string }> }): Promise<Metadata> {
  const { crewId } = await params;
  const crew = await fetchCrewBySlug(crewId);
  if (!crew) {
    return {
      title: "크루를 찾을 수 없습니다 | RunningCrew",
    };
  }

  return {
    title: `${crew.name} | RunningCrew`,
    description: crew.description ?? undefined,
  };
}

export default async function CrewDetailPage({ params }: { params: Promise<{ crewId: string }> }) {
  const { crewId } = await params;
  const crew = await fetchCrewBySlug(crewId);

  if (!crew) {
    notFound();
  }

  const introParagraphs = crew.intro?.split(/\n+/).filter(Boolean) ?? [];
  const hasCoordinates = crew.location_lat !== null && crew.location_lng !== null;
  const missions = crew.missions ?? [];

  return (
    <div className="min-h-screen bg-muted/40 pb-16">
      <div className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-sm text-muted-foreground">크루 상세</p>
            <h1 className="text-3xl font-semibold">{crew.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{crew.activity_region}</p>
          </div>
          <Link
            href="/crews"
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            크루 목록으로
          </Link>
        </div>
      </div>

      <main className="mx-auto mt-8 flex max-w-5xl flex-col gap-6 px-6">
        <section className="rounded-3xl border border-border/70 bg-background p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex flex-1 flex-col gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-border/60 bg-muted">
                {crew.logo_image_url ? (
                  <Image
                    src={crew.logo_image_url}
                      alt={`${crew.name} logo`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">
                      로고 준비 중
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{crew.activity_region}</p>
                  <h2 className="text-2xl font-semibold">{crew.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {crew.description ?? "크루 소개가 곧 업데이트될 예정입니다."}
                  </p>
                </div>
              </div>

              <dl className="grid gap-4 rounded-2xl border border-border/60 bg-muted/30 p-5 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">활동 지역</dt>
                  <dd className="mt-1 text-base font-semibold text-foreground">{crew.activity_region}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">소개 상태</dt>
                  <dd className="mt-1 text-base font-semibold text-foreground">
                    {introParagraphs.length > 0 ? "작성됨" : "준비 중"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">진행 미션</dt>
                  <dd className="mt-1 text-base font-semibold text-foreground">{missions.length}개</dd>
                </div>
              </dl>
            </div>

            <div className="lg:w-[320px]">
              {hasCoordinates ? (
                <NaverSingleMarkerMap
                  latitude={crew.location_lat!}
                  longitude={crew.location_lng!}
                  markerTitle={crew.name}
                  addressLine={crew.activity_region}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
                  활동 위치가 곧 업데이트될 예정입니다.
                </div>
              )}
              <CrewProfileEditor
                crewId={crew.id}
                ownerId={crew.owner_id}
                defaultRegion={crew.activity_region}
                defaultLogoUrl={crew.logo_image_url}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="gap-2">
                <CardTitle>크루 소개</CardTitle>
                <CardDescription>{crew.description ?? "크루의 활동 방식 요약"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                {introParagraphs.length > 0 ? (
                  introParagraphs.map((paragraph) => (
                    <p key={paragraph} className="text-foreground/90">
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p className="text-foreground/90">상세 소개가 곧 업데이트될 예정입니다.</p>
                )}
                <CrewIntroEditor
                  crewId={crew.id}
                  ownerId={crew.owner_id}
                  defaultDescription={crew.description}
                  defaultIntro={crew.intro}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-2">
                <CardTitle>진행 중 미션</CardTitle>
                <CardDescription>등록된 미션과 진행 정보를 확인할 수 있습니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {missions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
                    공개된 미션이 아직 없습니다.
                  </div>
                ) : (
                  missions.map((mission) => {
                    const participantCount = (mission as { participants_count?: number }).participants_count ?? 0;
                    return (
                      <div
                        key={mission.id}
                        className="rounded-2xl border border-border/60 bg-muted/30 p-5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                              기간
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {mission.start_date} ~ {mission.end_date}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-start justify-between gap-2">
                          <Link
                            href={`/missions/${mission.id}`}
                            className="flex-1 transition hover:opacity-70"
                          >
                            <h3 className="text-lg font-semibold">🎯 {mission.title}</h3>
                          </Link>
                          <Link
                            href={`/missions/${mission.id}`}
                            className="rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                          >
                            📊 상세
                          </Link>
                        </div>
                        {mission.description ? (
                          <p className="mt-2 text-sm text-muted-foreground">{mission.description}</p>
                        ) : null}
                        {mission.target_distance_km ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            목표 거리 {mission.target_distance_km} km
                          </p>
                        ) : null}
                        <MissionEditor
                          mission={{
                            id: mission.id,
                            crewId: crew.id,
                            ownerId: crew.owner_id,
                            title: mission.title,
                            description: mission.description,
                            startDate: mission.start_date,
                            endDate: mission.end_date,
                            targetDistanceKm: mission.target_distance_km,
                            participantsCount: participantCount,
                          }}
                        />
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <CrewJoinButton crewId={crew.id} ownerId={crew.owner_id} />

            <CrewJoinRequestsManager crewId={crew.id} ownerId={crew.owner_id} />

            <Card>
              <CardHeader className="gap-2">
                <CardTitle>모임 일정</CardTitle>
                <CardDescription>상세 일정 정보는 추후 등록됩니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>크루 운영진이 일정 정보를 준비하는 중입니다.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-2">
                <CardTitle>연락처 & 링크</CardTitle>
                <CardDescription>가입 문의 채널은 추후 업데이트됩니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>공식 SNS와 연락처 정보를 곧 연결할 예정입니다.</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
