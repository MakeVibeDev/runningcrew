# RunningCrew 개발 로그

## 프로젝트 개요

RunningCrew는 러닝 크루 미션 추적 앱으로, Next.js 15 App Router와 Supabase를 기반으로 구축되었습니다.

### 기술 스택
- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **주요 기능**: OCR 기반 러닝 기록 업로드, 크루/미션 관리, 통계 대시보드

---

## 최근 세션 작업 내역 (상세)

### 2025-10-11: Admin/Main 앱 분리 (Vercel 배포 준비)

#### 작업 목표
하나의 코드베이스에서 Main 서비스와 Admin 패널을 완전히 분리하여 독립적으로 배포할 수 있도록 구현

#### 구현 내용

**1. 환경 변수 기반 앱 타입 분리**
- `.env.admin.example` 생성
- `NEXT_PUBLIC_APP_TYPE` 환경 변수로 앱 모드 제어 (main/admin)

**2. Next.js 설정 수정** ([next.config.ts](../next.config.ts))
```typescript
const isAdminApp = process.env.NEXT_PUBLIC_APP_TYPE === "admin";

// Admin 앱: 루트를 /admin-dashboard로 rewrite
rewrites: isAdminApp ? [{ source: "/", destination: "/admin-dashboard" }] : []

// 각 앱에서 반대편 라우트 차단
redirects: {
  admin: ["/missions/*", "/crews/*", "/records/*", "/members/*"] → "/admin-dashboard"
  main: ["/admin-dashboard/*", "/admin-login"] → "/"
}
```

**3. Middleware 런타임 보호 강화** ([src/middleware.ts](../src/middleware.ts))
- 빌드 타임 redirects를 우회하는 시도를 런타임에서 추가 차단
- Admin 앱: 서비스 라우트 접근 시 `/admin-dashboard`로 강제 리다이렉트
- Main 앱: Admin 라우트 접근 시 `/`로 강제 리다이렉트

**4. 빌드 스크립트 추가** ([package.json](../package.json))
```json
{
  "dev:admin": "NEXT_PUBLIC_APP_TYPE=admin next dev --turbopack -p 3001",
  "build:admin": "NEXT_PUBLIC_APP_TYPE=admin next build --turbopack",
  "start:admin": "NEXT_PUBLIC_APP_TYPE=admin next start -p 3001"
}
```

**5. TypeScript/React 오류 수정**
- Admin records API: 타입 추론 오류 해결 (eslint-disable 추가)
- Admin records 페이지: `useSearchParams()` Suspense boundary 추가

#### 로컬 테스트 결과 ✅

**Main 앱 (localhost:3000)**
- ✅ `/` → 200 (서비스 홈)
- ✅ `/missions`, `/crews`, `/records`, `/members` → 200
- ✅ `/admin-dashboard` → 307 redirect to `/`

**Admin 앱 (localhost:3001)**
- ✅ `/` → 200 (자동으로 admin-dashboard로 rewrite)
- ✅ `/admin-login`, `/admin-dashboard` → 200
- ✅ `/missions`, `/crews`, `/records` → 307 redirect to `/admin-dashboard`

#### 프로덕션 빌드 테스트 ✅
```bash
✅ npm run build - 성공
✅ npm run build:admin - 성공
```

#### 배포 가이드 문서
- [vercel-deployment-guide.md](./vercel-deployment-guide.md) - 상세 배포 가이드
- [admin-separation-summary.md](./admin-separation-summary.md) - 작업 요약 및 체크리스트

#### 배포 방법 요약
1. Vercel에서 두 개의 프로젝트 생성:
   - **runningcrew** (Main): Build Command `npm run build`, 도메인 `runningcrew.io`
   - **runningcrew-admin** (Admin): Build Command `npm run build:admin`, 도메인 `admin.runningcrew.io`
2. 각 프로젝트에 동일한 환경 변수 설정
3. Admin 프로젝트에 `NEXT_PUBLIC_APP_TYPE=admin` 필수 설정

#### 주요 파일 변경
- 신규: `.env.admin.example`, `docs/vercel-deployment-guide.md`, `docs/admin-separation-summary.md`
- 수정: `next.config.ts`, `package.json`, `src/middleware.ts`
- 수정: `src/app/api/admin/records/[recordId]/route.ts`, `src/app/admin-dashboard/records/page.tsx`

---

## 최근 세션 작업 내역 (상세)

### 1. 미션 상세 페이지 개선

#### 1.1 활동 시간 표시 수정
**파일**: `src/app/missions/[missionId]/page.tsx`

**문제**:
- 활동 시간이 `created_at`으로 표시되어 실제 운동 시간과 다름
- 사용자가 혼란스러워함

**해결**:
- `recordedAt` 필드를 활동 시간으로 사용
- 등록 시간(`created_at`)은 UI에서 제거하여 혼란 방지
- 날짜 포맷: `YYYY-MM-DD HH:MM` + 요일 표시

**코드 변경**:
```typescript
// 활동 시간 표시
<p className="text-xs text-muted-foreground">
  {formatDateWithDay(record.recordedAt)}
</p>

// formatDateWithDay 함수
function formatDateWithDay(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${year}-${month}-${day} ${hours}:${minutes} (${dayOfWeek})`;
}
```

#### 1.2 개인별 누적 통계 추가
**파일**: `src/app/missions/[missionId]/page.tsx`, `src/lib/supabase/rest.ts`

**기능**:
- 최근 기록 영역에 각 참여자의 누적 통계 표시
- 표시 항목: 누적 거리, 누적 시간, 평균 페이스

**구현**:
```typescript
// rest.ts - 미션 통계 조회 함수
export async function fetchMissionStats(missionId: string) {
  const data = await supabaseRest<MissionParticipantStat[]>(
    `mission_participant_stats?mission_id=eq.${missionId}&select=profile_id,total_records,total_distance_km,total_duration_seconds,avg_pace_seconds_per_km`
  );
  return data.map((stat) => ({
    profileId: stat.profile_id,
    totalRecords: stat.total_records,
    totalDistanceKm: stat.total_distance_km,
    totalDurationSeconds: stat.total_duration_seconds,
    avgPaceSecondsPerKm: stat.avg_pace_seconds_per_km,
  }));
}

// 미션 상세 페이지에서 통계 표시
{recentRecords.map((record) => {
  const userStat = stats.find((s) => s.profileId === record.profile?.id);
  return (
    <div key={record.id}>
      <p className="font-medium">{record.profile?.display_name ?? "익명"}</p>
      {userStat && (
        <p className="text-xs text-muted-foreground">
          누적: {userStat.totalDistanceKm.toFixed(2)}km ·
          {formatDuration(userStat.totalDurationSeconds)} ·
          {formatPace(userStat.avgPaceSecondsPerKm)}/km
        </p>
      )}
    </div>
  );
})}
```

#### 1.3 참여자 수 표시 로직 수정
**파일**: `src/app/missions/[missionId]/page.tsx`

**조건**:
- `mission_participants` 테이블의 `status` 필드가 `'joined'`인 경우만 카운트
- 타이틀: "최근 기록 (총 X명 참가 중)" 형태로 변경

---

### 2. 기록 업로드 페이지 개선

#### 2.1 운동 시간 입력 UX 개선
**파일**: `src/app/records/upload/page.tsx`

**문제**:
- 운동 시간 입력 중 숫자나 `:` 입력하면 바로 초기화됨
- `04:34:24` 같은 값을 제대로 입력할 수 없음

**해결**:
- `onChange` 이벤트에서는 검증 없이 자유롭게 입력 허용
- `onBlur` 이벤트에서 형식 검증 및 변환 수행

**코드 변경**:
```typescript
// 입력 중에는 자유롭게 타이핑 허용
function handleDurationChange(value: string) {
  setDurationInput(value);
}

// 포커스 벗어날 때 검증 및 포맷팅
function handleDurationBlur() {
  const parsed = parseDurationInput(durationInput);
  if (parsed === null) {
    setDurationInputValid(false);
    setDurationSeconds("");
    setPaceSecondsPerKm("");
    setPaceInput("");
    return;
  }
  setDurationInputValid(true);
  setDurationSeconds(parsed.toString());
  setDurationInput(formatSecondsToHhMmSs(parsed));

  // 거리와 페이스 자동 계산
  if (distanceKm) {
    const calculatedPace = Math.round(parsed / parseFloat(distanceKm));
    setPaceSecondsPerKm(calculatedPace.toString());
    setPaceInput(formatSecondsToMmSs(calculatedPace));
  }
}

// 입력 파싱 함수 (부분 입력 허용)
function parseDurationInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length > 3) return null;

  // 타이핑 중 부분 입력 허용
  if (parts.some((part) => !/^[0-9]*$/.test(part))) return null;

  const paddedParts = parts.map((part) => part.padStart(2, "0"));
  const [h, m, s] = paddedParts.length === 3
    ? paddedParts
    : paddedParts.length === 2
    ? ["00", paddedParts[0], paddedParts[1]]
    : ["00", "00", paddedParts[0]];

  const hours = parseInt(h, 10);
  const minutes = parseInt(m, 10);
  const seconds = parseInt(s, 10);
  if ([hours, minutes, seconds].some((n) => Number.isNaN(n))) return null;
  return hours * 3600 + minutes * 60 + seconds;
}
```

#### 2.2 활동 시간 타임존 오류 수정
**파일**: `src/app/records/upload/page.tsx`

**문제**:
- `datetime-local` 입력값 `2025-08-07T22:00`이 DB에 `2025-08-07T13:00:00.000Z`로 저장됨
- 9시간 차이 발생 (한국 타임존 오프셋)

**원인**:
- `datetime-local`은 로컬 시간을 반환
- `new Date()`로 변환 시 UTC로 해석되어 타임존 오프셋 적용됨

**해결**:
```typescript
// datetime-local 값을 로컬 시간 그대로 저장 (타임존 오프셋 보정)
const recordedDate = new Date(recordedAt);
const recordedAtISO = new Date(
  recordedDate.getTime() - recordedDate.getTimezoneOffset() * 60000
).toISOString();

console.log("[Submit] recordedAt (input value):", recordedAt);
console.log("[Submit] recordedAtISO (will save):", recordedAtISO);
```

**검증**:
- 입력: `2025-08-07T22:00`
- 저장: `2025-08-07T22:00:00.000Z`
- 정상 작동 확인

#### 2.3 저장 성공 후 리다이렉트 수정
**파일**: `src/app/records/upload/page.tsx`

**변경**:
- 기존: 크루 상세 페이지로 이동 (`/crews/${slug}`)
- 변경: 미션 상세 페이지로 이동 (`/missions/${missionId}`)

**코드**:
```typescript
setTimeout(() => {
  router.push(`/missions/${missionId}`);
}, 600);
```

---

### 3. 대시보드 페이지 전면 개편

#### 3.1 목업에서 실제 데이터 연동으로 전환
**파일**: `src/app/page.tsx`, `src/lib/supabase/rest.ts`

**변경 사항**:
- Server Component → Client Component 전환 (`"use client"`)
- `useSupabase` 훅 사용하여 사용자 인증 상태 확인
- 실제 데이터 fetch 함수 구현

**새로 추가된 REST API 함수들**:

```typescript
// 1. 사용자 참여 중인 미션 목록
export async function fetchUserParticipatingMissions(profileId: string) {
  const encoded = encodeURIComponent(profileId);
  const data = await supabaseRest<MissionParticipant[]>(
    `mission_participants?profile_id=eq.${encoded}&status=eq.joined&select=mission_id,status,mission:missions(id,title,description,start_date,end_date,target_distance_km,crew:crews(id,slug,name))`
  );
  // ... 데이터 매핑
}

// 2. 사용자 최근 기록
export async function fetchUserRecentRecords(profileId: string, limit = 5) {
  const encoded = encodeURIComponent(profileId);
  const data = await supabaseRest<RecordRow[]>(
    `records?profile_id=eq.${encoded}&select=id,distance_km,duration_seconds,pace_seconds_per_km,recorded_at,mission:missions(id,title,crew:crews(name))&order=recorded_at.desc&limit=${limit}`
  );
  // ... 데이터 매핑
}

