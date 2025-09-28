import Link from "next/link";

import { cn } from "@/lib/utils";

const weeklySummary = [
  {
    label: "이번 주 누적 거리",
    value: "38.4 km",
    detail: "+5.6 km vs 지난주",
    tone: "success",
  },
  {
    label: "이번 주 활동 시간",
    value: "3h 42m",
    detail: "+24m vs 지난주",
    tone: "neutral",
  },
  {
    label: "평균 페이스",
    value: "5'21\" /km",
    detail: "10초 향상",
    tone: "success",
  },
  {
    label: "평균 심박수",
    value: "154 bpm",
    detail: "-3 bpm",
    tone: "success",
  },
];

const missions = [
  {
    id: "mission-1",
    name: "9월 가을 빌드업",
    crew: "잠실 새벽 크루",
    period: "09.01 - 09.30",
    target: "150 km",
    progress: 82,
    participants: 18,
    status: "진행 중",
  },
  {
    id: "mission-2",
    name: "탄천 인터벌 챌린지",
    crew: "분당 스프린터즈",
    period: "09.23 - 10.06",
    target: "10회 참여",
    progress: 40,
    participants: 12,
    status: "D-5",
  },
  {
    id: "mission-3",
    name: "주간 롱런 21K",
    crew: "한강 일요 러닝",
    period: "항상 진행",
    target: "주 1회 21K",
    progress: 67,
    participants: 42,
    status: "오픈",
  },
];

const records = [
  {
    id: "rec-1",
    date: "09.27",
    course: "용인 러닝",
    distance: "17.58 km",
    pace: "5'48\" /km",
    duration: "1:41:50",
    effort: "보통",
  },
  {
    id: "rec-2",
    date: "09.25",
    course: "탄천 인터벌",
    distance: "6.96 km",
    pace: "4'46\" /km",
    duration: "33:09",
    effort: "높음",
  },
  {
    id: "rec-3",
    date: "09.22",
    course: "일요 롱런",
    distance: "21.34 km",
    pace: "5'29\" /km",
    duration: "1:57:00",
    effort: "보통",
  },
];

const upcomingEvents = [
  {
    id: "event-1",
    title: "10월 미니 모의 마라톤",
    crew: "잠실 새벽 크루",
    date: "10.05(일) 07:00",
    location: "잠실 종합운동장",
    tag: "대기 8명",
  },
  {
    id: "event-2",
    title: "가을 트레일 리트릿",
    crew: "분당 스프린터즈",
    date: "10.12(토) 06:00",
    location: "남한산성",
    tag: "잔여 4자리",
  },
];

const crewFeed = [
  {
    id: "feed-1",
    user: "탱탱",
    crew: "일요러닝",
    content:
      "양재천 탄천 콜라보 롱런 완주! 비왔지만 다 같이 완주해서 너무 뿌듯한 주말",
    stats: {
      distance: "21.34 km",
      pace: "5'29\" /km",
      time: "1h 57m",
    },
  },
  {
    id: "feed-2",
    user: "GaeJoon",
    crew: "용인시 러닝",
    content:
      "새벽에 하갈동 코스로 롱런. OCR 테스트용 이미지도 같이 업로드 완료!",
    stats: {
      distance: "17.58 km",
      pace: "5'48\" /km",
      time: "1h 41m",
    },
  },
];

