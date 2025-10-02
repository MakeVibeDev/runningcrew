# RunningCrew 개발 로그

## 프로젝트 개요

RunningCrew는 러닝 크루 미션 추적 앱으로, Next.js 15 App Router와 Supabase를 기반으로 구축되었습니다.

### 기술 스택
- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **주요 기능**: OCR 기반 러닝 기록 업로드, 크루/미션 관리, 통계 대시보드

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

마지막 업데이트: 2025-10-02
