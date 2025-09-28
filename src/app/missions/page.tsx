import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const missionGroups = [
  {
    crew: "잠실 새벽 크루",
    summary: "한 달 150km 빌드업과 주 1회 인터벌 세션",
    missions: [
      {
        id: "mission-1",
        name: "9월 가을 빌드업",
        period: "09.01 - 09.30",
        target: "누적 150 km",
        progress: 82,
        members: 18,
      },
      {
        id: "mission-2",
        name: "주간 롱런 21K",
        period: "상시",
        target: "주 1회 21K",
        progress: 65,
        members: 42,
      },
    ],
  },
  {
    crew: "분당 스프린터즈",
    summary: "탄천 기반 인터벌과 스피드 세션",
    missions: [
      {
        id: "mission-3",
        name: "탄천 인터벌 챌린지",
        period: "09.23 - 10.06",
        target: "총 10회 참여",
        progress: 40,
        members: 12,
      },
    ],
  },
];

export default function MissionsPage() {
  return (
    <div className="min-h-screen bg-muted/40 pb-16">
      <div className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-sm text-muted-foreground">미션 센터</p>
            <h1 className="text-3xl font-semibold">참여 가능 미션 미리보기</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              실제 데이터 연동 전, 크루별로 미션 카드 UI를 확인할 수 있습니다.
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
        {missionGroups.map((group) => (
          <Card key={group.crew}>
            <CardHeader className="gap-2">
              <CardTitle>{group.crew}</CardTitle>
              <CardDescription>{group.summary}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              {group.missions.map((mission) => (
                <div
                  key={mission.id}
                  className="rounded-2xl border border-border/60 bg-muted/40 p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                        기간
                      </p>
                      <p className="text-sm text-muted-foreground">{mission.period}</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-600/20 dark:text-emerald-100">
                      진행률 {mission.progress}%
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">{mission.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">목표: {mission.target}</p>

                  <div className="mt-4 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{ width: `${mission.progress}%` }}
                    />
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <dt>참여 인원</dt>
                      <dd className="text-sm font-medium text-foreground">
                        {mission.members}명
                      </dd>
                    </div>
                    <div>
                      <dt>상세 보기</dt>
                      <dd>
                        <span className="inline-flex cursor-pointer items-center gap-1 text-emerald-600 hover:underline">
                          준비 중
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
