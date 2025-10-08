import Link from "next/link";
import { notFound } from "next/navigation";

import { MissionParticipationControl } from "@/components/crew/mission-participation-control";
import { RecordCard } from "@/components/record-card";
import { RankingCard } from "@/components/mission/ranking-card";
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
          {/* <div className="border-y border-border/60 bg-card">
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
          </div> */}
        </section>

        <section className="flex-1 space-y-2">
          <div className="border-y border-border/60 bg-card">
            <div className="p-4 pb-2">
              <h3 className="text-lg font-semibold">현재 순위 (누적 거리)</h3>
              <p className="text-sm text-muted-foreground">참여자별 누적 기록을 거리순으로 보여줍니다.</p>
            </div>
            <div className="space-y-4 p-4 pt-2">
              {stats.length === 0 ? (
                <p className="text-sm text-muted-foreground">아직 통계 데이터가 없습니다.</p>
              ) : (
                <>
                {stats.slice(0, 5).map((stat, index) => (
                  <RankingCard
                    key={stat.profileId}
                    stat={stat}
                    index={index}
                    formatDuration={formatDuration}
                    formatPace={formatPace}
                    compact
                  />
                ))
                }

                {/* 전체 순위 보기 버튼 */}
                {stats.length > 5 && (
                  <Link
                    href={`/missions/${mission.id}/rankings`}
                    className="block rounded-lg border border-border bg-background px-4 py-3 text-center text-sm font-medium hover:bg-muted"
                  >
                    전체 순위 보기 ({stats.length}명)
                  </Link>
                )}
                </>
              )}
            </div>
          </div>

          <div className="border-y border-border/60 bg-card">
            <div className="p-4 pb-2">
              <h3 className="text-lg font-semibold">최근 등록 기록</h3>
              <p className="text-sm text-muted-foreground">참여자가 업로드한 공개 기록을 최신순으로 보여줍니다.</p>
            </div>
            <div className="space-y-4 p-4 pt-2">
              {recentRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">아직 공개 기록이 없습니다.</p>
              ) : (
                <>
                  {recentRecords.map((record) => {
                    const userStat = stats.find((s) => s.profileId === record.profile?.id);
                    return (
                      <RecordCard
                        key={record.id}
                        record={record}
                        userStat={userStat}
                        showUserInfo={true}
                      />
                    );
                  })}

                  {/* 전체 기록 보기 버튼 - 6개 이상일 때만 표시 */}
                  {recentRecords.length >= 6 && (
                    <Link
                      href={`/missions/${mission.id}/records`}
                      className="block rounded-lg border border-border bg-background px-4 py-3 text-center text-sm font-medium hover:bg-muted"
                    >
                      전체 기록 보기
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
