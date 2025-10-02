import Link from "next/link";

import { MissionEditor } from "@/components/crew/mission-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMissionGroups } from "@/lib/supabase/rest";

export const revalidate = 0;

export default async function MissionsPage() {
  const missionGroups = await fetchMissionGroups();

  return (
    <div className="min-h-screen bg-muted/40 pb-16">
      <div className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-sm text-muted-foreground">미션 센터</p>
            <h1 className="text-3xl font-semibold">참여 가능 미션</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Supabase에 등록된 크루 미션 정보를 먼저 확인해보세요.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </div>

      <main className="mx-auto mt-8 grid max-w-6xl gap-6 px-6">
        {missionGroups.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>등록된 미션이 없습니다</CardTitle>
              <CardDescription>크루에서 미션을 등록하면 이곳에서 확인할 수 있습니다.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          missionGroups.map((group) => (
            <Card key={group.crewSlug}>
              <CardHeader className="gap-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{group.crewName}</CardTitle>
                  <Link
                    href={`/crews/${group.crewSlug}`}
                    className="text-xs font-medium text-emerald-600 hover:underline"
                  >
                    크루 상세 보기
                  </Link>
                </div>
                <CardDescription>
                  {group.crewSummary ?? "크루 소개가 곧 업데이트될 예정입니다."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                {group.missions.map((mission) => {
                  const crewInfo = mission.crew;
                  const participantCount = mission.participantsCount ?? 0;
                  return (
                    <div key={mission.id} className="rounded-2xl border border-border/60 bg-muted/40 p-5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground/70">기간</p>
                          <p className="text-sm text-muted-foreground">
                            {mission.start_date} ~ {mission.end_date}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground/80">참여 {participantCount}명</span>
                      </div>
                      <h3 className="mt-4 text-xl font-semibold">{mission.title}</h3>
                      {mission.description ? (
                        <p className="mt-2 text-sm text-muted-foreground">{mission.description}</p>
                      ) : null}
                      {mission.target_distance_km ? (
                        <p className="mt-4 text-xs text-muted-foreground">
                          목표 거리 {mission.target_distance_km} km
                        </p>
                      ) : null}
                      <div className="mt-5 flex flex-wrap gap-2 text-xs">
                        <Link
                          href={`/missions/${mission.id}`}
                          className="rounded-full bg-foreground px-4 py-1 font-semibold text-background hover:opacity-90"
                        >
                          미션 상세 보기
                        </Link>
                        <Link
                          href={`/records/upload?missionId=${mission.id}`}
                          className="rounded-full border border-border px-4 py-1 font-semibold text-foreground hover:bg-muted"
                        >
                          기록 등록
                        </Link>
                      </div>
                      {crewInfo ? (
                        <div className="mt-5">
                          <MissionEditor
                            mission={{
                              id: mission.id,
                              crewId: crewInfo.id,
                              ownerId: group.crewOwnerId,
                              title: mission.title,
                              description: mission.description,
                              startDate: mission.start_date,
                              endDate: mission.end_date,
                              targetDistanceKm: mission.target_distance_km,
                              participantsCount: participantCount,
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
