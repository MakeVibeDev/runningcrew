# RunningCrew Admin 앱 기획 & 설계

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [사용자 및 권한 체계](#사용자-및-권한-체계)
3. [핵심 기능 정의](#핵심-기능-정의)
4. [데이터 모델 분석](#데이터-모델-분석)
5. [화면 구조 및 UX](#화면-구조-및-ux)
6. [기술 아키텍처](#기술-아키텍처)
7. [개발 우선순위](#개발-우선순위)
8. [보안 및 권한 관리](#보안-및-권한-관리)
9. [성능 및 확장성](#성능-및-확장성)
10. [모니터링 및 로깅](#모니터링-및-로깅)

---

## 프로젝트 개요

### 목적
RunningCrew 서비스의 운영 효율화를 위한 관리자 전용 대시보드

### 목표
- 사용자, 크루, 미션, 기록 데이터의 효율적 관리
- 서비스 품질 모니터링 및 신속한 대응
- 데이터 기반 의사결정 지원
- 관리자 워크플로우 최적화

### 범위
- **Phase 1 (현재)**: 기본 CRUD 및 모니터링
- **Phase 2**: 통계/분석, 자동화
- **Phase 3**: 고급 관리 기능, AI 지원

---

## 사용자 및 권한 체계

### 관리자 역할 정의

#### 1. Super Admin (최고 관리자)
- **권한**: 모든 기능 접근 및 수정
- **담당**: 시스템 설정, 다른 관리자 관리
- **인원**: 1-2명 (서비스 Owner)

#### 2. Admin (일반 관리자)
- **권한**: 사용자/크루/미션/기록 관리
- **담당**: 일상적인 운영 관리, CS 대응
- **인원**: 3-5명

#### 3. Moderator (모더레이터)
- **권한**: 컨텐츠 검토 및 제재
- **담당**: 신고 처리, 부적절한 컨텐츠 관리
- **인원**: 5-10명 (서비스 성장에 따라)

### 권한 매트릭스

| 기능 | Super Admin | Admin | Moderator |
|------|-------------|-------|-----------|
| 대시보드 조회 | ✅ | ✅ | ✅ |
| 사용자 관리 | ✅ | ✅ | ⚠️ (조회만) |
| 크루 관리 | ✅ | ✅ | ⚠️ (조회만) |
| 미션 관리 | ✅ | ✅ | ❌ |
| 기록 관리 | ✅ | ✅ | ✅ |
| 컨텐츠 제재 | ✅ | ✅ | ✅ |
| 통계 조회 | ✅ | ✅ | ⚠️ (제한적) |
| 시스템 설정 | ✅ | ❌ | ❌ |
| 관리자 관리 | ✅ | ❌ | ❌ |

---

## 핵심 기능 정의

### 1. 대시보드 (Dashboard)

#### 1.1 메인 대시보드
**목적**: 서비스 전체 상태를 한눈에 파악

**주요 지표 (KPI)**:
```
┌─────────────────────────────────────────────────────┐
│  📊 실시간 현황 (Today)                              │
├─────────────────────────────────────────────────────┤
│  👥 신규 가입자: +125 (↑15% vs 어제)                 │
│  🏃 활동 사용자: 1,543 (↑8%)                         │
│  📝 등록 기록: 892 (↓3%)                             │
│  ⚡ 평균 응답시간: 245ms (정상)                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  📈 누적 통계 (Total)                                │
├─────────────────────────────────────────────────────┤
│  총 사용자: 12,543                                   │
│  활성 크루: 87                                       │
│  진행중 미션: 43                                      │
│  총 기록: 45,892                                     │
│  총 거리: 234,567 km                                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  🔥 인기 콘텐츠                                       │
├─────────────────────────────────────────────────────┤
│  1. 서울런너스 - 한강 야간 런닝 (참여 234명)          │
│  2. 부산마라톤클럽 - 100km 챌린지 (참여 189명)        │
│  3. 대구러닝크루 - 주말 모닝런 (참여 156명)            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  ⚠️ 주의 사항 (Alerts)                               │
├─────────────────────────────────────────────────────┤
│  • 신고된 기록 3건 검토 필요                          │
│  • 크루 가입 요청 12건 대기중                         │
│  • API 응답시간 증가 추세 (최근 1시간)                │
└─────────────────────────────────────────────────────┘
```

**구현 방향**:
- 실시간 업데이트 (WebSocket 또는 Polling)
- 차트 라이브러리: Recharts 또는 Chart.js
- 날짜 필터: 오늘/어제/7일/30일/커스텀
- Export 기능: CSV, Excel

#### 1.2 차트 및 그래프
- **사용자 증가 추이**: 일별/주별/월별 신규 가입자
- **활동 패턴**: 시간대별/요일별 활동 분포
- **크루 성장**: 크루별 멤버 증가 추이
- **미션 완료율**: 미션별 참여율 및 달성률
- **기록 통계**: 거리/시간/페이스 분포

---

### 2. 사용자 관리 (User Management)

#### 2.1 사용자 목록
**필터 옵션**:
- 가입일 (날짜 범위)
- 활동 상태 (활성/휴면/탈퇴)
- 크루 가입 여부
- 기록 수 범위
- 검색 (이름, 이메일, ID)

**표시 정보**:
```
┌────┬──────────┬───────────────────┬──────┬──────┬──────┬──────────┐
│ ID │ 프로필   │ 이름              │ 크루 │ 기록 │ 상태 │ 가입일   │
├────┼──────────┼───────────────────┼──────┼──────┼──────┼──────────┤
│ 1  │ [Avatar] │ 홍길동            │ 3개  │ 45건 │ 활성 │ 2025-03  │
│ 2  │ [Avatar] │ 김철수            │ 1개  │ 12건 │ 활성 │ 2025-04  │
│ 3  │ [Avatar] │ 이영희            │ 2개  │ 0건  │ 휴면 │ 2025-02  │
└────┴──────────┴───────────────────┴──────┴──────┴──────┴──────────┘
```

#### 2.2 사용자 상세
**정보 섹션**:
1. **기본 정보**
   - ID, 이름, 아바타
   - 가입일, 마지막 활동
   - 계정 상태

2. **활동 내역**
   - 총 기록 수, 총 거리, 총 시간
   - 가입한 크루 목록
   - 참여중인 미션 목록
   - 좋아요/댓글 활동

3. **소셜 활동**
   - 팔로워/팔로잉
   - 받은 좋아요/댓글
   - 작성한 댓글

4. **제재 이력**
   - 경고/정지 내역
   - 신고 받은 내역
   - 신고한 내역

**관리 액션**:
- ✏️ 프로필 수정
- 🚫 계정 정지 (1일/3일/7일/30일/영구)
- ⚠️ 경고 부여
- 💬 쪽지 발송
- 🗑️ 계정 삭제

#### 2.3 사용자 통계
- 일간/주간/월간 활동 분석
- 선호 크루/미션 분석
- 참여 패턴 (시간대, 요일)

---

### 3. 크루 관리 (Crew Management)

#### 3.1 크루 목록
**필터 옵션**:
- 생성일
- 멤버 수 범위
- 활동 지역
- 미션 수
- 상태 (활성/휴면)

**표시 정보**:
```
┌────┬──────────┬─────────────┬────────┬──────┬──────┬──────────┐
│ ID │ 로고     │ 크루명      │ 오너   │ 멤버 │ 미션 │ 생성일   │
├────┼──────────┼─────────────┼────────┼──────┼──────┼──────────┤
│ 1  │ [Logo]   │ 서울런너스  │ 홍길동 │ 234  │ 12   │ 2025-01  │
│ 2  │ [Logo]   │ 부산러닝    │ 김철수 │ 189  │ 8    │ 2025-02  │
└────┴──────────┴─────────────┴────────┴──────┴──────┴──────────┘
```

#### 3.2 크루 상세
**정보 섹션**:
1. **기본 정보**
   - 크루명, 설명, 소개
   - 로고, 배경 이미지
   - 활동 지역, 위치
   - 오너 정보

2. **멤버 관리**
   - 멤버 목록 (role별 필터)
   - 가입 요청 관리
   - 멤버 검색
   - 멤버 강제 퇴출

3. **미션 관리**
   - 진행중 미션
   - 완료된 미션
   - 미션 통계

4. **통계**
   - 총 기록 수/거리
   - 활동 참여율
   - 성장 추이

**관리 액션**:
- ✏️ 크루 정보 수정
- 👥 멤버 관리 (추가/제거/role 변경)
- 🎯 미션 생성/수정/삭제
- 🚫 크루 정지/해산
- 📢 공지사항 발송

#### 3.3 크루 통계
- 크루별 활동 비교
- 지역별 분포
- 성장률 분석

---

### 4. 미션 관리 (Mission Management)

#### 4.1 미션 목록
**필터 옵션**:
- 상태 (예정/진행중/완료/취소)
- 크루
- 기간
- 참여자 수
- 목표 거리

**표시 정보**:
```
┌────┬─────────────────┬─────────────┬──────┬──────┬────────┬────────┐
│ ID │ 미션명          │ 크루        │ 기간 │ 참여 │ 달성률 │ 상태   │
├────┼─────────────────┼─────────────┼──────┼──────┼────────┼────────┤
│ 1  │ 한강 100km      │ 서울런너스  │ 7일  │ 234  │ 78%    │ 진행중 │
│ 2  │ 주말 모닝런     │ 부산러닝    │ 30일 │ 189  │ 45%    │ 진행중 │
└────┴─────────────────┴─────────────┴──────┴──────┴────────┴────────┘
```

#### 4.2 미션 상세
**정보 섹션**:
1. **기본 정보**
   - 제목, 설명
   - 기간 (시작/종료)
   - 목표 거리
   - 크루 정보

2. **참여 현황**
   - 참여자 목록
   - 개인별 달성률
   - 랭킹

3. **기록 관리**
   - 미션에 등록된 기록
   - 의심스러운 기록 플래그

4. **통계**
   - 총 거리/시간
   - 일별 기록 추이
   - 달성률 분석

**관리 액션**:
- ✏️ 미션 수정 (제목, 설명, 기간, 목표)
- 👥 참여자 관리
- 🚫 미션 취소
- 📊 통계 Export

---

### 5. 기록 관리 (Records Management) ✅ 구현 완료

#### 5.1 기록 목록 ✅
**현재 구현된 기능**:
- 페이지네이션 (20개씩)
- 검색 (사용자명, 크루명, 미션명)
- 정렬 (최신순/오래된순)
- 상세 정보 표시 (거리, 시간, 페이스, 이미지)

**추가 필요 기능**:
- 고급 필터
  - 날짜 범위
  - 거리 범위
  - 시간 범위
  - 공개/비공개
  - 의심스러운 기록 (flagged)
- Bulk Actions
  - 다중 선택
  - 일괄 삭제
  - 일괄 공개/비공개 전환

#### 5.2 기록 상세 및 수정 ✅
**현재 구현된 기능**:
- 기본 정보 조회/수정
  - 기록 일시
  - 거리 (km)
  - 시간 (HH:MM:SS)
  - 페이스 (분:초/km) - 자동 계산
  - 공개 여부
  - 메모
  - 이미지

**추가 필요 기능**:
- 기록 검증
  - OCR 결과 비교
  - 이상치 탐지 (비정상적으로 빠른 페이스 등)
  - 의심스러운 기록 플래그
- 이미지 관리
  - 이미지 확대/축소
  - 이미지 교체
  - EXIF 정보 표시
- 관련 정보
  - 사용자 프로필 링크
  - 미션 정보 링크
  - 좋아요/댓글 목록

---

### 6. 컨텐츠 관리 (Content Management)

#### 6.1 신고 관리
**신고 유형**:
- 부적절한 기록 (조작, 허위)
- 부적절한 프로필 (욕설, 비방)
- 부적절한 댓글/메시지
- 스팸
- 기타

**신고 처리 워크플로우**:
```
신고 접수 → 검토 대기 → 관리자 검토 → 조치 결정 → 조치 실행 → 완료
```

**표시 정보**:
```
┌────┬──────────┬──────────┬─────────────┬──────┬──────────┐
│ ID │ 유형     │ 신고자   │ 대상        │ 상태 │ 접수일   │
├────┼──────────┼──────────┼─────────────┼──────┼──────────┤
│ 1  │ 기록조작 │ 홍길동   │ 김철수 기록 │ 대기 │ 2025-10  │
│ 2  │ 욕설     │ 이영희   │ 박민수 댓글 │ 검토 │ 2025-10  │
└────┴──────────┴──────────┴─────────────┴──────┴──────────┘
```

**조치 옵션**:
- ✅ 신고 기각 (문제 없음)
- ⚠️ 경고 부여
- 🗑️ 컨텐츠 삭제
- 🚫 사용자 정지 (기간 설정)
- 🔨 영구 차단

#### 6.2 댓글 관리
- 최근 댓글 목록
- 신고된 댓글
- 댓글 검색
- 댓글 삭제/수정

---

### 7. 통계 및 분석 (Analytics)

#### 7.1 사용자 분석
**주요 지표**:
- DAU (Daily Active Users)
- WAU (Weekly Active Users)
- MAU (Monthly Active Users)
- Retention Rate (재방문율)
- Churn Rate (이탈률)

**세그먼트 분석**:
- 신규 vs 기존 사용자
- 크루 가입 여부
- 활동 빈도별 (Light/Medium/Heavy)

#### 7.2 크루/미션 분석
- 크루별 참여율
- 미션별 완료율
- 인기 크루/미션 랭킹
- 지역별 분포

#### 7.3 기록 분석
- 일별/주별/월별 기록 수
- 평균 거리/시간/페이스
- 시간대별/요일별 분포
- 기록 품질 (OCR 신뢰도)

#### 7.4 비즈니스 인사이트
- 성장 지표 (Growth Metrics)
- 참여 지표 (Engagement Metrics)
- 품질 지표 (Quality Metrics)
- 수익 지표 (Revenue Metrics - 미래)

---

### 8. 시스템 관리 (System Management)

#### 8.1 관리자 계정 관리
- 관리자 목록
- 역할 변경 (Super Admin, Admin, Moderator)
- 로그인 이력
- 활동 로그

#### 8.2 시스템 설정
- 서비스 공지사항
- 점검 모드 설정
- 약관/정책 관리
- 이메일 템플릿 관리

#### 8.3 API 관리
- API 사용량 모니터링
- Rate Limiting 설정
- API Key 관리 (미래)

---

## 데이터 모델 분석

### 현재 데이터베이스 구조

```
profiles (사용자)
├── id: string (PK)
├── display_name: string
├── avatar_url: string?
├── crew_role: "member" | "admin"
├── bio: string?
└── timestamps

crews (크루)
├── id: string (PK)
├── owner_id: string (FK → profiles)
├── name: string
├── slug: string (unique)
├── description: string?
├── intro: string?
├── logo_image_url: string?
├── activity_region: string
├── location_lat: number?
├── location_lng: number?
└── timestamps

crew_members (크루 멤버십)
├── crew_id: string (FK → crews)
├── profile_id: string (FK → profiles)
├── role: "owner" | "admin" | "member"
└── timestamps

missions (미션)
├── id: string (PK)
├── crew_id: string (FK → crews)
├── title: string
├── description: string?
├── start_date: string
├── end_date: string
├── target_distance_km: number?
└── timestamps

mission_participants (미션 참여자)
├── id: string (PK)
├── mission_id: string (FK → missions)
├── profile_id: string (FK → profiles)
├── status: "joined" | "left"
├── joined_at: string
├── left_at: string?
└── timestamps

records (기록)
├── id: string (PK)
├── profile_id: string (FK → profiles)
├── mission_id: string (FK → missions)
├── ocr_result_id: string? (FK → record_ocr_results)
├── recorded_at: string
├── distance_km: number
├── duration_seconds: number
├── pace_seconds_per_km: number?
├── visibility: "public" | "private"
├── notes: string?
├── image_path: string?
└── timestamps

record_ocr_results (OCR 결과)
├── id: string (PK)
├── profile_id: string (FK → profiles)
├── storage_path: string
├── raw_text: string?
├── distance_km: number?
├── duration_seconds: number?
├── recorded_at: string?
├── confidence: number?
└── timestamps

notifications (알림) - migration 파일에서 확인
likes (좋아요) - migration 파일에서 확인
comments (댓글) - migration 파일에서 확인
crew_join_requests (가입 요청) - migration 파일에서 확인
```

### Admin 전용 테이블 추가 필요

```sql
-- 관리자 계정
admin_users
├── id: uuid (PK)
├── username: string (unique)
├── password_hash: string
├── role: "super_admin" | "admin" | "moderator"
├── name: string
├── email: string?
├── is_active: boolean
├── last_login_at: timestamp?
├── created_at: timestamp
└── updated_at: timestamp

-- 관리자 활동 로그
admin_activity_logs
├── id: uuid (PK)
├── admin_id: uuid (FK → admin_users)
├── action: string (예: "user_suspend", "record_delete")
├── target_type: string (예: "profile", "record")
├── target_id: string
├── details: jsonb (상세 정보)
├── ip_address: string?
└── created_at: timestamp

-- 신고
reports
├── id: uuid (PK)
├── reporter_id: uuid (FK → profiles)
├── target_type: string ("profile" | "record" | "comment")
├── target_id: string
├── reason: string
├── description: text?
├── status: "pending" | "reviewing" | "resolved" | "rejected"
├── reviewed_by: uuid? (FK → admin_users)
├── reviewed_at: timestamp?
├── resolution: text?
├── created_at: timestamp
└── updated_at: timestamp

-- 제재 이력
sanctions
├── id: uuid (PK)
├── profile_id: uuid (FK → profiles)
├── type: "warning" | "suspension" | "ban"
├── reason: string
├── start_at: timestamp
├── end_at: timestamp? (정지 해제 시간, null이면 영구)
├── issued_by: uuid (FK → admin_users)
├── notes: text?
├── is_active: boolean
├── created_at: timestamp
└── updated_at: timestamp

-- 시스템 공지
system_notices
├── id: uuid (PK)
├── title: string
├── content: text
├── type: "maintenance" | "announcement" | "update"
├── is_active: boolean
├── start_at: timestamp?
├── end_at: timestamp?
├── created_by: uuid (FK → admin_users)
├── created_at: timestamp
└── updated_at: timestamp
```

---

## 화면 구조 및 UX

### 전체 레이아웃

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] RunningCrew Admin          [Username ▼] [Logout]    │
├────────┬────────────────────────────────────────────────────┤
│        │                                                    │
│ 📊 대시보드│   Main Content Area                             │
│ 👥 사용자  │                                                    │
│ 🏃 크루    │   - Breadcrumb                                  │
│ 🎯 미션    │   - Page Title                                  │
│ 📝 기록    │   - Filters / Search                            │
│ 🚨 신고    │   - Data Table / Cards                          │
│ 💬 댓글    │   - Pagination                                  │
│ 📈 통계    │                                                    │
│ ⚙️ 설정    │                                                    │
│        │                                                    │
│        │                                                    │
└────────┴────────────────────────────────────────────────────┘
```

### UI/UX 원칙

1. **직관성**: 관리자가 학습 없이 사용 가능
2. **효율성**: 최소 클릭으로 작업 완료
3. **일관성**: 모든 페이지에서 동일한 패턴
4. **피드백**: 모든 액션에 명확한 피드백
5. **안전성**: 중요한 액션은 확인 절차

### 컬러 시스템

```
Primary: #FF6B35 (Orange - 주요 액션)
Success: #10B981 (Green - 성공, 활성)
Warning: #F59E0B (Yellow - 경고, 주의)
Danger: #EF4444 (Red - 삭제, 위험)
Info: #3B82F6 (Blue - 정보)

Background: #F9FAFB (Light Gray)
Card: #FFFFFF (White)
Border: #E5E7EB (Gray)
Text: #111827 (Dark Gray)
Text Secondary: #6B7280 (Medium Gray)
```

### 컴포넌트 라이브러리

**기본 컴포넌트**:
- Button (Primary, Secondary, Danger, Ghost)
- Input (Text, Number, Date, Select, Textarea)
- Table (Sortable, Filterable, Paginated)
- Card
- Modal/Dialog
- Toast/Alert
- Badge/Tag
- Dropdown Menu
- Tabs
- Loading Spinner

**차트 컴포넌트**:
- Line Chart (추이)
- Bar Chart (비교)
- Pie Chart (비율)
- Area Chart (누적)
- Heatmap (시간대별 활동)

---

## 기술 아키텍처

### 프론트엔드

**프레임워크 & 라이브러리**:
```
Next.js 15 (App Router)
├── React 19
├── TypeScript
├── Tailwind CSS
└── Shadcn/ui (Base Components)

상태 관리:
├── React Query (서버 상태)
└── Zustand (클라이언트 상태)

차트:
└── Recharts

폼 관리:
├── React Hook Form
└── Zod (Validation)

날짜:
└── date-fns

테이블:
└── TanStack Table (React Table v8)
```

### 백엔드

**API 구조**:
```
/api/admin/
├── /auth
│   ├── /login (POST)
│   ├── /logout (POST)
│   └── /session (GET)
├── /dashboard
│   ├── /stats (GET)
│   └── /activity (GET)
├── /users
│   ├── / (GET, POST)
│   ├── /[id] (GET, PATCH, DELETE)
│   └── /[id]/sanctions (GET, POST)
├── /crews
│   ├── / (GET, POST)
│   ├── /[id] (GET, PATCH, DELETE)
│   └── /[id]/members (GET, POST, DELETE)
├── /missions
│   ├── / (GET, POST)
│   ├── /[id] (GET, PATCH, DELETE)
│   └── /[id]/participants (GET)
├── /records ✅
│   ├── / (GET) ✅
│   ├── /[id] (GET, PATCH, DELETE) ✅
│   └── /[id]/verify (POST)
├── /reports
│   ├── / (GET)
│   ├── /[id] (GET, PATCH)
│   └── /[id]/resolve (POST)
├── /comments
│   ├── / (GET)
│   └── /[id] (DELETE)
└── /analytics
    ├── /users (GET)
    ├── /crews (GET)
    ├── /missions (GET)
    └── /records (GET)
```

**인증 & 보안**:
- JWT 기반 인증 (HTTP-only Cookie) ✅ 구현 완료
- CSRF Protection
- Rate Limiting
- IP Whitelist (선택)
- Activity Logging ✅ 필요

**데이터베이스**:
- Supabase (PostgreSQL)
- Row Level Security (RLS) 우회 (Service Role Key 사용) ✅
- 인덱스 최적화
- 정기 백업

---

## 개발 우선순위

### Phase 1: MVP (현재 단계) - 2주
**목표**: 핵심 관리 기능 구현

✅ **완료**:
- [x] Admin/Main 앱 분리
- [x] JWT 인증 시스템
- [x] 대시보드 (기본)
- [x] 기록 관리 (목록, 상세, 수정, 삭제)

🚧 **진행 중**:
- [ ] 사용자 관리
  - [ ] 목록 (페이지네이션, 검색, 필터)
  - [ ] 상세 (정보 조회, 활동 내역)
  - [ ] 계정 정지/활성화
- [ ] 크루 관리
  - [ ] 목록
  - [ ] 상세 (정보, 멤버)
  - [ ] 정보 수정
- [ ] 미션 관리
  - [ ] 목록
  - [ ] 상세

### Phase 2: 확장 - 4주
**목표**: 고급 관리 및 모니터링

- [ ] 신고 관리 시스템
  - [ ] 신고 목록 및 상세
  - [ ] 신고 처리 워크플로우
  - [ ] 제재 이력 관리
- [ ] 댓글 관리
- [ ] 통계 대시보드
  - [ ] 사용자 분석
  - [ ] 크루/미션 분석
  - [ ] 기록 분석
- [ ] 관리자 활동 로그
- [ ] Export 기능 (CSV, Excel)

### Phase 3: 최적화 - 4주
**목표**: UX 개선 및 자동화

- [ ] 실시간 알림 (WebSocket)
- [ ] 고급 검색 및 필터
- [ ] Bulk Actions (일괄 처리)
- [ ] 자동 신고 처리 (AI/Rule 기반)
- [ ] 이상 탐지 (Anomaly Detection)
- [ ] 성능 최적화
- [ ] 접근성 개선 (a11y)

### Phase 4: 고도화 - 지속적
**목표**: AI 및 자동화

- [ ] AI 기반 컨텐츠 검토
- [ ] 예측 분석 (이탈 예측, 성장 예측)
- [ ] 자동화 워크플로우
- [ ] 고급 비즈니스 인사이트
- [ ] 모바일 앱 (선택)

---

## 보안 및 권한 관리

### 인증 (Authentication)

**현재 구현** ✅:
- JWT 기반 세션 관리
- HTTP-only Cookie 저장
- `/api/admin/login` - 로그인
- `/api/admin/logout` - 로그아웃
- `/api/admin/session` - 세션 확인

**추가 필요**:
- [ ] 비밀번호 정책 강화
  - 최소 길이: 12자
  - 대소문자, 숫자, 특수문자 포함
- [ ] 2FA (Two-Factor Authentication)
- [ ] 세션 타임아웃 (30분 무활동)
- [ ] 동시 세션 제한
- [ ] 로그인 이력 추적

### 권한 (Authorization)

**구현 방향**:
```typescript
// Middleware에서 권한 체크
export async function checkAdminPermission(
  request: NextRequest,
  requiredRole: AdminRole
): Promise<boolean> {
  const session = await getAdminSession(request);

  if (!session) return false;

  const roleHierarchy = {
    'super_admin': 3,
    'admin': 2,
    'moderator': 1
  };

  return roleHierarchy[session.role] >= roleHierarchy[requiredRole];
}

// API Route에서 사용
export async function GET(request: NextRequest) {
  if (!await checkAdminPermission(request, 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ... 로직
}
```

### 데이터 보안

**RLS 우회** ✅:
- Service Role Key 사용
- Admin API는 RLS 정책 무시

**민감 정보 보호**:
- 개인정보 마스킹 (이메일, 전화번호)
- 비밀번호는 절대 노출 안 함
- API 응답에서 민감 필드 제외

**감사 로그** (Audit Log):
- 모든 중요 액션 기록
- 누가, 언제, 무엇을, 왜 했는지
- 변경 전/후 데이터 저장

---

## 성능 및 확장성

### 프론트엔드 최적화

**React Query 캐싱**:
```typescript
// 목록: 5분 캐시
useQuery({
  queryKey: ['admin', 'users'],
  queryFn: fetchUsers,
  staleTime: 5 * 60 * 1000,
});

// 상세: 1분 캐시
useQuery({
  queryKey: ['admin', 'user', userId],
  queryFn: () => fetchUser(userId),
  staleTime: 60 * 1000,
});

// 통계: 10분 캐시
useQuery({
  queryKey: ['admin', 'stats'],
  queryFn: fetchStats,
  staleTime: 10 * 60 * 1000,
});
```

**가상 스크롤**:
- 대용량 목록은 가상 스크롤 적용
- react-virtual 또는 TanStack Virtual 사용

**이미지 최적화**:
- Next.js Image 컴포넌트 사용
- Lazy Loading
- WebP 포맷

### 백엔드 최적화

**데이터베이스 인덱스**:
```sql
-- 자주 조회되는 컬럼에 인덱스
CREATE INDEX idx_profiles_display_name ON profiles(display_name);
CREATE INDEX idx_records_profile_id ON records(profile_id);
CREATE INDEX idx_records_mission_id ON records(mission_id);
CREATE INDEX idx_records_recorded_at ON records(recorded_at DESC);
CREATE INDEX idx_crews_slug ON crews(slug);
CREATE INDEX idx_missions_crew_id ON missions(crew_id);
CREATE INDEX idx_mission_participants_mission_id ON mission_participants(mission_id);

-- 복합 인덱스
CREATE INDEX idx_records_profile_mission ON records(profile_id, mission_id);
CREATE INDEX idx_crew_members_crew_profile ON crew_members(crew_id, profile_id);
```

**쿼리 최적화**:
- JOIN 최소화
- SELECT * 지양, 필요한 컬럼만
- 페이지네이션 적용
- COUNT(*) 대신 추정값 사용 (대용량 테이블)

**API 캐싱**:
- Redis 도입 고려 (미래)
- 통계 데이터는 5-10분 캐시
- 자주 변하지 않는 데이터는 CDN 캐싱

### 확장성

**수평 확장**:
- Vercel의 자동 스케일링 활용
- Edge Functions 고려

**모니터링**:
- Vercel Analytics
- Sentry (에러 추적)
- Custom Metrics (Prometheus/Grafana - 미래)

---

## 모니터링 및 로깅

### 애플리케이션 모니터링

**핵심 지표**:
- 응답 시간 (Response Time)
- 에러율 (Error Rate)
- API 호출 수 (Request Count)
- 동시 접속자 수 (Concurrent Users)

**도구**:
- Vercel Analytics (기본)
- Sentry (에러 추적)
- Custom Dashboard (미래)

### 관리자 활동 로그

**기록할 액션**:
- 로그인/로그아웃
- 데이터 수정 (CRUD)
- 사용자 제재
- 시스템 설정 변경

**로그 구조**:
```typescript
interface AdminActivityLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string; // "user_suspend", "record_delete"
  targetType: string; // "profile", "record"
  targetId: string;
  details: {
    before?: any; // 변경 전
    after?: any; // 변경 후
    reason?: string;
  };
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}
```

**로그 보관 정책**:
- 최소 1년 보관
- 정기적으로 아카이빙
- 중요 로그는 영구 보관

### 알림 (Alerting)

**알림 조건**:
- 에러율 5% 초과
- 응답 시간 1초 초과
- 동시 접속자 임계값 초과
- 신고 건수 급증
- 시스템 장애

**알림 채널**:
- Slack Webhook ✅ 설정됨
- 이메일
- SMS (중요 알림)

---

## 다음 단계 (Next Actions)

### 1. 데이터베이스 마이그레이션 작성
- `admin_users` 테이블
- `admin_activity_logs` 테이블
- `reports` 테이블
- `sanctions` 테이블
- `system_notices` 테이블

### 2. 공통 컴포넌트 구축
- AdminLayout
- DataTable
- FilterBar
- ConfirmDialog
- Toast/Alert
- StatCard
- Chart 래퍼

### 3. API 라우트 구현
- 사용자 관리 API
- 크루 관리 API
- 미션 관리 API
- 신고 관리 API

### 4. 페이지 구현
- 사용자 목록/상세
- 크루 목록/상세
- 미션 목록/상세
- 신고 목록/상세

### 5. 테스트
- Unit Tests
- Integration Tests
- E2E Tests
- Security Tests

---

## 참고 자료

### 디자인 레퍼런스
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Stripe Dashboard](https://dashboard.stripe.com/)
- [Linear](https://linear.app/)

### 기술 문서
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [Shadcn/ui](https://ui.shadcn.com/)

---

작성일: 2025-10-11
작성자: Claude Code
버전: 1.0