// 3. 사용자 전체 통계
export async function fetchUserOverallStats(profileId: string) {
  const encoded = encodeURIComponent(profileId);
  const data = await supabaseRest<MissionParticipantStat[]>(
    `mission_participant_stats?profile_id=eq.${encoded}&select=total_records,total_distance_km,total_duration_seconds,avg_pace_seconds_per_km`
  );

  // 모든 미션의 통계를 합산
  const totalRecords = data.reduce((sum, stat) => sum + stat.total_records, 0);
  const totalDistanceKm = data.reduce((sum, stat) => sum + stat.total_distance_km, 0);
  const totalDurationSeconds = data.reduce((sum, stat) => sum + stat.total_duration_seconds, 0);
  const avgPaceSecondsPerKm = totalDistanceKm > 0
    ? Math.round(totalDurationSeconds / totalDistanceKm)
    : null;

  return { totalRecords, totalDistanceKm, totalDurationSeconds, avgPaceSecondsPerKm };
}
```

**페이지 구조**:
```typescript
export default function Home() {
  const { user, loading, profile } = useSupabase();
  const [missions, setMissions] = useState<...>([]);
  const [recentRecords, setRecentRecords] = useState<...>([]);
  const [stats, setStats] = useState<...>(null);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      fetchUserParticipatingMissions(user.id),
      fetchUserRecentRecords(user.id, 5),
      fetchUserOverallStats(user.id),
    ]).then(([missionsData, recordsData, statsData]) => {
      setMissions(missionsData);
      setRecentRecords(recordsData);
      setStats(statsData);
    });
  }, [user]);

  // ... 렌더링
}
```

#### 3.2 통계 카드 디자인 개선
**파일**: `src/app/page.tsx`

**요구사항**:
- 4개의 분리된 통계 카드 → 1개의 통합 Summary 카드
- 그라디언트 배경 적용
- 프로필 사진 + 이름 표시
- 페이지 상단 헤더 제거

**구현**:
```typescript
<Card className="overflow-hidden border-border/70 bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/20 dark:to-background">
  <CardHeader>
    <div className="flex items-center gap-4">
      {/* 프로필 사진 */}
      <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-border/60 bg-muted">
        {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
          <Image
            src={profile?.avatar_url || user?.user_metadata?.avatar_url}
            alt="프로필"
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-emerald-500/10 text-2xl text-emerald-700">
            {(profile?.display_name || user?.email || "?").charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* 이름 및 타이틀 */}
      <div>
        <CardTitle className="text-2xl">
          {profile?.display_name || user?.email || "러너"}님의 대시보드
        </CardTitle>
        <CardDescription>전체 미션 활동 요약</CardDescription>
      </div>
    </div>
  </CardHeader>

  <CardContent>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* 총 기록 수 */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">총 기록 수</p>
        <p className="text-4xl font-bold tracking-tight">{stats?.totalRecords ?? 0}</p>
      </div>

      {/* 총 거리 */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">총 거리</p>
        <p className="text-4xl font-bold tracking-tight">
          {stats?.totalDistanceKm.toFixed(1) ?? 0}
          <span className="ml-1 text-xl text-muted-foreground">km</span>
        </p>
      </div>

      {/* 총 시간 */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">총 시간</p>
        <p className="text-4xl font-bold tracking-tight">
          {formatDuration(stats?.totalDurationSeconds ?? 0)}
        </p>
      </div>

      {/* 평균 페이스 */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">평균 페이스</p>
        <p className="text-4xl font-bold tracking-tight">
          {stats?.avgPaceSecondsPerKm
            ? formatPace(stats.avgPaceSecondsPerKm)
            : "--:--"}
          <span className="ml-1 text-xl text-muted-foreground">/km</span>
        </p>
      </div>
    </div>
  </CardContent>
</Card>
```

#### 3.3 비로그인 사용자를 위한 랜딩 페이지 추가
**파일**: `src/app/page.tsx`

**문제**:
- 비로그인 상태에서 대시보드가 보이는 것은 부적절
- 별도 홈 페이지 필요

**선택한 방안**:
**옵션 1**: 대시보드를 이중 목적 페이지로 전환
- 비로그인: 서비스 소개 + 인기 크루/미션 미리보기
- 로그인: 개인 대시보드

**구현**:
```typescript
export default function Home() {
  const { user, loading, profile } = useSupabase();
  const [publicCrews, setPublicCrews] = useState<...>([]);
  const [publicMissions, setPublicMissions] = useState<...>([]);

  useEffect(() => {
    if (!user) {
      // 비로그인 사용자: 공개 데이터 로드
      Promise.all([
        fetchCrewList(),
        fetchMissionList(),
      ]).then(([crewsData, missionsData]) => {
        setPublicCrews(crewsData.slice(0, 3));
        setPublicMissions(missionsData.slice(0, 3));
      });
      return;
    }

    // 로그인 사용자: 개인 데이터 로드
    // ...
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center py-12">로딩 중...</div>;
  }

  // 비로그인 사용자 UI
  if (!user) {
    return (
      <div className="space-y-16 py-8">
        {/* 히어로 섹션 */}
        <section className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            러닝크루와 함께 달리기를 더 즐겁게
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            크루를 만들고, 미션에 도전하고, 기록을 공유하세요.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Button asChild size="lg">
              <Link href="/auth/signin">시작하기</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/crews">크루 둘러보기</Link>
            </Button>
          </div>
        </section>

        {/* 주요 기능 */}
        <section className="space-y-8">
          <h2 className="text-center text-2xl font-bold">주요 기능</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>크루 만들기</CardTitle>
                <CardDescription>
                  함께 달릴 동료들과 크루를 만들어보세요
                </CardDescription>
              </CardHeader>
            </Card>
            {/* 다른 기능 카드들... */}
          </div>
        </section>

        {/* 인기 크루 미리보기 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">인기 크루</h2>
            <Button asChild variant="ghost">
              <Link href="/crews">전체 보기 →</Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {publicCrews.map((crew, index) => (
              <Card key={`crew-${crew.id}-${index}`}>
                {/* 크루 카드 내용 */}
              </Card>
            ))}
          </div>
        </section>

        {/* 진행 중인 미션 미리보기 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">진행 중인 미션</h2>
            <Button asChild variant="ghost">
              <Link href="/missions">전체 보기 →</Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {publicMissions.map((mission, index) => (
              <Card key={`mission-${mission.id}-${index}`}>
                {/* 미션 카드 내용 */}
              </Card>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // 로그인 사용자 대시보드 UI
  return (
    <div className="space-y-8 py-8">
      {/* 통계 카드 */}
      {/* 참여 중인 미션 */}
      {/* 최근 기록 */}
    </div>
  );
}
```

**새로 추가된 REST API 함수**:

```typescript
// 크루 목록 (리더 프로필 포함)
export async function fetchCrewList() {
  const data = await supabaseRest<CrewListItem[]>(
    "crews?select=id,slug,name,activity_region,description,logo_image_url,owner_id,crew_members(profile_id),owner_profile:profiles!owner_id(display_name,avatar_url)&order=created_at.desc"
  );

  return data.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    activityRegion: item.activity_region,
    description: item.description,
    logoImageUrl: item.logo_image_url,
    memberCount: item.crew_members?.length ?? 0,
    ownerProfile: item.owner_profile,
  }));
}

// 미션 목록 (평면 배열)
export async function fetchMissionList() {
  const data = await supabaseRest<MissionRow[]>(
    "missions?select=id,title,description,start_date,end_date,target_distance_km,mission_participants(status,profile_id),crew:crews(id,slug,name,description,activity_region,owner_id)&order=start_date.desc"
  );

  return data.map((mission) => ({
    id: mission.id,
    title: mission.title,
    description: mission.description,
    startDate: mission.start_date,
    endDate: mission.end_date,
    targetDistanceKm: mission.target_distance_km,
    participantsCount: mission.mission_participants?.filter((p) => p?.status === "joined").length ?? 0,
    crew: mission.crew ? {
      id: mission.crew.id,
      slug: mission.crew.slug,
      name: mission.crew.name,
      description: mission.crew.description,
      activityRegion: mission.crew.activity_region,
      ownerId: mission.crew.owner_id,
    } : null,
  }));
}
```

#### 3.4 크루 카드 UI 개선 (리더 프로필 추가)
**파일**: `src/app/page.tsx`

**요구사항**:
1. 크루 로고를 왼쪽에 표시
2. 크루 정보를 중앙에 표시
3. 리더 프로필을 오른쪽에 표시
4. 리더 프로필 위에 배지 이모지 오버랩
5. 회원 수를 크루명 옆으로 이동

**최종 구현**:
```typescript
<Card key={`crew-${crew.id}-${index}`}>
  <CardHeader>
    <div className="flex items-start gap-3">
      {/* 크루 로고 - 왼쪽 */}
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
        {crew.logoImageUrl ? (
          <Image
            src={crew.logoImageUrl}
            alt={crew.name}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-lg font-bold text-muted-foreground">
            {crew.name.charAt(0)}
          </div>
        )}
      </div>

      {/* 크루 정보 - 중앙 */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{crew.name}</h3>
          <span className="text-xs text-muted-foreground">
            {crew.memberCount}명
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {crew.activityRegion}
        </p>
      </div>

      {/* 리더 프로필 - 오른쪽 */}
      <div className="relative flex-shrink-0">
        <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-border/60 bg-muted">
          {crew.ownerProfile?.avatar_url ? (
            <Image
              src={crew.ownerProfile.avatar_url}
              alt={crew.ownerProfile.display_name ?? "리더"}
              fill
              className="object-cover"
              sizes="40px"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-sm font-semibold text-muted-foreground">
              {crew.ownerProfile?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>
        {/* 리더 배지 - 오버랩 */}
        <span className="absolute -right-1 -top-1 text-sm">⭐</span>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <p className="line-clamp-2 text-sm text-muted-foreground">
      {crew.description || "크루 소개가 없습니다."}
    </p>
  </CardContent>
</Card>
```

---

### 4. 크루 목록 페이지 개선

#### 4.1 로고 이미지 크롭 방지
**파일**: `src/app/crews/page.tsx`

**문제**:
- 크루 로고 이미지가 잘림 (cropped)
- 정사각형이 아닌 이미지의 비율이 깨짐

**해결**:
```typescript
<Link href={`/crews/${crew.slug}`} className="relative block h-40 w-full bg-muted">
  {crew.logoImageUrl ? (
    <Image
      src={crew.logoImageUrl}
      alt={`${crew.name} 로고`}
      fill
      sizes="(min-width: 1024px) 33vw, 100vw"
      className="object-contain p-4"  // object-cover → object-contain + padding
    />
  ) : (
    <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">
      이미지 준비 중
    </div>
  )}
</Link>
```

**변경 사항**:
- `object-cover` → `object-contain`: 비율 유지하며 전체 이미지 표시
- `p-4` 추가: 여백을 주어 시각적 개선

---

### 5. Next.js 15 호환성 수정

#### 5.1 동적 라우트 params 비동기 처리
**파일**: `src/app/crews/[crewId]/page.tsx`, `src/app/missions/[missionId]/page.tsx`

**문제**:
- Next.js 15에서 `params`를 동기적으로 사용하면 경고 발생
- `Route used params.crewId. params should be awaited before using its properties`

**해결**:
```typescript
// Before (동기)
export default async function CrewDetailPage({
  params
}: {
  params: { crewId: string }
}) {
  const crew = await fetchCrewBySlug(params.crewId);
  // ...
}

// After (비동기)
export default async function CrewDetailPage({
  params
}: {
  params: Promise<{ crewId: string }>
}) {
  const { crewId } = await params;
  const crew = await fetchCrewBySlug(crewId);
  // ...
}

// generateMetadata도 동일하게 수정
export async function generateMetadata({
  params
}: {
  params: Promise<{ crewId: string }>
}): Promise<Metadata> {
  const { crewId } = await params;
  const crew = await fetchCrewBySlug(crewId);
  // ...
}
```

**적용 파일**:
- `src/app/crews/[crewId]/page.tsx`
- `src/app/missions/[missionId]/page.tsx`

---

### 6. 데이터베이스 및 RLS 정책 수정

#### 6.1 통계 테이블 및 트리거 생성
**파일**: `supabase/migrations/20250330001000_mission_participant_stats.sql`

**목적**:
- 미션별/참여자별 통계를 효율적으로 조회
- 실시간 집계보다 트리거 기반 업데이트로 성능 향상

**스키마**:
```sql
create table if not exists public.mission_participant_stats (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  total_records int not null default 0,
  total_distance_km numeric(10,2) not null default 0,
  total_duration_seconds int not null default 0,
  avg_pace_seconds_per_km int,
  last_record_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(mission_id, profile_id)
);
```

**트리거**:
```sql
-- 기록 추가/수정/삭제 시 통계 자동 업데이트
create or replace function update_mission_participant_stats()
returns trigger as $$
begin
  if (TG_OP = 'DELETE') then
    -- 삭제 시 통계 재계산
    update public.mission_participant_stats
    set
      total_records = (select count(*) from public.records where mission_id = OLD.mission_id and profile_id = OLD.profile_id),
      total_distance_km = (select coalesce(sum(distance_km), 0) from public.records where mission_id = OLD.mission_id and profile_id = OLD.profile_id),
      total_duration_seconds = (select coalesce(sum(duration_seconds), 0) from public.records where mission_id = OLD.mission_id and profile_id = OLD.profile_id),
      avg_pace_seconds_per_km = (
        select case
          when sum(distance_km) > 0 then round(sum(duration_seconds) / sum(distance_km))::int
          else null
        end
        from public.records
        where mission_id = OLD.mission_id and profile_id = OLD.profile_id
      ),
      last_record_at = (select max(recorded_at) from public.records where mission_id = OLD.mission_id and profile_id = OLD.profile_id),
      updated_at = now()
    where mission_id = OLD.mission_id and profile_id = OLD.profile_id;
    return OLD;
  else
    -- 추가/수정 시 통계 upsert
    insert into public.mission_participant_stats (mission_id, profile_id, total_records, total_distance_km, total_duration_seconds, avg_pace_seconds_per_km, last_record_at)
    select
      NEW.mission_id,
      NEW.profile_id,
      count(*),
      sum(distance_km),
      sum(duration_seconds),
      case when sum(distance_km) > 0 then round(sum(duration_seconds) / sum(distance_km))::int else null end,
      max(recorded_at)
    from public.records
    where mission_id = NEW.mission_id and profile_id = NEW.profile_id
    on conflict (mission_id, profile_id) do update
    set
      total_records = EXCLUDED.total_records,
      total_distance_km = EXCLUDED.total_distance_km,
      total_duration_seconds = EXCLUDED.total_duration_seconds,
      avg_pace_seconds_per_km = EXCLUDED.avg_pace_seconds_per_km,
      last_record_at = EXCLUDED.last_record_at,
      updated_at = now();
    return NEW;
  end if;
end;
$$ language plpgsql;

create trigger on_record_change
  after insert or update or delete on public.records
  for each row execute function update_mission_participant_stats();
```

**RLS 정책**:
```sql
alter table public.mission_participant_stats enable row level security;

create policy "Mission stats publicly viewable" on public.mission_participant_stats
  for select using (true);
```

#### 6.2 크루 멤버 공개 읽기 권한 추가
**파일**: `supabase/migrations/20250330001100_fix_crew_members_public_read.sql`

**문제**:
- 비로그인 사용자가 크루 멤버 수를 볼 수 없음
- `crew_members` 테이블의 RLS 정책이 너무 제한적

**해결**:
```sql
-- 기존 정책 삭제
drop policy if exists "Crew members publicly viewable" on public.crew_members;

-- 공개 읽기 권한 추가
create policy "Crew members publicly viewable" on public.crew_members
  for select
  using (true);
```

**영향**:
- 크루 멤버 목록 조회: 누구나 가능
- 크루 멤버 추가/수정/삭제: 기존 정책 유지 (제한적)

---

### 7. Supabase 클라이언트 설정

#### 7.1 서버 사이드 클라이언트 생성
**파일**: `src/lib/supabase/server.ts`

**목적**:
- Server Components에서 Supabase 사용
- Cookie 기반 인증 처리

**구현**:
```typescript
import { createServerClient } from "@supabase/ssr";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import type { Database } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function createClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component에서 호출 시 무시
        }
      },
    },
  });
}
```

**사용 예시**:
```typescript
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function SomeServerComponent() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const { data, error } = await supabase.from("table").select("*");
  // ...
}
```

#### 7.2 패키지 설치
**명령어**: `npm install @supabase/ssr`

**이유**:
- `@supabase/ssr` 패키지가 누락되어 있었음
- Next.js App Router에서 SSR 지원을 위해 필요

---

## 주요 이슈 및 해결

### Issue 1: 크루 멤버 수가 0으로 표시
**증상**:
- 실제로 1명의 멤버가 있는 YTRC 크루가 0명으로 표시됨

**원인**:
1. RLS 정책: `crew_members` 테이블이 로그인된 사용자나 크루 오너만 조회 가능
2. 쿼리 방식: PostgREST의 `count` 집계가 RLS에 의해 차단됨

**해결 과정**:
1. 쿼리 변경: `crew_members(count)` → `crew_members(profile_id)`
2. 카운트 방식: 서버에서 집계 → 클라이언트에서 배열 길이 계산
3. RLS 정책: 공개 읽기 권한 추가 (migration)

**최종 코드**:
```typescript
// REST API 쿼리
const data = await supabaseRest<CrewListItem[]>(
  "crews?select=id,slug,name,activity_region,description,logo_image_url,owner_id,crew_members(profile_id),owner_profile:profiles!owner_id(display_name,avatar_url)&order=created_at.desc"
);

