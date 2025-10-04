import Link from "next/link";
import { notFound } from "next/navigation";

import { RecordCard } from "@/components/record-card";
import { fetchMissionById, fetchMissionRecords, fetchMissionStats } from "@/lib/supabase/rest";

export const revalidate = 0;

export default async function MissionRecordsPage({
  params,
}: {
  params: Promise<{ missionId: string }>;
}) {
  const { missionId } = await params;
  const [mission, allRecords, stats] = await Promise.all([
    fetchMissionById(missionId),
    fetchMissionRecords(missionId), // limit 없이 모든 기록 조회
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
          <p className="mt-1 text-sm text-muted-foreground">
            전체 공개 기록 ({allRecords.length}개)
          </p>
        </div>
      </header>

      {/* 기록 리스트 */}
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="space-y-3">
          {allRecords.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">아직 공개 기록이 없습니다.</p>
            </div>
          ) : (
            allRecords.map((record) => {
              // 해당 사용자의 통계 정보 찾기
              const userStat = stats.find((s) => s.profileId === record.profile?.id);
              return (
                <RecordCard
                  key={record.id}
                  record={record}
                  userStat={userStat}
                  showUserInfo={true}
                />
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
