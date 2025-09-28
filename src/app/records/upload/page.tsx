import Link from "next/link";

const mockMissions = [
  {
    id: "mission-1",
    name: "9월 가을 빌드업",
    crew: "잠실 새벽 크루",
    period: "09.01 - 09.30",
  },
  {
    id: "mission-2",
    name: "탄천 인터벌 챌린지",
    crew: "분당 스프린터즈",
    period: "09.23 - 10.06",
  },
];

const mockYoloPreview = [
  {
    label: "stat_card",
    description: "거리/시간/페이스 등이 들어있는 메인 카드",
  },
  {
    label: "map",
    description: "지도 영역 (OCR 대상 제외)",
  },
];

const mockOcrResult = [
  { label: "활동 날짜", value: "2025.09.27" },
  { label: "거리", value: "17.58 km" },
  { label: "시간", value: "1:41:50" },
  { label: "평균 페이스", value: "5'48\" /km" },
  { label: "평균 심박", value: "161 bpm" },
];

export default function UploadRecord() {
  return (
    <div className="min-h-screen bg-muted/40 pb-20">
      <div className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-muted-foreground">기록 업로드</p>
            <h1 className="text-2xl font-semibold">OCR 플로우 미리보기</h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </div>

      <main className="mx-auto mt-8 grid max-w-4xl gap-6 px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <article className="rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">1. 이미지 업로드</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              실제 서비스에서는 Supabase Storage signed URL을 활용하여 원본 이미지를 업로드합니다.
            </p>
            <div className="mt-5 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/50 p-6 text-center text-sm text-muted-foreground">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-600/20 dark:text-emerald-100">
                Step 1
              </span>
              <p>Drag & Drop 또는 파일 탐색기로 운동 기록 이미지를 선택하세요.</p>
              <button className="rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background shadow-sm hover:opacity-90">
                이미지 선택 (목업)
              </button>
            </div>
          </article>

          <article className="rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">2. YOLOv8 영역 분리</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              업로드된 이미지는 커스텀 YOLOv8 모델로 분류되어 OCR 대상 영역만 추출합니다.
            </p>
            <div className="mt-4 space-y-3">
              {mockYoloPreview.map((item) => (
                <div key={item.label} className="rounded-xl border border-border/60 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{item.label}</span>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-600/20 dark:text-emerald-100">
                      예시 바운딩 박스
                    </span>
                  </div>
                  <p className="mt-2 text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">3. CLOVA OCR</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              템플릿 기반 혹은 General 모드로 인식한 결과를 아래와 같이 파싱해 제공합니다.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {mockOcrResult.map((item) => (
                <div key={item.label} className="rounded-xl border border-border/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                    {item.label}
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="space-y-6">
          <article className="rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">4. 기록 메타 정보</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              OCR로 추출한 내용과 함께 사용자가 직접 확인 및 수정합니다.
            </p>
            <form className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  미션 선택
                </label>
                <select className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">미션을 선택하세요</option>
                  {mockMissions.map((mission) => (
                    <option key={mission.id} value={mission.id}>
                      {mission.name} · {mission.crew}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  해당 미션에 기록을 매칭하면 통계에 자동 반영됩니다.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    활동 날짜
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    defaultValue="2025-09-27"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    공개 설정
                  </label>
                  <select className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="public">전체 공개</option>
                    <option value="private">개인용 (통계 제외)</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
                <p className="font-medium text-foreground/80">OCR 매핑 규칙</p>
                <ul className="mt-2 space-y-1">
                  <li>• 거리 → km 단위로 변환</li>
                  <li>• 시간 → 초 단위 저장, 페이스 자동 계산</li>
                  <li>• 심박/칼로리 등 선택 입력 값은 추후 필터용 필드로 확장</li>
                </ul>
              </div>

              <button
                type="button"
                className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm hover:opacity-90"
              >
                저장 (모의)
              </button>
              <button
                type="button"
                className="w-full rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                OCR 결과만 저장
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold">릴리즈 체크리스트</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>☑ YOLOv8 학습 데이터셋 수집 (샘플 50장 이상)</li>
              <li>☑ CLOVA Template OCR 설정 & API 키 발급</li>
              <li>☐ Edge Function에서 YOLO → OCR → Supabase 저장 흐름 구현</li>
              <li>☐ 프론트에서 업로드 진행 상태 + 결과 검증 UI 추가</li>
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}