// 멤버 수 계산
return data.map((item) => ({
  // ...
  memberCount: item.crew_members?.length ?? 0,
}));
```

**Migration**:
```sql
create policy "Crew members publicly viewable" on public.crew_members
  for select using (true);
```

### Issue 2: 미션이 랜딩 페이지에 표시되지 않음
**증상**:
- 실제로 진행 중인 미션이 있지만 비로그인 사용자에게 보이지 않음

**원인**:
- 잘못된 함수 사용: `fetchMissionGroups()`를 호출
- 이 함수는 크루별로 그룹화된 구조를 반환하여 평면 배열이 필요한 랜딩 페이지에서 사용 불가

**해결**:
```typescript
// 새로운 함수 생성: fetchMissionList()
export async function fetchMissionList() {
  const data = await supabaseRest<MissionRow[]>(
    "missions?select=id,title,description,start_date,end_date,target_distance_km,mission_participants(status,profile_id),crew:crews(id,slug,name,description,activity_region,owner_id)&order=start_date.desc"
  );

  return data.map((mission) => ({
    id: mission.id,
    title: mission.title,
    description: mission.description,
    startDate: mission.start_date,
    endDate: mission.end_date,
    targetDistanceKm: mission.target_distance_km,
    participantsCount: mission.mission_participants?.filter((p) => p?.status === "joined").length ?? 0,
    crew: mission.crew ? { /* ... */ } : null,
  }));
}
```

### Issue 3: React key prop 경고
**증상**:
```
Warning: Each child in a list should have a unique "key" prop.
```

**원인**:
- 같은 페이지에서 동일한 `crew.id`나 `mission.id`를 key로 사용
- 이론적으로는 고유하지만 React는 같은 렌더 트리에서 경고 발생

**해결**:
```typescript
// Before
{publicCrews.map((crew) => (
  <Card key={crew.id}>

// After
{publicCrews.map((crew, index) => (
  <Card key={`crew-${crew.id}-${index}`}>

// 미션도 동일
{publicMissions.map((mission, index) => (
  <Card key={`mission-${mission.id}-${index}`}>
```

---

## 데이터베이스 스키마 요약

### 주요 테이블

#### `profiles`
```sql
- id (uuid, pk)
- display_name (text)
- avatar_url (text)
- bio (text)
- created_at (timestamptz)
```

#### `crews`
```sql
- id (uuid, pk)
- slug (text, unique)
- name (text)
- activity_region (text)
- description (text)
- logo_image_url (text)
- owner_id (uuid, fk → profiles.id)
- created_at (timestamptz)
```

#### `crew_members`
```sql
- id (uuid, pk)
- crew_id (uuid, fk → crews.id)
- profile_id (uuid, fk → profiles.id)
- role (text: 'owner' | 'admin' | 'member')
- joined_at (timestamptz)
- unique(crew_id, profile_id)
```

#### `missions`
```sql
- id (uuid, pk)
- crew_id (uuid, fk → crews.id)
- title (text)
- description (text)
- start_date (date)
- end_date (date)
- target_distance_km (numeric)
- created_at (timestamptz)
```

#### `mission_participants`
```sql
- id (uuid, pk)
- mission_id (uuid, fk → missions.id)
- profile_id (uuid, fk → profiles.id)
- status (text: 'pending' | 'joined' | 'left')
- joined_at (timestamptz)
- unique(mission_id, profile_id)
```

#### `records`
```sql
- id (uuid, pk)
- mission_id (uuid, fk → missions.id)
- profile_id (uuid, fk → profiles.id)
- distance_km (numeric)
- duration_seconds (int)
- pace_seconds_per_km (int)
- recorded_at (timestamptz) -- 운동 시각
- raw_image_url (text)
- created_at (timestamptz) -- 등록 시각
```

#### `mission_participant_stats` (새로 추가)
```sql
- id (uuid, pk)
- mission_id (uuid, fk → missions.id)
- profile_id (uuid, fk → profiles.id)
- total_records (int)
- total_distance_km (numeric)
- total_duration_seconds (int)
- avg_pace_seconds_per_km (int)
- last_record_at (timestamptz)
- created_at (timestamptz)
- updated_at (timestamptz)
- unique(mission_id, profile_id)
```

### RLS 정책 변경 사항

#### `crew_members` 공개 읽기 추가
```sql
-- 누구나 크루 멤버 목록 조회 가능 (멤버 수 확인용)
create policy "Crew members publicly viewable" on public.crew_members
  for select using (true);
```

#### `mission_participant_stats` 공개 읽기
```sql
-- 누구나 미션 통계 조회 가능
create policy "Mission stats publicly viewable" on public.mission_participant_stats
  for select using (true);
```

---

## 파일 구조

```
src/
├── app/
│   ├── page.tsx                           # 대시보드/랜딩 페이지 (이중 목적)
│   ├── layout.tsx                         # 루트 레이아웃
│   ├── auth/                              # 인증 관련 페이지
│   ├── crews/
│   │   ├── page.tsx                       # 크루 목록
│   │   ├── [crewId]/
│   │   │   └── page.tsx                   # 크루 상세
│   │   └── create/
│   │       └── page.tsx                   # 크루 생성
│   ├── missions/
│   │   ├── page.tsx                       # 미션 목록
│   │   ├── [missionId]/
│   │   │   └── page.tsx                   # 미션 상세 (통계 포함)
│   │   └── create/
│   │       └── page.tsx                   # 미션 생성
│   └── records/
│       └── upload/
│           └── page.tsx                   # 기록 업로드
├── components/
│   ├── ui/                                # shadcn/ui 컴포넌트
│   ├── crew/                              # 크루 관련 컴포넌트
│   ├── dashboard/                         # 대시보드 컴포넌트
│   └── providers/
│       └── supabase-provider.tsx          # Supabase 컨텍스트
└── lib/
    ├── supabase/
    │   ├── client.ts                      # 클라이언트 사이드 Supabase
    │   ├── server.ts                      # 서버 사이드 Supabase (새로 추가)
    │   ├── rest.ts                        # REST API 함수들 (대폭 확장)
    │   └── types.ts                       # 타입 정의
    └── utils.ts                           # 유틸리티 함수

supabase/
└── migrations/
    ├── 20250330000100_update_crews_and_members.sql
    ├── 20250330000200_crew_owner_trigger.sql
    ├── 20250330000300_profiles_insert_policy.sql
    ├── 20250330000400_storage_crew_assets_policy.sql
    ├── 20250330000500_mission_participants.sql
    ├── 20250330000600_update_records_policies.sql
    ├── 20250330000700_storage_records_raw_policy.sql
    ├── 20250330001000_mission_participant_stats.sql    # 통계 테이블 + 트리거
    └── 20250330001100_fix_crew_members_public_read.sql # 크루 멤버 공개 읽기
```

---

## 다음 작업 (TODO)

### 우선순위 높음
1. **OCR 파이프라인 구현**
   - YOLO 전처리 단계 추가
   - 이미지에서 러닝 앱 화면 감지 및 추출
   - Tesseract OCR로 데이터 추출
   - 추출된 데이터 자동 입력

2. **기록 업로드 페이지 개선**
   - 이미지 업로드 시 OCR 자동 실행
   - 수동 입력과 OCR 입력 병행 가능하도록 UX 개선
   - OCR 결과 검증 및 수정 UI

3. **미션 참여 및 관리**
   - 미션 참여 신청/승인 플로우 구현
   - 미션 탈퇴 기능
   - 미션 참여자 관리 (크루 오너/관리자)

### 우선순위 중간
4. **크루 관리 기능**
   - 크루 멤버 초대/승인 시스템
   - 크루 설정 페이지
   - 크루 관리자 권한 관리

5. **알림 시스템**
   - 미션 시작/종료 알림
   - 새 기록 등록 알림
   - 크루 초대 알림

6. **소셜 기능**
   - 기록에 댓글/좋아요
   - 활동 피드
   - 랭킹 시스템

### 우선순위 낮음
7. **성능 최적화**
   - 이미지 최적화 (Next.js Image)
   - 데이터 페이지네이션
   - 캐싱 전략 수립

8. **테스트**
   - E2E 테스트 (Playwright)
   - 단위 테스트 (Jest)
   - API 테스트

9. **문서화**
   - API 문서
   - 사용자 가이드
   - 기여 가이드

---

## 알려진 이슈

없음 (모든 보고된 이슈 해결 완료)

---

## 배포 체크리스트

배포 전 확인 사항:
- [ ] 환경 변수 설정 확인 (`.env.local`)
- [ ] Supabase 마이그레이션 실행 완료
- [ ] RLS 정책 활성화 확인
- [ ] Storage 버킷 생성 및 정책 설정
- [ ] 이미지 최적화 설정
- [ ] 에러 바운더리 추가
- [ ] SEO 메타데이터 설정
- [ ] 로딩 상태 처리
- [ ] 에러 페이지 커스터마이징

---

## 참고 자료

- [Next.js 15 문서](https://nextjs.org/docs)
- [Supabase 문서](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [PostgREST API](https://postgrest.org/)

---

## 최근 세션 작업 내역 (2025-10-02)

### 8. 브랜딩 및 SEO 개선

#### 8.1 크루 로고 블러 배경 효과
**파일**: `src/app/page.tsx`, `src/app/crews/page.tsx`

**요구사항**:
- 크루 카드에 로고 이미지의 블러 효과를 배경으로 적용
- 음악 플레이어 앱의 앨범 아트 블러 효과 참고

**구현**:
```typescript
<Link href={`/crews/${crew.slug}`} className="group relative block overflow-hidden rounded-lg border border-border/60 transition hover:border-border">
  {/* 블러 배경 */}
  {crew.logoImageUrl && (
    <div className="absolute inset-0 -z-10">
      <Image
        src={crew.logoImageUrl}
        alt=""
        fill
        className="scale-110 object-cover opacity-20 blur-2xl saturate-150"
        sizes="400px"
      />
    </div>
  )}
  {/* Content with backdrop-blur */}
  <div className="relative bg-background/80 p-4 backdrop-blur-sm">
    {/* Crew info */}
  </div>
</Link>
```

**효과**:
- `scale-110`: 배경 이미지 확대로 블러 경계 처리
- `opacity-20`: 낮은 투명도로 텍스트 가독성 유지
- `blur-2xl` / `blur-3xl`: 강한 블러 효과
- `saturate-150`: 채도 증가로 색상 강조
- `backdrop-blur-sm`: 콘텐츠 영역에 추가 블러

#### 8.2 새 로고 디자인 적용
**파일**: `src/components/site-nav.tsx`, `public/logo_text-removebg.png`

**변경 사항**:
- 기존: 햄버거 메뉴 + "RunningCrew" 텍스트 SVG
- 신규: 주황색 그라데이션 라인 + "runningcrew" 텍스트 PNG
- 디자인 컨셉: 여러 라인이 모여 달리는 속도감과 크루의 연대감 표현

**코드**:
```typescript
<Link href="/" className="flex items-center">
  <Image
    src="/logo_text-removebg.png"
    alt="RunningCrew"
    width={140}
    height={56}
    priority
    style={{ width: '140px', height: 'auto' }}
  />
</Link>
```

**주의사항**:
- `priority` 속성: LCP(Largest Contentful Paint) 최적화
- `style={{ height: 'auto' }}`: 이미지 비율 유지

#### 8.3 Favicon 적용
**파일**: `src/app/layout.tsx`, `public/favicon/*`

**추가된 파일**:
- `favicon.ico` (16x16, 32x32, 48x48)
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png` (180x180)
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`

**메타데이터 설정**:
```typescript
export const metadata: Metadata = {
  // ...
  icons: {
    icon: [
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "android-chrome-192x192", url: "/favicon/android-chrome-192x192.png" },
      { rel: "android-chrome-512x512", url: "/favicon/android-chrome-512x512.png" },
    ],
  },
};
```

#### 8.4 SEO 메타데이터 설정
**파일**: `src/app/layout.tsx`, `src/app/crews/page.tsx`, `src/app/missions/page.tsx`

**루트 레이아웃 메타데이터**:
```typescript
export const metadata: Metadata = {
  title: {
    default: "RunningCrew - 함께 달리는 즐거움",
    template: "%s | RunningCrew",
  },
  description: "러닝 크루와 함께 미션을 완수하고 기록을 공유하세요. 크루를 만들고, 미션에 도전하고, 러닝 기록을 관리하는 플랫폼입니다.",
  keywords: ["러닝", "러닝크루", "달리기", "마라톤", "운동기록", "러닝앱", "크루", "미션챌린지"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3004"),
  openGraph: {
    title: "RunningCrew - 함께 달리는 즐거움",
    description: "러닝 크루와 함께 미션을 완수하고 기록을 공유하세요",
    url: "/",
    siteName: "RunningCrew",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 1200,
        alt: "RunningCrew - 함께 달리는 즐거움",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RunningCrew - 함께 달리는 즐거움",
    description: "러닝 크루와 함께 미션을 완수하고 기록을 공유하세요",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};
```

**페이지별 메타데이터 예시** (크루 탐색):
```typescript
export const metadata: Metadata = {
  title: "크루 탐색",
  description: "함께 달릴 러닝 크루를 찾아보세요. 다양한 지역과 목표를 가진 러닝 크루들이 활동하고 있습니다.",
  openGraph: {
    title: "크루 탐색 | RunningCrew",
    description: "함께 달릴 러닝 크루를 찾아보세요",
  },
};
```

#### 8.5 검색엔진 인증 설정
**파일**: `src/app/layout.tsx`, `.env.local.example`

**환경변수**:
```bash
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION="your-google-verification-code"
NEXT_PUBLIC_NAVER_SITE_VERIFICATION="your-naver-verification-code"
```

**메타데이터**:
```typescript
export const metadata: Metadata = {
  // ...
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
    ? {
        verification: {
          ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && {
            google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
          }),
          ...(process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION && {
            other: {
              "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION,
            },
          }),
        },
      }
    : {}),
};
```

**동적 조건부 렌더링**:
- 환경변수가 설정되지 않은 경우 빈 객체 반환
- 빌드 에러 방지

#### 8.6 robots.txt 및 sitemap.xml 생성
**파일**: `public/robots.txt`, `src/app/sitemap.ts`

**robots.txt**:
```txt
# *
User-agent: *
Allow: /

# Disallow private routes
Disallow: /api/

# Host
Host: ${NEXT_PUBLIC_SITE_URL}

# Sitemaps
Sitemap: ${NEXT_PUBLIC_SITE_URL}/sitemap.xml
```

**sitemap.ts** (동적 생성):
```typescript
import { MetadataRoute } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3004";
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    // ... 다른 정적 페이지들
  ];

  // Dynamic crew pages
  const { data: crews } = await supabase
    .from("crews")
    .select("slug, updated_at")
    .order("updated_at", { ascending: false });

  const crewPages: MetadataRoute.Sitemap =
    (crews as { slug: string; updated_at: string }[] | null)?.map((crew) => ({
      url: `${baseUrl}/crews/${crew.slug}`,
      lastModified: new Date(crew.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })) || [];

  // Dynamic mission pages
  const { data: missions } = await supabase
    .from("missions")
    .select("id, updated_at")
    .order("updated_at", { ascending: false });

  const missionPages: MetadataRoute.Sitemap =
    (missions as { id: string; updated_at: string }[] | null)?.map((mission) => ({
      url: `${baseUrl}/missions/${mission.id}`,
      lastModified: new Date(mission.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })) || [];

  return [...staticPages, ...crewPages, ...missionPages];
}
```

**타입 캐스팅 이슈**:
- Supabase 쿼리 결과가 `never` 타입으로 추론되는 문제
- `as { slug: string; updated_at: string }[]` 타입 어서션으로 해결

#### 8.7 OG 이미지 적용
**파일**: `public/og.png`

**이미지 사양**:
- 크기: 1200x1200px (정사각형)
- 디자인: 그라데이션 배경 + 로고 + 태그라인 "함께 달리는 즐거움"
- 용도: 카카오톡, 페이스북, 트위터 링크 공유 시 표시

---

### 9. TypeScript 빌드 오류 수정

#### 9.1 환경변수 타입 오류
**증상**:
```
Type 'string | undefined' is not assignable to type 'string | number | (string | number)[]'.
```

**원인**:
- `process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`이 `undefined`일 수 있음
- `verification` 필드는 `undefined`를 허용하지 않음

**해결**:
동적 객체 스프레드 패턴 사용
```typescript
...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
  ? {
      verification: {
        ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && {
          google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        }),
        ...(process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION && {
          other: {
            "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION,
          },
        }),
      },
    }
  : {}),
```

#### 9.2 Sitemap 타입 오류
**증상**:
```
Expected 1 arguments, but got 0.
Property 'slug' does not exist on type 'never'.
```

**원인**:
- `createClient()` 함수가 `cookieStore` 파라미터 필요
- Supabase 쿼리 결과가 `never` 타입으로 추론됨

**해결**:
```typescript
// cookies 가져오기
const cookieStore = await cookies();
const supabase = await createClient(cookieStore);

// 타입 어서션
const crewPages: MetadataRoute.Sitemap =
  (crews as { slug: string; updated_at: string }[] | null)?.map((crew) => ({
    url: `${baseUrl}/crews/${crew.slug}`,
    lastModified: new Date(crew.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  })) || [];
```

---

### 10. 카카오 로그인 크래시 이슈 진단

#### 10.1 증상
**문제**:
- 실제 배포 도메인(https://runningcrew.io)에서 카카오 로그인 시 브라우저 탭 크래시
- 로컬 환경에서는 정상 작동
- 로그 확인 불가 (탭 자체가 사라짐)

#### 10.2 원인 분석
**가능한 원인**:
1. **카카오 Redirect URI 미등록**
   - 카카오 개발자 콘솔에 Supabase 콜백 URL 미등록
   - 필요한 URL: `https://blzupvegyrakpkbhxhfp.supabase.co/auth/v1/callback`

2. **Supabase Redirect URLs 미설정**
   - 실제 도메인이 Supabase 허용 목록에 없음
   - Site URL이 `localhost:3000`으로 설정되어 있음

3. **환경변수 누락**
   - Vercel에 `NEXT_PUBLIC_SITE_URL` 설정 필요

#### 10.3 해결 방법
**Supabase URL Configuration 설정**:
1. **Site URL 변경**:
   ```
   http://localhost:3000 → https://runningcrew.io
   ```

2. **Redirect URLs 추가**:
   ```
   http://localhost:3000/**
   http://localhost:3004/**
   https://runningcrew.io/**
   ```

**카카오 개발자 콘솔 설정**:
- 제품 설정 > 카카오 로그인 > Redirect URI 추가:
  ```
  https://blzupvegyrakpkbhxhfp.supabase.co/auth/v1/callback
  ```

**Vercel 환경변수 설정**:
```
NEXT_PUBLIC_SITE_URL=https://runningcrew.io
NEXT_PUBLIC_SUPABASE_URL=https://blzupvegyrakpkbhxhfp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 배포 체크리스트 (업데이트)

배포 전 확인 사항:
- [x] 환경 변수 설정 확인 (`.env.local`)
- [x] Supabase 마이그레이션 실행 완료
- [x] RLS 정책 활성화 확인
- [x] Storage 버킷 생성 및 정책 설정
- [x] 이미지 최적화 설정
- [ ] 에러 바운더리 추가
- [x] SEO 메타데이터 설정
- [x] 로딩 상태 처리
- [ ] 에러 페이지 커스터마이징
- [x] Favicon 적용
- [x] OG 이미지 설정
- [x] robots.txt 생성
- [x] sitemap.xml 동적 생성
- [ ] **카카오 OAuth Redirect URI 설정 (프로덕션)**
- [ ] **Supabase URL Configuration 설정 (프로덕션)**
- [ ] **Vercel 환경변수 설정**
- [ ] Google Search Console 인증
- [ ] 네이버 서치어드바이저 인증

---

## 11. 크루 가입 시스템 구현

### 11.1 개요
**요구사항**:
- 크루 상세 페이지에서 가입 신청 가능
- 크루 리더가 가입 신청 승인/거절
- 승인 시 자동으로 멤버 추가
- 리더에게 대기 중인 신청 알림

### 11.2 데이터베이스 설계
**파일**: `supabase/migrations/20250402000000_crew_join_requests.sql`

**테이블 구조**:
```sql
create table if not exists public.crew_join_requests (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  message text, -- Optional message from applicant
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id),

  -- Prevent duplicate pending requests
  unique (crew_id, profile_id, status)
);
```

**RLS 정책**:
1. **사용자**: 자신의 신청 조회/생성/취소 가능
2. **크루 리더/관리자**: 크루의 모든 신청 조회/승인/거절 가능
3. **가입 제한**: 이미 멤버인 경우 신청 불가

**자동화 트리거**:
```sql
create or replace function handle_approved_join_request()
returns trigger as $$
begin
  -- Only process when status changes to 'approved'
  if new.status = 'approved' and (old.status is null or old.status != 'approved') then
    -- Add user to crew_members
    insert into public.crew_members (crew_id, profile_id, role)
    values (new.crew_id, new.profile_id, 'member')
    on conflict (crew_id, profile_id) do nothing;

    -- Set reviewed metadata
    new.reviewed_at = now();
    new.reviewed_by = auth.uid();
  end if;

  return new;
end;
$$ language plpgsql security definer;
```

**특징**:
- 승인 시 자동으로 `crew_members` 테이블에 멤버 추가
- 승인/거절 시 `reviewed_at`, `reviewed_by` 자동 기록
- `security definer`로 트리거 실행 시 권한 보장

### 11.3 크루 가입 버튼 컴포넌트
**파일**: `src/components/crew/crew-join-button.tsx`

**주요 기능**:
1. **사용자 상태 감지**:
   - 로그인 여부 확인
   - 크루 소유자 여부
   - 이미 멤버인지 확인
   - 대기 중인 신청이 있는지 확인

2. **상태별 UI**:
   ```typescript
   type JoinStatus = "not_member" | "pending" | "member" | "owner" | "loading";
   ```

   - `not_member`: 가입 신청 폼 표시
   - `pending`: 신청 대기 중 표시 + 취소 버튼
   - `member`: "크루 멤버입니다" 표시
   - `owner`: "내가 운영하는 크루입니다" 표시
   - `loading`: 로딩 중

3. **가입 신청 기능**:
   - 선택적 메시지 입력 (최대 200자)
   - 신청 후 상태 자동 갱신
   - `router.refresh()`로 서버 상태 동기화

**코드 예시**:
```typescript
const handleJoinRequest = async () => {
  if (!user) {
    alert("로그인이 필요합니다.");
    return;
  }

  setIsSubmitting(true);

  try {
    const { error } = await client
      .from("crew_join_requests")
      .insert({
        crew_id: crewId,
        profile_id: user.id,
        message: message.trim() || null,
      } as never);

    if (error) {
      console.error("가입 신청 실패:", error);
      alert("가입 신청에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    alert("가입 신청이 완료되었습니다. 크루 리더의 승인을 기다려주세요.");
    setStatus("pending");
    setMessage("");
    router.refresh();
  } catch (error) {
    console.error("가입 신청 오류:", error);
    alert("오류가 발생했습니다.");
  } finally {
    setIsSubmitting(false);
  }
};
```

### 11.4 가입 신청 관리 컴포넌트
**파일**: `src/components/crew/crew-join-requests-manager.tsx`

**주요 기능**:
1. **권한 확인**:
   - 크루 리더/관리자만 접근 가능
   - 일반 사용자에게는 렌더링하지 않음

2. **신청 목록 조회**:
   ```typescript
   const { data, error } = await client
     .from("crew_join_requests")
     .select(`
       id,
       profile_id,
       message,
       created_at,
       profile:profiles (
         display_name,
         avatar_url
       )
     `)
     .eq("crew_id", crewId)
     .eq("status", "pending")
     .order("created_at", { ascending: true });
   ```

3. **승인/거절 처리**:
   - 승인: status를 'approved'로 변경 → 트리거가 자동으로 멤버 추가
   - 거절: status를 'rejected'로 변경
   - 처리 후 목록에서 자동 제거

4. **UI 요소**:
   - 신청 개수 뱃지 표시
   - 신청자 프로필 사진 및 이름
   - 신청 메시지 (있는 경우)
   - 승인/거절 버튼
   - 처리 중 로딩 상태

**코드 예시**:
```typescript
const handleApprove = async (requestId: string) => {
  if (!confirm("이 사용자의 가입을 승인하시겠습니까?")) return;

  setProcessingId(requestId);

  try {
    // Update request status to 'approved'
    // The trigger will automatically add the user to crew_members
    const { error } = await client
      .from("crew_join_requests")
      .update({
        status: "approved",
      } as never)
      .eq("id", requestId);

    if (error) {
      console.error("승인 실패:", error);
      alert("승인에 실패했습니다. 다시 시도해주세요.");
      setProcessingId(null);
      return;
    }

    alert("가입이 승인되었습니다!");
    setRequests((prev) => prev.filter((req) => req.id !== requestId));
    router.refresh();
  } catch (error) {
    console.error("승인 오류:", error);
    alert("오류가 발생했습니다.");
  } finally {
    setProcessingId(null);
  }
};
```

### 11.5 크루 상세 페이지 통합
**파일**: `src/app/crews/[crewId]/page.tsx`

**변경 사항**:
```typescript
import { CrewJoinButton } from "@/components/crew/crew-join-button";
import { CrewJoinRequestsManager } from "@/components/crew/crew-join-requests-manager";

// ...

<div className="space-y-6">
  <CrewJoinButton crewId={crew.id} ownerId={crew.owner_id} />

  <CrewJoinRequestsManager crewId={crew.id} ownerId={crew.owner_id} />

  {/* 기존 카드들... */}
</div>
```

**배치**:
- 우측 사이드바 상단에 가입 버튼 배치
- 가입 버튼 바로 아래에 신청 관리 카드 배치 (리더만 표시)

### 11.6 사용자 플로우

#### 일반 사용자 (크루 가입)
1. 크루 상세 페이지 접속
2. "가입 신청하기" 버튼 클릭
3. 선택적으로 메시지 작성 (예: "매주 주말 함께 달리고 싶습니다!")
4. "가입 신청하기" 버튼 클릭
5. "가입 신청이 완료되었습니다" 알림
6. 상태가 "가입 신청 대기 중"으로 변경
7. 크루 리더의 승인 대기

#### 크루 리더 (신청 관리)
1. 크루 상세 페이지 접속
2. "가입 신청 관리" 카드에 뱃지로 신청 개수 표시
3. 신청자 목록 확인 (프로필, 이름, 메시지, 신청 날짜)
4. 각 신청에 대해:
   - "승인" 클릭 → 자동으로 멤버 추가
   - "거절" 클릭 → 신청 거절
5. 처리된 신청은 목록에서 자동 제거

### 11.7 기술적 특징

**보안**:
- RLS 정책으로 권한 철저히 제어
- 이미 멤버인 경우 신청 불가 (DB 레벨)
- 크루 리더/관리자만 신청 조회/처리 가능

**UX 개선**:
- 실시간 상태 업데이트 (`router.refresh()`)
- 처리 중 로딩 상태 표시
- 명확한 상태별 UI (색상, 아이콘, 메시지)
- 신청 개수 뱃지로 알림 효과

**데이터 무결성**:
- `unique (crew_id, profile_id, status)` 제약으로 중복 신청 방지
- 트리거로 승인 시 자동 멤버 추가
- `on conflict do nothing`으로 중복 멤버 추가 방지

**확장성**:
- `reviewed_by` 필드로 누가 승인/거절했는지 추적
- `message` 필드로 신청자 의사 전달
- 추후 알림 시스템 통합 가능

---

## 배포 체크리스트 (업데이트)

배포 전 확인 사항:
- [x] 환경 변수 설정 확인 (`.env.local`)
- [x] Supabase 마이그레이션 실행 완료
- [x] RLS 정책 활성화 확인
- [x] Storage 버킷 생성 및 정책 설정
- [x] 이미지 최적화 설정
- [ ] 에러 바운더리 추가
- [x] SEO 메타데이터 설정
- [x] 로딩 상태 처리
- [ ] 에러 페이지 커스터마이징
- [x] Favicon 적용
- [x] OG 이미지 설정
- [x] robots.txt 생성
- [x] sitemap.xml 동적 생성
- [x] 크루 가입 시스템 구현
- [ ] **카카오 OAuth Redirect URI 설정 (프로덕션)**
- [ ] **Supabase URL Configuration 설정 (프로덕션)**
- [ ] **Vercel 환경변수 설정**
- [ ] Google Search Console 인증
- [ ] 네이버 서치어드바이저 인증

---

## 12. UI/UX 개선 및 프로필 관리 시스템 (2025-10-03)

### 12.1 대시보드 개인 프로필 배경 효과

**파일**: `src/app/page.tsx`

**요구사항**:
- YouTube Music 플레이어처럼 프로필 이미지를 배경으로 활용
- 확대 + 블러 효과로 시각적 깊이감 추가

**구현**:
```typescript
<Card className="relative overflow-hidden border-border/70">
  {/* 블러 배경 - YouTube Music 스타일 */}
  {(profile?.avatar_url || user?.user_metadata?.avatar_url) && (
    <div className="absolute inset-0">
      {/* 확대된 블러 배경 이미지 */}
      <Image
        src={profile?.avatar_url || user?.user_metadata?.avatar_url}
        alt=""
        fill
        className="scale-[2] object-cover blur-[120px] saturate-[2.5] brightness-[1.3]"
        sizes="1200px"
        priority
      />
      {/* 그라데이션 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/30 via-background/50 to-background/70" />
    </div>
  )}

  {/* 컨텐츠 */}
  <div className="relative backdrop-blur-sm">
    {/* 프로필 및 통계 */}
  </div>
</Card>
```

**효과 파라미터**:
- `scale-[2]`: 배경 이미지 2배 확대
- `blur-[120px]`: 강력한 블러 효과
- `saturate-[2.5]`: 채도 증가로 색상 강조
- `brightness-[1.3]`: 밝기 조정
- `backdrop-blur-sm`: 컨텐츠 영역 추가 블러

### 12.2 모바일 네비게이션 개선

**파일**: `src/components/site-nav.tsx`

**변경 사항**:

1. **페이지 타이틀 추가**:
```typescript
const baseNavItems = [
  { href: "/", label: "대시보드", title: "Home" },
  { href: "/records/upload", label: "기록 등록", title: "기록 등록" },
  { href: "/missions", label: "미션", title: "미션" },
  { href: "/crews", label: "크루", title: "크루" },
];

// 현재 페이지 타이틀 표시 (모바일)
const currentPageTitle = navItems.find((item) => item.href === pathname)?.title || "Home";

<h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold md:hidden">
  {currentPageTitle}
</h1>
```

2. **프로필/햄버거 메뉴 간격 조정**:
```typescript
<div className="flex items-center gap-2 md:hidden">
  {/* gap-3 → gap-2로 변경 */}
```

3. **프로필 링크 추가** (데스크톱/모바일):
```typescript
// 데스크톱
<Link href="/profile" className="flex items-center gap-2 hover:opacity-80">
  <div className="relative h-8 w-8 overflow-hidden rounded-full">
    {/* 프로필 이미지 */}
  </div>
  <span>{displayName}님</span>
</Link>

// 모바일 메뉴
<Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
  <div className="flex items-center gap-3">
    {/* 프로필 이미지 */}
    <div className="flex-1">
      <p className="text-sm font-medium">{displayName}님</p>
      <p className="text-xs text-muted-foreground">프로필 보기</p>
    </div>
  </div>
</Link>
```

### 12.3 프로필 관리 시스템 구현

#### 12.3.1 프로필 설정 페이지

**파일**: `src/app/profile/page.tsx`

**주요 기능**:
1. **프로필 이미지 업로드**:
   - 파일 크기 제한: 5MB
   - 지원 형식: JPG, PNG
   - 실시간 미리보기
   - Supabase Storage(`crew-assets` 버킷) 활용

2. **닉네임 변경**:
   - 최대 50자
   - NOT NULL 제약 준수 (빈 값 시 기본값 사용)
   - 기본값 우선순위: 이메일 앞부분 → "러너"

3. **이메일 표시** (읽기 전용):
   - 변경 불가능 안내

**코드 예시**:
```typescript
const handleSave = async () => {
  const finalDisplayName = displayName.trim() || user.email?.split("@")[0] || "러너";

  await updateUserProfile(user.id, {
    display_name: finalDisplayName,
    avatar_url: avatarUrl || profile?.avatar_url || null,
  });

  // 페이지 새로고침으로 전체 앱에 업데이트 반영
  setTimeout(() => {
    window.location.reload();
  }, 1000);
};
```

#### 12.3.2 프로필 REST API 함수

**파일**: `src/lib/supabase/rest.ts`

**새로 추가된 함수**:

1. **프로필 이미지 업로드**:
```typescript
export async function uploadProfileImage(userId: string, file: File): Promise<string> {
  const { getBrowserSupabaseClient } = await import("@/lib/supabase/browser-client");
  const supabase = getBrowserSupabaseClient();

  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `profile-avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("crew-assets")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("crew-assets").getPublicUrl(filePath);
  return data.publicUrl;
}
```

2. **프로필 업데이트**:
```typescript
export async function updateUserProfile(
  userId: string,
  updates: { display_name: string; avatar_url?: string | null }
) {
  const { getBrowserSupabaseClient } = await import("@/lib/supabase/browser-client");
  const supabase = getBrowserSupabaseClient();

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) {
    throw new Error(`프로필 업데이트 실패: ${error.message}`);
  }
}
```

**주요 결정 사항**:
- Storage 버킷: 새로 생성하지 않고 기존 `crew-assets` 사용
- 파일 경로: `profile-avatars/` 폴더로 구분
- `display_name`: NOT NULL 제약으로 필수값 처리

#### 12.3.3 빌드 오류 해결

**Issue 1: Module not found**
- 증상: `Can't resolve '@/lib/supabase/client'`
- 원인: `client.ts` 파일이 없고 `browser-client.ts` 사용 중
- 해결: `createClient` → `getBrowserSupabaseClient`로 변경

**Issue 2: Storage bucket not found**
- 증상: `Bucket not found: profiles`
- 원인: `profiles` 버킷 미생성
- 해결: 기존 `crew-assets` 버킷 사용

**Issue 3: NOT NULL constraint violation**
- 증상: `null value in column "display_name" violates not-null constraint`
- 원인: `display_name`이 빈 값일 때 null 저장 시도
- 해결: 빈 값 시 기본값 사용 (이메일 앞부분 또는 "러너")

### 12.4 크루 리스트 페이지 개선

**파일**: `src/app/crews/page.tsx`

**변경 사항**:
- 로고 없는 크루: "이미지 준비 중" → 크루 이름 표시
```typescript
{crew.logoImageUrl ? (
  <Image src={crew.logoImageUrl} ... />
) : (
  <div className="grid h-full w-full place-items-center px-4 text-center text-2xl font-bold text-foreground/70">
    {crew.name}
  </div>
)}
```

### 12.5 대시보드 카드 스타일 개선

**파일**: `src/app/page.tsx`

**요구사항**:
- 참여 중인 미션, 최근 업로드 기록 섹션 스타일 변경
- Card 컴포넌트 제거 → 간결한 섹션 레이아웃
- 가로선 + 입체 효과로 구분

**구현**:
```typescript
<section className="space-y-4 border-t border-border/40 pt-8">
  <div>
    <h2 className="text-2xl font-bold">참여 중인 미션</h2>
    <p className="mt-1 text-sm text-muted-foreground">
      현재 참여하고 있는 미션 목록입니다.
    </p>
  </div>

  <div className="space-y-4">
    {missions.map((mission) => (
      <Link
        key={mission.id}
        href={`/missions/${mission.id}`}
        className="block rounded-2xl border border-border/40 bg-background p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      >
        {/* 미션 내용 */}
      </Link>
    ))}
  </div>
</section>
```

**스타일 특징**:
- 섹션 구분: `border-t border-border/40` + `pt-8`
- 카드 테두리: 얇은 테두리 (`border-border/40`)
- 입체 효과: 커스텀 그림자
  - 기본: `shadow-[0_2px_8px_rgba(0,0,0,0.04)]`
  - 호버: `shadow-[0_4px_12px_rgba(0,0,0,0.08)]`

### 12.6 미션 페이지 스타일 개선

**파일**: `src/app/missions/page.tsx`

**변경 사항**:
- Card 컴포넌트 제거 → `<section>` 사용
- 페이지 배경색: `bg-muted/30` 추가
- 크루별 섹션 그룹화
- 미션 카드: 테두리 제거, `bg-background` + `shadow-sm`

**구현**:
```typescript
<div className="min-h-screen bg-muted/30 pb-16">
  <main className="mx-auto mt-8 max-w-6xl space-y-8">
    {missionGroups.map((group) => (
      <section key={group.crewSlug} className="space-y-4">
        <div className="px-6">
          <h2 className="text-2xl font-bold">{group.crewName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {group.crewSummary}
          </p>
        </div>
        <div className="grid gap-4 px-6 lg:grid-cols-2">
          {group.missions.map((mission) => (
            <div key={mission.id} className="rounded-2xl bg-background p-6 shadow-sm">
              {/* 미션 내용 */}
            </div>
          ))}
        </div>
      </section>
    ))}
  </main>
</div>
```

---

## 13. 미션 상세 페이지 UI 개선 및 모바일 UX 최적화 (2025-10-04)

### 13.1 기록 카드 레이아웃 재설계

**파일**: `src/app/missions/[missionId]/page.tsx`

**요구사항**:
- 기존 레이아웃: 이미지(왼쪽) + 모든 정보(오른쪽 세로 배치)
- 신규 레이아웃: 3행 구조로 정보 계층화

**구현**:
```typescript
// 1행: 2컬럼 - 업로드 이미지 | 프로필 + 활동시간
<div className="flex gap-3">
  {/* 1컬럼: 업로드 이미지 (96x96) */}
  {record.imagePath && (
    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-border/40">
      <Image src={record.imagePath} alt="기록 사진" fill className="object-cover" sizes="96px" unoptimized />
    </div>
  )}

  {/* 2컬럼: 프로필 + 활동시간 */}
  <div className="flex flex-1 flex-col justify-between min-w-0">
    <div className="flex items-center gap-2">
      {/* 프로필 이미지 + 이름 + 누적 기록 */}
    </div>
    <p className="text-xs text-muted-foreground">
      {formatDate(record.recordedAt)}
    </p>
  </div>
</div>

// 2행: 1컬럼 - 거리, 시간, 페이스 (가로 배치)
<div className="grid grid-cols-3 gap-2 text-center">
  <div>
    <p className="text-[0.65rem] text-muted-foreground">거리</p>
    <p className="text-sm font-semibold text-foreground">{record.distanceKm.toFixed(1)} KM</p>
  </div>
  {/* 시간, 페이스 */}
</div>

// 3행: 1컬럼 - 메모 (조건부)
{record.notes && (
  <p className="text-sm text-muted-foreground line-clamp-2">{record.notes}</p>
)}
```

**개선 효과**:
- 정보 계층 명확화: 사용자 정보 → 운동 데이터 → 메모
- 가독성 향상: 관련 정보를 논리적으로 그룹화
- 모바일 최적화: 세로 공간 효율적 사용

### 13.2 통계 카드 스타일 변경

**파일**: `src/app/missions/[missionId]/page.tsx`

**변경 사항**:
- Card 컴포넌트 → 상하단 border 스타일
- 둥근 모서리 제거, 간결한 디자인

**Before**:
```typescript
<Card>
  <CardHeader>
    <CardTitle>참여자 통계</CardTitle>
    <CardDescription>참여자별 누적 기록을 거리순으로 보여줍니다.</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* 통계 내용 */}
  </CardContent>
</Card>
```

**After**:
```typescript
<div className="border-y border-border/60 bg-card">
  <div className="p-6 pb-4">
    <h3 className="text-lg font-semibold">참여자 통계</h3>
    <p className="text-sm text-muted-foreground">참여자별 누적 기록을 거리순으로 보여줍니다.</p>
  </div>
  <div className="space-y-4 p-6 pt-2">
    {/* 통계 내용 */}
  </div>
</div>
```

**적용 섹션**:
- 참여자 통계
- 최근 공개 기록

**디자인 의도**:
- 모바일에서 카드 경계가 명확하지 않은 문제 해결
- 상하단 border로 섹션 구분 강조
- 여백 최적화로 콘텐츠 밀도 향상

### 13.3 모바일 네비게이션 UX 개선

**파일**: `src/components/site-nav.tsx`

**변경 사항**:

1. **프로필 이미지 클릭 시 홈 이동**:
```typescript
// Before: 프로필 이미지가 단순 표시용
<div className="relative h-8 w-8 overflow-hidden rounded-full">
  {avatarUrl && <Image src={avatarUrl} ... />}
</div>

// After: Link로 감싸서 홈으로 이동
<Link href="/" className="relative h-8 w-8 overflow-hidden rounded-full">
  {avatarUrl && <Image src={avatarUrl} ... />}
</Link>
```

2. **프로필 이미지와 햄버거 메뉴 간격 조정**:
```typescript
// Before
<div className="flex items-center gap-2 md:hidden">

// After
<div className="flex items-center gap-1 md:hidden">
```

**UX 개선 효과**:
- 모바일에서 빠른 대시보드 접근
- 로고 클릭과 동일한 동선 제공
- 좁은 화면에서 공간 최적화

### 13.4 세부 스타일 개선

**파일**: `src/app/missions/[missionId]/page.tsx`

**변경 내역**:
1. **페이스 표시 정리**:
   - `/KM` → `/km` (불필요한 공백 제거)
   - 통일된 단위 표기

2. **거리 소수점 정밀도**:
   - `.toFixed(2)` → `.toFixed(1)`
   - 더 간결한 표시 (10.50km → 10.5km)

3. **섹션 간격 조정**:
   - `space-y-4` → `space-y-2`
   - 모바일에서 스크롤 최소화

4. **Import 정리**:
   - 사용하지 않는 `CardDescription` 제거

---

## 기술적 학습 및 패턴

### Supabase Storage 활용
- 기존 버킷 재사용으로 관리 단순화
- 폴더 구조로 용도 구분 (`profile-avatars/`, `crew-logos/` 등)
- Public URL 생성으로 CDN 활용

### NOT NULL 제약 처리 패턴
```typescript
// ❌ 나쁜 예: null 허용
display_name: displayName.trim() || null

// ✅ 좋은 예: 기본값 사용
display_name: displayName.trim() || user.email?.split("@")[0] || "러너"
```

### 커스텀 그림자 활용
- Tailwind의 기본 그림자가 너무 강한 경우
- `shadow-[0_2px_8px_rgba(0,0,0,0.04)]` 패턴으로 미묘한 입체감

---

## 다음 작업 (업데이트)

### 우선순위 높음
1. **OCR 파이프라인 구현**
2. **미션 참여 관리 개선**
3. **기록 업로드 UX 개선**

### 배포 관련 미완료
- [ ] 카카오 OAuth Redirect URI 설정 (프로덕션)
- [ ] Supabase URL Configuration 설정
- [ ] Vercel 환경변수 설정
- [ ] 에러 바운더리 추가
- [ ] 에러 페이지 커스터마이징

---

## 14. 기록 시스템 개선 (2025-10-04)

### 14.1 RecordCard 컴포넌트 생성

**파일**: `src/components/record-card.tsx`

**목적**:
- 기록 카드 UI를 재사용 가능한 컴포넌트로 분리
- 미션 상세, 대시보드 등 여러 페이지에서 일관된 디자인 유지

**주요 Props**:
```typescript
interface RecordCardProps {
  record: {
    id: string;
    distanceKm: number;
    durationSeconds: number;
    paceSecondsPerKm: number | null;
    recordedAt: string;
    notes?: string | null;
    imagePath?: string | null;
    visibility?: string;
    profile?: {
      id: string;
      display_name: string;
      avatar_url?: string | null;
    } | null;
  };
  userStat?: {
    totalDistanceKm: number;
    totalDurationSeconds: number;
  };
  showUserInfo?: boolean;      // 프로필 정보 표시 여부
  showEditLink?: boolean;       // 수정 버튼 표시 여부
  currentUserId?: string;       // 소유자 판단용
}
```

**레이아웃 구조**:
```typescript
// 1행: 이미지 | 프로필 + 시간
<div className="flex gap-3">
  <div className="h-24 w-24">{/* 이미지 */}</div>
  <div className="flex-1 flex-col justify-between">
    {/* 프로필 + 누적 통계 */}
    {/* 활동 시간 */}
  </div>
</div>

// 2행: 거리 | 시간 | 페이스
<div className="grid grid-cols-3 gap-2 text-center">
  {/* 거리, 시간, 페이스 */}
</div>

// 3행: 메모 (조건부)
{record.notes && <p className="line-clamp-2">{record.notes}</p>}
```

**적용 위치**:
- 미션 상세 페이지: 최근 공개 기록 섹션
- 대시보드: 최근 업로드 기록 섹션

### 14.2 대시보드 기록 표시 개선

**파일**: `src/app/page.tsx`

**변경 사항**:
1. **RecordCard 컴포넌트 사용**:
```typescript
import { RecordCard } from "@/components/record-card";

{recentRecords.map((record) => (
  <RecordCard
    key={record.id}
    record={record}
    showUserInfo={false}  // 본인 대시보드이므로 프로필 숨김
    showEditLink={true}   // 수정 버튼 표시
    currentUserId={user?.id}
  />
))}
```

2. **섹션 스타일 통일**:
- Card 컴포넌트 제거
- `border-t border-border/40` 구분선 사용
- 입체 그림자 효과 적용

### 14.3 기록 수정 페이지 개선

**파일**: `src/app/records/[recordId]/edit/page.tsx`

**주요 개선 사항**:

1. **AlertDialog 도입**:
   - 기존: 브라우저 기본 `alert()` 사용
   - 신규: shadcn/ui AlertDialog 컴포넌트 사용
   - 일관된 UI/UX 제공

```typescript
// AlertDialog 상태 관리
const [alertOpen, setAlertOpen] = useState(false);
const [alertTitle, setAlertTitle] = useState("");
const [alertMessage, setAlertMessage] = useState("");
const [alertAction, setAlertAction] = useState<(() => void) | null>(null);

const showAlert = useCallback((title: string, message: string, onOk?: () => void) => {
  setAlertTitle(title);
  setAlertMessage(message);
  setAlertAction(() => onOk || null);
  setAlertOpen(true);
}, []);
```

2. **인증 개선**:
   - REST API (`fetchRecordById`) → Browser Supabase Client
   - RLS 정책 적용으로 소유자만 수정 가능
   - 인증 토큰 자동 포함

```typescript
// 기록 로드 (Browser Client 사용)
const { getBrowserSupabaseClient } = await import("@/lib/supabase/browser-client");
const supabase = getBrowserSupabaseClient();

const { data: recordData, error } = await supabase
  .from("records")
  .select("id,recorded_at,distance_km,duration_seconds,pace_seconds_per_km,visibility,created_at,image_path,notes,mission:missions(id,title)")
  .eq("id", resolvedParams.recordId)
  .single();
```

3. **React Hook 최적화**:
   - `showAlert` 함수에 `useCallback` 적용
   - `useEffect` dependency 배열 정리
   - 불필요한 re-render 방지

### 14.4 비공개 기록 시스템 구현

**파일**:
- `src/app/page.tsx`
- `src/components/record-card.tsx`
- `supabase/migrations/20250404000000_fix_records_select_policy.sql`

**기능**:
1. **대시보드에서 비공개 기록 표시**:
   - 로그인 사용자는 자신의 모든 기록(공개+비공개) 조회 가능
   - Browser Client 사용으로 인증 컨텍스트 포함

2. **비공개 라벨 추가**:
```typescript
// RecordCard 컴포넌트
{record.visibility === 'private' && (
  <div className="absolute left-3 top-3 z-10 rounded-full bg-muted/90 px-2 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
    🔒 비공개
  </div>
)}
```

3. **RLS 정책 수정**:
```sql
-- 사용자는 자신의 모든 기록 OR 타인의 공개 기록 조회 가능
create policy "Records visible to owner or public" on public.records
  for select
  using (
    auth.uid() = profile_id  -- 본인 기록 (공개/비공개 모두)
    or visibility = 'public'  -- 타인의 공개 기록
  );
```

**스타일링**:
- `z-10`: 다른 요소 위에 표시
- `bg-muted/90`: 반투명 배경
- `backdrop-blur-sm`: 블러 효과로 가독성 향상
- `absolute left-3 top-3`: 카드 좌측 상단 고정

### 14.5 수정 버튼 UI/UX 개선

**파일**: `src/components/record-card.tsx`

**변경 내역**:

1. **위치 변경**:
   - Before: 카드 하단 border 영역
   - After: 카드 우측 상단 절대 위치

2. **아이콘 변경**:
   - Before: 텍스트 + 이모지 "⚙️"
   - After: SVG 아이콘 (톱니바퀴 모양)

```typescript
{showEditLink && isOwner && (
  <Link
    href={`/records/${record.id}/edit`}
    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
    title="수정"
  >
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532..." />
    </svg>
  </Link>
)}
```

**개선 효과**:
- 더 심플하고 미니멀한 디자인
- 카드 레이아웃 방해 최소화
- 호버 시 색상 변경으로 인터랙션 명확화

### 14.6 헤더 Sticky 스타일 적용

**파일**: `src/components/site-nav.tsx`

**변경 사항**:
```typescript
// Before
<header className="border-b border-border/70 bg-background/95 backdrop-blur">

// After
<header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur">
```

**효과**:
- 스크롤 시에도 헤더가 상단에 고정
- 네비게이션 접근성 향상
- `z-50`: 다른 요소 위에 표시

### 14.7 기록 수정 페이지 접근성 개선

**파일**: `src/components/record-card.tsx`

**수정 버튼 접근 경로**:
- 각 RecordCard 우측 상단 톱니바퀴 아이콘 클릭
- `/records/[recordId]/edit` 페이지로 이동
- 소유자만 수정 버튼 표시

**코드**:
```typescript
const isOwner = currentUserId && (!record.profile || record.profile.id === currentUserId);

{showEditLink && isOwner && (
  <Link href={`/records/${record.id}/edit`}>
    {/* 수정 아이콘 */}
  </Link>
)}
```

---

## 기술적 이슈 및 해결

### Issue 1: REST API 인증 문제

**증상**:
- 기록 수정 페이지에서 폼이 로드되지 않음
- `fetchRecordById` REST API 호출 시 인증 실패

**원인**:
- REST API는 인증 컨텍스트가 없음
- RLS 정책이 인증된 사용자만 자신의 기록 조회 허용

**해결**:
```typescript
// Before: REST API
const recordData = await fetchRecordById(resolvedParams.recordId);

// After: Browser Supabase Client
const { getBrowserSupabaseClient } = await import("@/lib/supabase/browser-client");
const supabase = getBrowserSupabaseClient();

const { data: recordData, error } = await supabase
  .from("records")
  .select("...")
  .eq("id", resolvedParams.recordId)
  .single();
```

### Issue 2: 비공개 기록이 대시보드에 표시되지 않음

**증상**:
- 대시보드에서 비공개 기록이 보이지 않음
- RLS 정책이 공개 기록만 허용

**원인**:
- 기존 REST API 사용 시 인증 토큰 미포함
- RLS 정책이 `visibility = 'public'`만 허용

**해결**:
1. **Browser Client 사용**:
```typescript
// src/app/page.tsx
const { getBrowserSupabaseClient } = await import("@/lib/supabase/browser-client");
const supabase = getBrowserSupabaseClient();

const { data: recordsData, error } = await supabase
  .from("records")
  .select("...")
  .eq("profile_id", user.id)
  .order("created_at", { ascending: false })
  .limit(5);
```

2. **RLS 정책 수정**:
```sql
create policy "Records visible to owner or public" on public.records
  for select
  using (
    auth.uid() = profile_id  -- 본인의 모든 기록
    or visibility = 'public'  -- 타인의 공개 기록
  );
```

### Issue 3: 비공개 라벨이 보이지 않음

**증상**:
- `visibility` 값이 전달되지만 라벨이 렌더링되지 않음
- 이미지와 겹쳐서 가려짐

**해결**:
```typescript
// z-index와 backdrop-blur 추가
<div className="absolute left-3 top-3 z-10 rounded-full bg-muted/90 px-2 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
  🔒 비공개
</div>
```

---

## 커밋 로그

```bash
326314b fix: improve private record label visibility and edit page authentication
483b01d feat: show private records in dashboard with label and fix RLS policy
0db39b3 feat: replace browser alerts with custom AlertDialog and improve UI
0b3c855 feat: add record edit functionality
4b6cf88 feat: create reusable RecordCard component and update dashboard
```

---

## 다음 작업 (업데이트)

### 우선순위 높음
1. **OCR 파이프라인 구현**
2. **미션 참여 관리 개선**
3. **알림 시스템 구축**
4. **에러 바운더리 추가**

### 기록 시스템 개선 (완료)
- [x] RecordCard 컴포넌트 생성
- [x] 비공개 기록 표시
- [x] 기록 수정 페이지 개선
- [x] AlertDialog 통합
- [x] Sticky 헤더
- [x] Browser Client 인증 적용

---

마지막 업데이트: 2025-10-04

---

## 2025-10-04 (오후) - 랜딩 페이지 개선 및 브랜딩 업데이트

### 작업 개요
베타 테스터 오픈을 위한 서비스 소개 콘텐츠 추가 및 브랜딩 개선

### 1. 랜딩 페이지 서비스 소개 추가

**목적**: 테스터들에게 서비스를 명확히 소개하고 사용 방법 안내

**구현 내용**:

#### Hero 섹션 개선
- 서비스 소개 문구 추가: "러닝 크루 관리부터 기록 추적, 소셜 기능까지 - 러닝의 모든 순간을 함께합니다"
- 기존 CTA 버튼 유지 (카카오 로그인, 크루 둘러보기)

#### 주요 기능 섹션 확장 (3개 → 4개)
```tsx
// 기존 3개 기능 카드에서 4개로 확장
<section className="m-4 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
  <div>🏃 러닝 크루</div>
  <div>🎯 미션 챌린지</div>
  <div>📱 OCR 기록 분석</div>  // 새로 추가
  <div>💬 소셜 기능</div>      // 새로 추가
</section>
```

#### "시작하기" 단계별 가이드 추가
```tsx
<section className="m-4 mt-12 rounded-xl border border-border/70 bg-background p-8 shadow-sm">
  <h2>시작하기</h2>
  <div className="grid gap-6 md:grid-cols-4">
    <div>1. 카카오 로그인</div>
    <div>2. 크루 찾기</div>
    <div>3. 미션 참여</div>
    <div>4. 기록 업로드 (OCR 자동 분석)</div>
  </div>
</section>
```

#### 베타 테스트 안내 섹션 추가
```tsx
<section className="rounded-xl border border-orange-200 bg-orange-50 p-6">
  <h3>🚀 베타 테스트 중입니다</h3>
  <p>RunningCrew는 현재 베타 버전입니다...</p>
  <div>
    💡 우측 하단 피드백 버튼으로 의견 전달
    🐛 버그 제보 환영
    ✨ 개선 아이디어 제안
  </div>
</section>
```

#### UI 일관성 개선
- Card 컴포넌트를 div로 교체
- 일관된 스타일링: `rounded-xl border border-border/70 bg-background p-6 shadow-sm`
- Card import 제거

**파일**: `src/app/page.tsx`

---

### 2. 로고에 BETA 배지 추가

**구현**:
```tsx
<Link href={user ? `/profile/${user.id}` : "/"} className="flex items-center gap-2">
  <Image src="/logo2.png" alt="RunningCrew" ... />
  {/* Beta Badge */}
  <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
    BETA
  </span>
</Link>
```

**특징**:
- 브랜드 컬러(주황색) 사용
- 다크 모드 지원
- 데스크톱/모바일 모두 표시

**파일**: `src/components/site-nav.tsx`

---

### 3. 서비스 로고 교체

**변경 사항**:
- 기존 로고: `/logo_text-removebg.png`, `/logo-removebg.png`
- 새 로고: `/logo2.png` (running crew 텍스트가 있는 주황색 부채꼴 디자인)
- 데스크톱과 모바일 모두 동일한 로고 사용

**파일**:
- `public/logo2.png` (새로 추가)
- `src/components/site-nav.tsx` (로고 경로 변경)

---

### 커밋 로그

```bash
b009316 feat: enhance landing page with comprehensive service introduction
9816d5a feat: add BETA badge to logo and update to logo2.png
```

**상세 변경사항**:

1. **b009316**: 랜딩 페이지 개선
   - 서비스 개요 tagline 추가
   - 기능 섹션 3개 → 4개 확장 (OCR, 소셜 기능 추가)
   - "시작하기" 4단계 가이드 추가
   - 베타 테스트 안내 섹션 추가
   - Card 컴포넌트를 div로 교체하여 UI 일관성 유지
   - 모바일 반응형 2/4 컬럼 그리드 레이아웃

2. **9816d5a**: 로고 및 BETA 배지
   - logo2.png로 로고 교체
   - 네비게이션 헤더에 BETA 배지 추가
   - 주황색 브랜드 컬러 및 다크 모드 지원

---

### 기술적 세부사항

**반응형 그리드**:
```tsx
// 기능 섹션: 모바일 2열, 데스크톱 4열
grid gap-6 md:grid-cols-2 lg:grid-cols-4

// 시작하기 섹션: 모바일 1열, 데스크톱 4열
grid gap-6 md:grid-cols-4
```

**브랜드 컬러 통일**:
- 주황색 계열 사용: `orange-50`, `orange-100`, `orange-600`, `orange-700`, `orange-950`
- 다크 모드: `dark:bg-orange-950/30`, `dark:text-orange-400`

**접근성**:
- 의미 있는 heading 구조 (h1 → h2 → h3)
- 명확한 섹션 구분
- 충분한 색상 대비

---

### 테스트 체크리스트

- [x] 빌드 성공 확인
- [x] 데스크톱 레이아웃 확인
- [x] 모바일 반응형 확인
- [x] 다크 모드 확인
- [x] BETA 배지 표시 확인
- [x] 새 로고 적용 확인
- [x] Git commit & push 완료

---

### 다음 작업

#### 베타 오픈 준비
1. **성능 최적화**
   - 이미지 최적화 확인
   - 번들 사이즈 분석
   - Lighthouse 점수 확인

2. **모니터링 설정**
   - 에러 트래킹 (Sentry 등)
   - 사용자 행동 분석
   - 피드백 데이터 수집 확인

3. **문서화**
   - 사용자 가이드 작성
   - FAQ 준비
   - 버그 리포트 템플릿

#### 기능 개선
1. **OCR 파이프라인 구현**
2. **알림 시스템 구축**
3. **에러 핸들링 개선**

---

## 13. 알림 시스템 완성 및 크루 관리 기능 개선 (2025-10-09)

### 13.1 미션 및 랭킹 알림 트리거 구현

#### `/supabase/migrations/20251009000000_auto_mission_ranking_notifications.sql`

**구현 내용:**
- 미션 생성 시 크루원들에게 자동 알림
- TOP 3 랭킹 진입 시 자동 알림
- SECURITY DEFINER로 RLS 우회하여 안정적인 알림 생성

**주요 코드:**

```sql
-- 미션 생성 알림 함수
CREATE OR REPLACE FUNCTION create_mission_created_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  crew_member_ids uuid[];
  crew_info record;
BEGIN
  -- 크루 정보 조회
  SELECT id, name, slug INTO crew_info
  FROM crews
  WHERE id = NEW.crew_id;

  -- 크루 멤버들 조회
  SELECT array_agg(profile_id) INTO crew_member_ids
  FROM crew_members
  WHERE crew_id = NEW.crew_id;

  -- 크루원들에게 알림 생성
  IF crew_member_ids IS NOT NULL THEN
    INSERT INTO notifications (recipient_id, type, title, message, data, link)
    SELECT
      unnest(crew_member_ids),
      'mission_created',
      '새로운 미션',
      crew_info.name || ' 크루에 새로운 미션 "' || NEW.title || '"이(가) 생성되었습니다!',
      jsonb_build_object(
        'missionId', NEW.id,
        'missionTitle', NEW.title,
        'crewId', crew_info.id,
        'crewName', crew_info.name
      ),
      '/missions/' || NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_notify_mission_created ON missions;
CREATE TRIGGER trigger_notify_mission_created
  AFTER INSERT ON missions
  FOR EACH ROW
  EXECUTE FUNCTION create_mission_created_notification();

-- TOP 3 랭킹 진입 알림 함수
CREATE OR REPLACE FUNCTION create_ranking_top3_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_rank integer;
  previous_rank integer;
  mission_info record;
BEGIN
  -- 미션 정보 조회
  SELECT id, title INTO mission_info
  FROM missions
  WHERE id = NEW.mission_id;

  -- 현재 순위 계산
  SELECT COUNT(*) + 1 INTO current_rank
  FROM mission_participant_stats
  WHERE mission_id = NEW.mission_id
    AND total_distance_km > NEW.total_distance_km;

  -- 이전 순위 계산
  IF TG_OP = 'UPDATE' THEN
    SELECT COUNT(*) + 1 INTO previous_rank
    FROM mission_participant_stats
    WHERE mission_id = OLD.mission_id
      AND total_distance_km > OLD.total_distance_km;
  END IF;

  -- TOP 3 진입 시 알림 생성
  IF current_rank <= 3 AND (previous_rank > 3 OR previous_rank IS NULL OR TG_OP = 'INSERT') THEN
    INSERT INTO notifications (recipient_id, type, title, message, data, link)
    VALUES (
      NEW.profile_id,
      'ranking_top3',
      '순위권 진입! 🏆',
      '축하합니다! "' || mission_info.title || '" 미션에서 ' || current_rank || '위에 올랐습니다!',
      jsonb_build_object(
        'missionId', mission_info.id,
        'missionTitle', mission_info.title,
        'rank', current_rank,
        'previousRank', previous_rank
      ),
      '/missions/' || mission_info.id || '/rankings'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_notify_ranking_top3 ON mission_participant_stats;
CREATE TRIGGER trigger_notify_ranking_top3
  AFTER INSERT OR UPDATE OF total_distance_km ON mission_participant_stats
  FOR EACH ROW
  EXECUTE FUNCTION create_ranking_top3_notification();
```

**배포 완료:**
- 마이그레이션 적용 완료
- dev 브랜치 배포 완료
- main 브랜치 배포 완료

---

### 13.2 크루 상세 페이지 레이아웃 통합

#### `/src/app/crews/[crewId]/page.tsx`

**변경 사항:**
1. 3개 섹션을 1개로 통합
2. 로고 이미지 없을 시 크루명 첫 2글자 표시 (그라데이션 배경)
3. "크루 목록으로" 버튼을 메인 섹션 우측 상단으로 이동
4. 정보 계층 구조 개선

**주요 코드:**

```typescript
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

  {/* Stats with member count link */}
  <dl className="mb-6 grid gap-4 rounded-2xl border border-border/60 bg-muted/30 p-5 text-sm sm:grid-cols-4">
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">활동 지역</dt>
      <dd className="mt-1 text-base font-semibold text-foreground">{crew.activity_region}</dd>
    </div>
    <Link href={`/crews/${crew.slug}/members`} className="block transition hover:bg-muted/30 rounded-lg -m-2 p-2">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">크루 멤버</dt>
      <dd className="mt-1 text-base font-semibold text-foreground">{crew.member_count}명 →</dd>
    </Link>
    {/* ... */}
  </dl>

  {/* Map, Profile, Join, Intro, Missions all in same section */}
</section>
```

**개선 효과:**
- 정보 흐름이 자연스러워짐
- 모바일/데스크톱 반응형 개선
- 시각적 계층 구조 명확화

---

### 13.3 최근 가입 크루원 기능

#### `/src/lib/supabase/rest.ts`

**fetchCrewBySlug 함수 수정:**

```typescript
// 72시간 이내 가입 멤버 필터링 및 정렬
const now = new Date();
const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

const recentMembers = row.crew_members
  ?.filter((member) => {
    const joinedAt = new Date(member.created_at);
    return joinedAt >= seventyTwoHoursAgo;
  })
  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  .map((member) => ({
    id: member.profiles?.id ?? member.profile_id,
    displayName: member.profiles?.display_name ?? '러너',
    avatarUrl: member.profiles?.avatar_url ?? null,
    joinedAt: member.created_at,
  })) ?? [];

return {
  ...row,
  recent_members: recentMembers,
  // ...
};
```

#### `/src/app/crews/[crewId]/page.tsx`

**최근 가입 크루원 섹션 추가:**

```typescript
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
```

**기능:**
- 72시간 이내 가입한 크루원만 표시
- 상대 시간 표시 ("방금 전", "N시간 전", "N일 전")
- 프로필 링크 연결
- 호버 효과 적용
- 별도 섹션으로 분리하여 "진행 중 미션" 아래 배치

---

### 13.4 크루원 목록 페이지

#### `/src/lib/supabase/rest.ts`

**새 함수 추가:**

```typescript
export async function fetchCrewMembers(
  crewId: string,
  options?: {
    search?: string;
    orderBy?: 'name' | 'joined_date';
  }
) {
  const { search = '', orderBy = 'joined_date' } = options ?? {};

  // PostgREST 쿼리
  let query = `crew_members?crew_id=eq.${crewId}&select=profile_id,created_at,profiles(id,display_name,avatar_url)`;

  if (orderBy === 'name') {
    query += '&order=profiles(display_name).asc';
  } else {
    query += '&order=created_at.desc';
  }

  const data = await supabaseRest<CrewMemberRow[]>(query);

  // 데이터 변환
  let members = data.map((member) => ({
    id: member.profiles?.id ?? member.profile_id,
    displayName: member.profiles?.display_name ?? '러너',
    avatarUrl: member.profiles?.avatar_url ?? null,
    joinedAt: member.created_at,
  }));

  // 클라이언트 사이드 검색 필터링
  if (search) {
    members = members.filter((member) =>
      member.displayName.toLowerCase().includes(search.toLowerCase())
    );
  }

  // 클라이언트 사이드 이름 정렬 (PostgREST 중첩 정렬이 잘 동작하지 않음)
  if (orderBy === 'name') {
    members.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ko'));
  }

  return members;
}
```

#### `/src/app/crews/[crewId]/members/page.tsx`

**새 페이지 생성:**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { fetchCrewBySlug, fetchCrewMembers } from "@/lib/supabase/rest";

export default function CrewMembersPage() {
  const params = useParams();
  const router = useRouter();
  const crewSlug = params?.crewId as string;

  const [crew, setCrew] = useState<Crew | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<"joined_date" | "name">("joined_date");

  useEffect(() => {
    async function loadData() {
      if (!crewSlug) {
        router.push("/crews");
        return;
      }

      setLoading(true);
      const crewData = await fetchCrewBySlug(crewSlug);

      if (!crewData) {
        router.push("/crews");
        return;
      }

      setCrew(crewData);

      const membersData = await fetchCrewMembers(crewData.id, { search, orderBy });
      setMembers(membersData);
      setLoading(false);
    }

    loadData();
  }, [crewSlug, search, orderBy, router]);

  return (
    <div className="min-h-screen bg-muted/40 pb-8">
      <main className="mx-auto mt-0 max-w-5xl px-4 pt-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{crew?.name} 크루원 목록</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              총 {members.length}명의 크루원
            </p>
          </div>
          <Link
            href={`/crews/${crewSlug}`}
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            크루 홈으로
          </Link>
        </div>

        {/* Search and Filter in single row */}
        <div className="mb-6 flex items-center gap-3">
          <input
            type="text"
            placeholder="이름으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <select
            value={orderBy}
            onChange={(e) => setOrderBy(e.target.value as "joined_date" | "name")}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="joined_date">가입일자</option>
            <option value="name">이름순</option>
          </select>
        </div>

        {/* Members grid */}
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">로딩 중...</div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {search ? "검색 결과가 없습니다." : "아직 크루원이 없습니다."}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <Link
                key={member.id}
                href={`/profile/${member.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-4 transition hover:bg-muted/50"
              >
                <Avatar
                  src={member.avatarUrl}
                  alt={member.displayName}
                  size="md"
                  className="border border-border/60"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{member.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(member.joinedAt).toLocaleDateString('ko-KR')} 가입
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

**기능:**
- 이름 검색 (실시간 필터링)
- 정렬 옵션: "가입일자" (기본), "이름순"
- 반응형 그리드 레이아웃 (1/2/3열)
- 프로필 페이지 링크
- 크루 홈으로 돌아가기 버튼

**배포 완료:**
- dev 브랜치 배포 완료
- main 브랜치 배포 완료

---

### 13.5 iOS PWA 상태바 스타일링

#### `/src/app/layout.tsx`

**Metadata API 설정:**

```typescript
// Viewport 설정
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

// Metadata 설정
export const metadata: Metadata = {
  // ...
  appleWebApp: {
    capable: true,
    statusBarStyle: "default", // 흰색 배경 + 검은색 텍스트
    title: "RunningCrew",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // ...
};
```

**변경 사항:**
1. `viewport`에 `themeColor` 추가 (라이트/다크 모드 대응)
2. `metadata.appleWebApp` 설정:
   - `capable: true` - PWA 모드 활성화
   - `statusBarStyle: "default"` - 기본 스타일 (흰색 배경)
   - `title: "RunningCrew"` - 앱 타이틀
3. `formatDetection` 추가 - 자동 링크 변환 비활성화

**주의사항:**
- 변경사항 적용을 위해 기존 홈 화면 아이콘 삭제 후 재설치 필요
- iOS Safari에서만 적용됨

**배포 완료:**
- dev 브랜치 배포 완료
- main 브랜치 배포 완료

---

### 13.6 웹 푸시 알림 논의

**검토 내용:**
- PWA 푸시 알림 구현을 위해 필요한 것:
  - Service Worker + Push API
  - FCM (Firebase Cloud Messaging) 또는 다른 푸시 서비스
  - 사용자 권한 요청 및 토큰 관리
  - iOS Safari 제약사항: iOS 16.4+ 필요, PWA로 설치된 경우만 지원

**결정:**
- 현재 시점에서는 구현 보류
- 향후 필요 시 재논의

---

### 테스트 체크리스트

- [x] 알림 트리거 마이그레이션 적용 확인
- [x] 미션 생성 시 알림 생성 확인
- [x] 랭킹 TOP 3 진입 시 알림 생성 확인
- [x] 크루 상세 페이지 레이아웃 확인
- [x] 로고 플레이스홀더 그라데이션 확인
- [x] 최근 가입 크루원 섹션 확인 (72시간 필터)
- [x] 크루원 목록 페이지 확인
- [x] 검색 및 정렬 기능 확인
- [x] iOS PWA 상태바 스타일 확인
- [x] 빌드 성공 확인
- [x] dev 브랜치 배포 완료
- [x] main 브랜치 배포 완료

---

### 기술적 개선사항

1. **알림 시스템 완성**
   - 8개 알림 타입 모두 자동화
   - SECURITY DEFINER로 RLS 이슈 해결
   - 데이터베이스 트리거로 안정성 확보

2. **UX 개선**
   - 크루 상세 정보 계층 구조 개선
   - 최근 가입 멤버 가시성 향상
   - 크루원 검색 및 정렬 기능 추가

3. **PWA 지원**
   - iOS 홈 화면 추가 시 상태바 스타일링
   - 라이트/다크 모드 테마 색상 지원

---

### 다음 작업

#### 알림 시스템
1. **알림 UI 개선**
   - 알림 센터 디자인 개선
   - 읽음/안읽음 상태 표시 명확화
   - 알림 그룹화 기능

2. **웹 푸시 알림**
   - Service Worker 구현
   - FCM 연동
   - 사용자 권한 관리

#### 크루 관리
1. **크루 관리자 기능**
   - 멤버 역할 관리
   - 멤버 제거 기능
   - 크루 통계 대시보드

2. **크루 검색 개선**
   - 지역별 필터
   - 활동 상태별 필터
   - 인기순 정렬

---

## 2025-10-12: 댓글 시스템 버그 수정

### 수정한 버그

#### 1. 댓글 개수 실시간 업데이트 버그 (commit: 8031a73)
**문제점:**
- 댓글을 작성해도 상단의 댓글 개수가 업데이트되지 않음
- 페이지 새로고침 후에만 개수가 반영됨

**원인 분석:**
- 기록 상세 페이지에서 `record.commentsCount` 정적 값 사용
- `CommentsSection` 컴포넌트의 상태 변경이 부모 컴포넌트에 전달되지 않음

**해결 방법:**
- `CommentsSection`에 `onCountChange` 콜백 prop 추가
- 댓글 로드/추가/삭제 시 부모 컴포넌트에 개수 변경 알림
- 기록 상세 페이지에 별도의 `commentsCount` state 추가

**수정된 파일:**
- `src/components/comments/comments-section.tsx`: 콜백 prop 추가 및 호출
- `src/app/records/[recordId]/page.tsx`: 동적 댓글 카운트 state 관리

#### 2. 댓글 좋아요 401 Unauthorized 에러 (commit: ff46026)
**문제점:**
- 댓글 좋아요 버튼 클릭 시 `POST /api/comments/{id}/like 401` 에러 발생
- "Unauthorized" 팝업 표시

**원인 분석:**
- Next.js 15 App Router의 API Routes에서 쿠키 기반 인증 문제
- 클라이언트의 fetch 요청에서 `credentials: "include"`를 사용해도 쿠키가 제대로 전달되지 않음
- 서버 측에서 `await cookies()`로 쿠키를 가져와도 인증 정보 누락

**해결 방법:**
- API Route 호출 대신 클라이언트에서 직접 Supabase client 사용
- `CommentItem` 컴포넌트에 `useSupabase` hook 추가
- `fetch('/api/comments/{id}/like')` → `client.from('comment_likes').insert()` 직접 호출로 변경

**수정된 파일:**
- `src/components/comments/comment-item.tsx`:
  - `useSupabase` hook import 추가
  - `handleLikeToggle` 함수에서 직접 Supabase client 사용
  - API route 우회하여 인증 문제 해결

**기술적 배경:**
- Next.js 15의 쿠키 처리 방식 변경으로 인한 호환성 문제
- 댓글 작성(comment-input.tsx)도 동일한 이유로 이미 직접 Supabase client 사용 중
- API Routes는 서버 간 통신이나 민감한 로직에만 사용하고, 단순 CRUD는 클라이언트에서 직접 처리하는 것이 안정적

#### 3. TypeScript 빌드 에러 수정 (commit: 5f24a35)
**문제점:**
- `npm run build` 실행 시 7개의 TypeScript 에러 발생
- production 빌드 실패

**수정 내역:**
1. **데이터베이스 스키마 컬럼명 불일치 수정:**
   - `user_id` → `profile_id` (crew_members, records 테이블)
   - `distance` → `distance_km` (records 테이블)
   - `leader_id` → `owner_id` (crews 테이블)
   - `username`, `full_name` → `display_name` (profiles 테이블)

2. **TypeScript `any` 타입 제거:**
   - Admin API routes: `Promise<{ id: any }>` → `Promise<{ id: string }>`
   - data-table.tsx: `as any` → `as Record<string, unknown>`
   - Comment interfaces: `mentions: string[]` → `mentions: string[] | null`

3. **ESLint 에러 수정:**
   - pagination.tsx: `let endPage` → `const adjustedStartPage` (prefer-const 규칙 위반 수정)

4. **타입 일관성 개선:**
   - Comment interface를 3개 파일에서 모두 동기화
   - ProfileRow 타입을 supabase types에서 직접 추출하도록 수정

**수정된 파일 (11개):**
- Admin API routes (4개): crews, missions, users 관련 route 파일들
- Comments 컴포넌트 (3개): comment-input, comment-item, comments-section
- Admin 컴포넌트 (2개): data-table, pagination
- Provider: supabase-provider
- API: comments route

### 개발 프로세스 개선

**올바른 개발 워크플로우 확립:**
1. `dev` 브랜치에서 기능 개발/버그 수정
2. 로컬 테스트 및 `npm run build` 실행하여 빌드 성공 확인
3. dev 브랜치에 커밋
4. `main` 브랜치로 merge
5. `main` 브랜치 push

**교훈:**
- main 브랜치에 직접 push하지 않고 항상 dev 브랜치를 거치도록 함
- push 전에 반드시 `npm run build` 테스트 수행
- 빌드 성공 확인 후에만 main으로 merge

### Git 커밋 히스토리

```
ff46026 fix: resolve comment like 401 Unauthorized error
8031a73 fix: update comment count dynamically when comments are added or deleted
5f24a35 fix: resolve TypeScript build errors
79ef49b feat: add universal comments system with mentions and likes
```

### 기술 스택 참고사항

**Next.js 15 App Router + Supabase 인증 이슈:**
- API Routes에서 쿠키 기반 인증이 불안정함
- 클라이언트 컴포넌트에서는 `useSupabase` hook으로 직접 Supabase client 사용 권장
- Server Components나 Server Actions에서만 `createClient(cookies())` 사용

**권장 패턴:**
- 단순 CRUD: 클라이언트에서 직접 Supabase client 사용
- 복잡한 로직/권한 체크: Server Actions 사용
- 외부 API 호출: API Routes 사용

---

마지막 업데이트: 2025-10-12
