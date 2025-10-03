import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MissionParticipationControl } from "@/components/crew/mission-participation-control";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMissionById, fetchMissionRecords, fetchMissionStats } from "@/lib/supabase/rest";

export const revalidate = 0;

function formatDateRange(start: string, end: string) {
  if (start === end) return start;
  return `${start} ~ ${end}`;
}

function formatDuration(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts = [hrs, mins, secs].map((value) => value.toString().padStart(2, "0"));
  return `${parts[0]}:${parts[1]}:${parts[2]}`;
}

function formatPace(paceSeconds?: number | null) {
  if (!paceSeconds || paceSeconds <= 0) return "-";
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}'${secs.toString().padStart(2, "0")}"`;
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ko", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ missionId: string }>;
}) {
  const { missionId } = await params;
  const [mission, recentRecords, stats] = await Promise.all([
    fetchMissionById(missionId),
    fetchMissionRecords(missionId, 6),
    fetchMissionStats(missionId),
  ]);

  if (!mission) {
    notFound();
  }

  const { crew } = mission;
  const uploadHref = `/records/upload?missionId=${mission.id}`;

  return (
    <div className="min-h-screen bg-muted/40 pb-0">
      <div className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-0">
            <p className="text-sm text-muted-foreground">미션 상세</p>
            <h1 className="text-3xl font-semibold">{mission.title}</h1>
            <p className="text-sm text-muted-foreground">
              기간 {formatDateRange(mission.startDate, mission.endDate)}
            </p>
            {mission.targetDistanceKm ? (
              <p className="text-sm text-muted-foreground">
                목표 거리 {mission.targetDistanceKm} km
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={uploadHref}
              className="rounded-full bg-foreground px-5 py-2 text-center text-sm font-semibold text-background shadow-sm hover:opacity-90"
            >
              기록 등록
            </Link>
            {crew ? (
              <Link
                href={`/crews/${crew.slug}`}
                className="rounded-full border border-border px-5 py-2 text-center text-sm font-semibold hover:bg-muted"
              >
                {crew.name} 크루 바로가기
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <main className="mx-auto mt-0 flex max-w-5xl flex-col gap-2 px-0 lg:flex-row">
        <section className="flex-1 space-y-2">
          <details className="group  border border-border/70 bg-card ">
            <summary className="flex cursor-pointer items-center justify-between p-6 text-lg font-semibold">
              <span>미션 정보</span>
              <span className="text-muted-foreground transition-transform group-open:rotate-180">
                ▼
              </span>
            </summary>
            <div className="space-y-4 border-t border-border/50 p-6 text-sm text-muted-foreground">
              <p className="text-sm text-muted-foreground">
                {mission.description ?? "미션 소개가 곧 추가될 예정입니다."}
              </p>
              {crew ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                    크루
                  </p>
                  <p className="mt-1 text-base font-semibold text-foreground">{crew.name}</p>
                  {crew.activity_region ? (
                    <p className="text-xs text-muted-foreground">
                      활동 지역 {crew.activity_region}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                  기간
                </p>
                <p className="mt-1 text-base text-foreground">
                  {formatDateRange(mission.startDate, mission.endDate)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                  목표
                </p>
                <p className="mt-1 text-base text-foreground">
                  {mission.targetDistanceKm ? `${mission.targetDistanceKm} km` : "설정되지 않음"}
                </p>
              </div>
              <MissionParticipationControl
                missionId={mission.id}
                crewId={mission.crewId}
                ownerId={mission.crew?.owner_id ?? ""}
                initialCount={mission.participantsCount}
              />
            </div>
          </details>

          {/* <Card>
            <CardHeader>
              <CardTitle>참여자 (총 {mission.participantsCount}명 참가 중)</CardTitle>
            </CardHeader>
            <CardContent> */}
          <div className="border-y border-border/60 bg-card">
            <div className="p-6 pb-0">
              <h3 className="text-lg font-semibold">참여자 통계</h3>
              <p className="text-sm text-muted-foreground">참여자별 누적 기록을 거리순으로 보여줍니다.</p>
            </div>
            <div className="space-y-4 p-6 pt-2">

              {mission.participants.length === 0 ? (
                <p className="text-sm text-muted-foreground">아직 참여자가 없습니다.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {mission.participants.map((participant) => (
                    <div
                      key={participant?.id}
                      className="flex flex-col items-center gap-2"
                      title={participant?.display_name ?? "익명"}
                    >
                      <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-border/60 bg-muted">
                        {participant?.avatar_url ? (
                          <Image
                            src={participant.avatar_url}
                            alt={participant.display_name ?? "프로필"}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-lg font-semibold text-muted-foreground">
                            {participant?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {participant?.display_name ?? "익명"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="flex-1 space-y-2">
          <div className="border-y border-border/60 bg-card">
            <div className="p-4 pb-2">
              <h3 className="text-lg font-semibold">참여자 통계</h3>
              <p className="text-sm text-muted-foreground">참여자별 누적 기록을 거리순으로 보여줍니다.</p>
            </div>
            <div className="space-y-4 p-4 pt-2">
              {stats.length === 0 ? (
                <p className="text-sm text-muted-foreground">아직 통계 데이터가 없습니다.</p>
              ) : (
                stats.map((stat) => (
                  <div
                    key={stat.profileId}
                    className="rounded-xl border border-border/60 bg-background p-2 text-sm text-muted-foreground"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-2 border-border/60 bg-muted">
                        {stat.profile?.avatar_url ? (
                          <Image
                            src={stat.profile.avatar_url}
                            alt={stat.profile.display_name ?? "프로필"}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-lg font-semibold text-muted-foreground">
                            {stat.profile?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                        )}
                      </div>
                      <p className="font-medium text-foreground">
                        {stat.profile?.display_name ?? "익명"}
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs uppercase tracking-wide text-muted-foreground/70">
                      <div>
                        <p className="text-[0.65rem]">총 거리</p>
                        <p className="text-base font-semibold text-foreground">
                          {stat.totalDistanceKm.toFixed(2)} KM
                        </p>
                      </div>
                      <div>
                        <p className="text-[0.65rem]">총 시간</p>
                        <p className="text-base font-semibold text-foreground">
                          {formatDuration(stat.totalDurationSeconds)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[0.65rem]">평균 페이스</p>
                        <p className="text-base font-semibold text-foreground">
                          {formatPace(stat.avgPaceSecondsPerKm)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-y border-border/60 bg-card">
            <div className="p-4 pb-2">
              <h3 className="text-lg font-semibold">최근 공개 기록</h3>
              <p className="text-sm text-muted-foreground">참여자가 업로드한 공개 기록을 최신순으로 보여줍니다.</p>
            </div>
            <div className="space-y-4 p-4 pt-2">
              {recentRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">아직 공개 기록이 없습니다.</p>
              ) : (
                recentRecords.map((record) => {
                  const userStat = stats.find((s) => s.profileId === record.profile?.id);
                  return (
                    <div
                      key={record.id}
                      className="rounded-xl border border-border/60 bg-background p-2 text-sm text-muted-foreground"
                    >
                      <div className="space-y-3">
                        {/* 1행: 2컬럼 - 업로드 이미지 | 프로필, 활동시간 */}
                        <div className="flex gap-3">
                          {/* 1컬럼: 업로드 이미지 */}
                          {record.imagePath && (
                            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-border/40">
                              <Image
                                src={record.imagePath}
                                alt="기록 사진"
                                fill
                                className="object-cover"
                                sizes="96px"
                                unoptimized
                              />
                            </div>
                          )}

                          {/* 2컬럼: 프로필, 활동시간 */}
                          <div className="flex flex-1 flex-col justify-between min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted">
                                {record.profile?.avatar_url ? (
                                  <Image
                                    src={record.profile.avatar_url}
                                    alt={record.profile.display_name ?? "프로필"}
                                    fill
                                    className="object-cover"
                                    sizes="32px"
                                  />
                                ) : (
                                  <div className="grid h-full w-full place-items-center text-xs font-semibold text-muted-foreground">
                                    {record.profile?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {record.profile?.display_name ?? "익명"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  누적: {userStat?.totalDistanceKm.toFixed(1)}km · {userStat && formatDuration(userStat.totalDurationSeconds)}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(record.recordedAt)}
                            </p>
                          </div>
                        </div>

                        {/* 2행: 1컬럼 - 거리, 시간, 페이스 */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[0.65rem] text-muted-foreground">거리</p>
                            <p className="text-sm font-semibold text-foreground">
                              {record.distanceKm.toFixed(1)} KM
                            </p>
                          </div>
                          <div>
                            <p className="text-[0.65rem] text-muted-foreground">시간</p>
                            <p className="text-sm font-semibold text-foreground">
                              {formatDuration(record.durationSeconds)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[0.65rem] text-muted-foreground">페이스</p>
                            <p className="text-sm font-semibold text-foreground">
                              {formatPace(record.paceSecondsPerKm)}
                            </p>
                          </div>
                        </div>

                        {/* 3행: 1컬럼 - 메모 */}
                        {record.notes && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{record.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
