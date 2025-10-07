import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { fetchMissionById, fetchMissionStats } from "@/lib/supabase/rest";

export const revalidate = 0;

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

export default async function MissionRankingsPage({
  params,
}: {
  params: Promise<{ missionId: string }>;
}) {
  const { missionId } = await params;
  const [mission, stats] = await Promise.all([
    fetchMissionById(missionId),
    fetchMissionStats(missionId),
  ]);

  if (!mission) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-muted/40 pb-16">
      {/* 헤더 */}
      <header className="border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <Link
            href={`/missions/${mission.id}`}
            className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← 미션으로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold">{mission.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">전체 순위 (누적 거리)</p>
        </div>
      </header>

      {/* 순위 리스트 */}
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="space-y-3">
          {stats.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">아직 통계 데이터가 없습니다.</p>
            </div>
          ) : (
            stats.map((stat, index) => (
              <div
                key={stat.profileId}
                className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-3 shadow-sm transition hover:shadow-md"
              >
                {/* 배경 이미지 (blur 효과) */}
                {stat.profile?.avatar_url && (
                  <>
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ zIndex: 0 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={stat.profile.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{
                          filter: 'blur(40px)',
                          opacity: 0.2,
                          transform: 'scale(1.1)',
                        }}
                      />
                    </div>
                    <div className="absolute inset-0 bg-card/90 pointer-events-none" style={{ zIndex: 0 }} />
                  </>
                )}

                {/* 순위 표시 - 최상단 좌측 모서리 */}
                <div
                  className={`absolute left-0 top-0 z-10 flex h-8 w-8 items-center justify-center rounded-br-lg text-xs font-bold ${
                    index === 0
                      ? "bg-yellow-500 text-white"
                      : index === 1
                      ? "bg-gray-400 text-white"
                      : index === 2
                      ? "bg-amber-700 text-white"
                      : "bg-foreground text-background"
                  }`}
                >
                  {index + 1}
                </div>

                {/* 1행: 프로필 이미지 | 이름 + 기록 횟수 */}
                <div className="relative flex items-center gap-3 pl-10 pt-1" style={{ zIndex: 1 }}>
                  <Link
                    href={`/profile/${stat.profileId}`}
                    className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border-2 border-border/60 bg-muted shadow-md hover:ring-2 hover:ring-foreground/20 transition"
                  >
                    {stat.profile?.avatar_url ? (
                      <Image
                        src={stat.profile.avatar_url}
                        alt={stat.profile.display_name ?? "프로필"}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xl font-semibold text-muted-foreground">
                        {stat.profile?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${stat.profileId}`} className="hover:underline">
                      <h3 className="text-base font-semibold text-foreground">
                        {stat.profile?.display_name ?? "익명"}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted-foreground">총 {stat.totalRecords}회 기록</p>
                  </div>
                </div>

                {/* 2행: 통계 3개 */}
                <div className="relative mt-3 grid grid-cols-3 gap-2 text-center" style={{ zIndex: 1 }}>
                  <div>
                    <p className="text-[1 rem] text-muted-foreground">총 거리</p>
                    <p className="text-xl font-bold text-foreground">
                      {stat.totalDistanceKm.toFixed(2)}
                    </p>
                    {/* <p className="text-xs text-muted-foreground">km</p> */}
                  </div>
                  <div>
                    <p className="text-[1rem] text-muted-foreground">총 시간</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatDuration(stat.totalDurationSeconds)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[1rem] text-muted-foreground">평균 페이스</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatPace(stat.avgPaceSecondsPerKm)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
