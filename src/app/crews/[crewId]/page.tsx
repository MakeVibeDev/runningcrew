import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { CrewIntroEditor } from "@/components/crew/crew-intro-editor";
import { CrewJoinButton } from "@/components/crew/crew-join-button";
import { CrewJoinRequestsManager } from "@/components/crew/crew-join-requests-manager";
import { CrewProfileEditor } from "@/components/crew/crew-profile-editor";
import { MissionEditor } from "@/components/crew/mission-editor";
import { NaverSingleMarkerMap } from "@/components/map/naver-single-marker-map";
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
  const recentMembers = crew.recent_members ?? [];

  return (
    <div className="min-h-screen bg-muted/40 pb-0">
      <main className="mx-auto mt-0 flex max-w-5xl flex-col gap-2 px-0">
        <section className="border border-border/70 bg-background p-4 shadow-sm">
          {/* Header with back button */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-orange-500 to-pink-500">
                {crew.logo_image_url ? (
                  <Image
                    src={crew.logo_image_url}
                    alt={`${crew.name} logo`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-lg font-bold text-white">
                    {crew.name.substring(0, 2)}
                  </div>
                )}
              </div>
              {/* Crew name and region */}
              <div>
                <p className="text-sm text-muted-foreground">{crew.activity_region}</p>
                <h1 className="text-2xl font-semibold">{crew.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {crew.description ?? "안녕하세요. MTRC입니다."}
                </p>
              </div>
            </div>
            {/* Back button */}
            <Link
              href="/crews"
              className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              크루 목록으로
            </Link>
          </div>

          {/* Stats */}
          <dl className="mb-6 grid gap-4 rounded-2xl border border-border/60 bg-muted/30 p-5 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">활동 지역</dt>
              <dd className="mt-1 text-base font-semibold text-foreground">{crew.activity_region}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">크루 멤버</dt>
              <dd className="mt-1 text-base font-semibold text-foreground">{crew.member_count}명</dd>
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

          {/* Map and Profile Editor */}
          <div className="mb-6">
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
          </div>

          <div className="mb-6">
            <CrewProfileEditor
              crewId={crew.id}
              ownerId={crew.owner_id}
              defaultRegion={crew.activity_region}
              defaultLogoUrl={crew.logo_image_url}
            />
          </div>

          {/* Join Button and Join Requests */}
          <div className="mb-6 space-y-2">
            <CrewJoinButton crewId={crew.id} crewSlug={crew.slug} crewName={crew.name} ownerId={crew.owner_id} />
            <CrewJoinRequestsManager crewId={crew.id} crewName={crew.name} crewSlug={crew.slug} ownerId={crew.owner_id} />
          </div>

          {/* Crew Introduction */}
          <div className="mb-6">
            <div className="mb-4">
              <h3 className="text-xl font-semibold">크루 소개</h3>
              <p className="mt-1 text-sm text-muted-foreground">{crew.description ?? "안녕하세요. MTRC입니다."}</p>
            </div>
            <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
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
            </div>
          </div>

          {/* Missions */}
          <div>
            <div className="mb-4">
              <h3 className="text-xl font-semibold">진행 중 미션</h3>
              <p className="mt-1 text-sm text-muted-foreground">등록된 미션과 진행 정보를 확인할 수 있습니다.</p>
            </div>
            <div className="space-y-4">
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
                      className="rounded-2xl border border-border/60 bg-muted/30 p-4"
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
            </div>
          </div>
        </section>

        {/* Recent Members (Last 72 hours) - Separate Section */}
        {recentMembers.length > 0 && (
          <section className="border border-border/70 bg-background p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-xl font-semibold">최근 가입한 크루원</h3>
              <p className="mt-1 text-sm text-muted-foreground">지난 72시간 내에 가입한 새로운 크루원들입니다</p>
            </div>
            <div className="space-y-3">
              {recentMembers.map((member) => {
                const joinedDate = new Date(member.joinedAt);
                const now = new Date();
                const hoursAgo = Math.floor((now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60));
                const timeAgo = hoursAgo < 1
                  ? '방금 전'
                  : hoursAgo < 24
                    ? `${hoursAgo}시간 전`
                    : `${Math.floor(hoursAgo / 24)}일 전`;

                return (
                  <Link
                    key={member.id}
                    href={`/profile/${member.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4 transition hover:bg-muted/40"
                  >
                    <Avatar
                      src={member.avatarUrl}
                      alt={member.displayName}
                      size="md"
                      className="border border-border/60"
                    />
                    <div className="flex-1">
                      <p className="font-semibold">{member.displayName}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo} 가입</p>
                    </div>
                    <div className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-600 dark:text-orange-400">
                      🎉 새 멤버
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