const toneStyles: Record<string, string> = {
  success: "bg-emerald-100/80 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  neutral: "bg-muted text-muted-foreground",
  warning: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
};

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-border/80 bg-white/90 backdrop-blur dark:bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-600 text-sm font-semibold text-white grid place-items-center">
              RC
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                RunningCrew Preview
              </p>
              <h1 className="text-lg font-semibold">대시보드 (가상 데이터)</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">ver. mock-202409</span>
            <button className="rounded-full border border-border px-3 py-1 hover:bg-muted">
              피드백 남기기
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {weeklySummary.map((item) => (
            <article
              key={item.label}
              className="rounded-xl border border-border/70 bg-card/70 p-5 shadow-sm"
            >
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">{item.value}</p>
              <span
                className={cn(
                  "mt-4 inline-flex rounded-full px-3 py-1 text-xs font-medium",
                  toneStyles[item.tone] ?? toneStyles.neutral,
                )}
              >
                {item.detail}
              </span>
            </article>
          ))}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <article className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">진행 중 미션</h2>
                <p className="text-sm text-muted-foreground">
                  상단 진행률은 자체 집계 로직으로 계산됩니다.
                </p>
              </div>
              <button className="rounded-full border border-border px-3 py-1 text-sm hover:bg-muted">
                미션 만들기
              </button>
            </header>
            <div className="mt-6 space-y-4">
              {missions.map((mission) => (
                <div
                  key={mission.id}
                  className="rounded-xl border border-border/60 bg-background/80 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {mission.crew}
                      </p>
                      <h3 className="text-lg font-semibold">{mission.name}</h3>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                      {mission.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                        기간
                      </p>
                      <p>{mission.period}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                        목표
                      </p>
                      <p>{mission.target}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                        참여 인원
                      </p>
                      <p>{mission.participants}명</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>진행률</span>
                      <span>{mission.progress}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${mission.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <aside className="space-y-6">
            <article className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm">
              <h2 className="text-lg font-semibold">다가오는 이벤트</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                현재는 목업 데이터가 표시됩니다. 실제 이벤트 API 연동 예정.
              </p>
              <div className="mt-5 space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-border/60 p-4">
                    <h3 className="text-base font-semibold">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">{event.crew}</p>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p>{event.date}</p>
                      <p>{event.location}</p>
                    </div>
                    <span className="mt-3 inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-600/20 dark:text-emerald-100">
                      {event.tag}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm">
              <h2 className="text-lg font-semibold">기록 업로드<br />샘플 플로우</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                OCR Edge Function 배포 전 UI 목업입니다.
              </p>
              <div className="mt-5 space-y-3">
                {["이미지 선택", "YOLOv8 영역 분리", "CLOVA OCR 호출", "결과 확인 및 저장"].map((step, index) => (
                  <div key={step} className="flex items-center gap-3 text-sm">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-600 dark:bg-emerald-600/30 dark:text-emerald-100">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/records/upload"
                className="mt-6 block w-full rounded-lg bg-foreground px-4 py-2 text-center text-sm font-semibold text-background shadow-sm transition hover:opacity-90"
              >
                업로드 UI 미리보기
              </Link>
            </article>
          </aside>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <article className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">최근 업로드 기록</h2>
              <button className="text-sm text-emerald-600 hover:underline">
                전체 보기
              </button>
            </header>
            <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">날짜</th>
                    <th className="px-4 py-3">코스</th>
                    <th className="px-4 py-3">거리</th>
                    <th className="px-4 py-3">페이스</th>
                    <th className="px-4 py-3">시간</th>
                    <th className="px-4 py-3">체감 강도</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-t border-border/60">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {record.date}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {record.course}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {record.distance}
                      </td>
                      <td className="px-4 py-3 text-sm">{record.pace}</td>
                      <td className="px-4 py-3 text-sm">{record.duration}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:bg-amber-500/20 dark:text-amber-100">
                          {record.effort}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <aside className="space-y-6">
            <article className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm">
              <h2 className="text-lg font-semibold">크루 피드 목업</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                실데이터 연동 전 UI 감상용 샘플입니다.
              </p>
              <div className="mt-4 space-y-4">
                {crewFeed.map((feed) => (
                  <div key={feed.id} className="rounded-xl border border-border/60 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{feed.user}</span>
                      <span className="text-muted-foreground">{feed.crew}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground/90">{feed.content}</p>
                    <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                      <span>거리 {feed.stats.distance}</span>
                      <span>페이스 {feed.stats.pace}</span>
                      <span>시간 {feed.stats.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm">
              <h2 className="text-lg font-semibold">릴리즈 메모</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Supabase 초기 스키마 및 Storage 정책 적용 완료</li>
                <li>• OCR 파이프라인: YOLOv8 + CLOVA + Vision fallback</li>
                <li>• 네이버 지도 연동은 API 키 준비 후 진행 예정</li>
              </ul>
              <button className="mt-4 w-full rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
                전체 플랜 보기
              </button>
            </article>
          </aside>
        </section>
      </main>

      <footer className="border-t border-border/80 bg-muted/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} RunningCrew (mock UI)</span>
          <span>데모 전용 버전입니다. 실제 데이터와 다를 수 있습니다.</span>
        </div>
      </footer>
    </div>
  );
}
