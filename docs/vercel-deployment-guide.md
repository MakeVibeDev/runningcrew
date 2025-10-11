# Vercel 배포 가이드: Main/Admin 분리 배포

## 개요

이 프로젝트는 하나의 코드베이스에서 **Main 서비스**와 **Admin 패널**을 분리하여 배포할 수 있도록 설계되었습니다.

- **Main 서비스**: 일반 사용자용 서비스 (missions, crews, records, members 등)
- **Admin 패널**: 관리자용 대시보드 (admin-dashboard, admin-login)

환경 변수 `NEXT_PUBLIC_APP_TYPE`을 통해 빌드 시 어떤 앱으로 동작할지 결정합니다.

---

## 로컬 테스트

배포 전 로컬에서 두 앱이 독립적으로 작동하는지 확인하세요.

### Main 앱 실행
```bash
npm run dev
# 또는
npm run build
npm start
```
- 접속: http://localhost:3000
- `/` - 서비스 홈 (✅)
- `/missions`, `/crews`, `/records`, `/members` - 서비스 페이지 (✅)
- `/admin-dashboard`, `/admin-login` - 차단되고 `/`로 리다이렉트 (✅)

### Admin 앱 실행
```bash
npm run dev:admin
# 또는
npm run build:admin
npm run start:admin
```
- 접속: http://localhost:3001
- `/` - `/admin-dashboard`로 자동 rewrite (✅)
- `/admin-login`, `/admin-dashboard` - 관리자 페이지 (✅)
- `/missions`, `/crews`, `/records`, `/members` - 차단되고 `/admin-dashboard`로 리다이렉트 (✅)

---

## Vercel 배포 설정

### 1. 프로젝트 생성

Vercel 대시보드에서 **두 개의 프로젝트**를 생성합니다:

1. **runningcrew** (Main 서비스)
2. **runningcrew-admin** (Admin 패널)

둘 다 동일한 GitHub 저장소를 연결합니다.

---

### 2. Main 서비스 배포 설정

**프로젝트**: `runningcrew`

#### Build & Development Settings
```
Framework Preset: Next.js
Build Command: npm run build
Output Directory: (기본값 사용)
Install Command: npm install
Development Command: npm run dev
```

#### Environment Variables

`.env.local` 파일을 참고하여 다음 환경 변수를 **모두** 추가하세요:

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `NEXT_PUBLIC_APP_TYPE` | `main` | **Main 앱임을 명시 (중요!)** |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJxxx...` | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJxxx...` | Supabase Service Role Key |
| `SUPABASE_JWT_SECRET` | `your-jwt-secret` | Admin 인증용 JWT Secret |
| `ADMIN_USERNAME` | `admin` | Admin 로그인 ID |
| `ADMIN_PASSWORD` | `runningcrew2025!` | Admin 로그인 비밀번호 |
| `NEXT_PUBLIC_SITE_URL` | `https://runningcrew.io` | Main 서비스 URL |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | `xxx` | Kakao JavaScript Key |
| `NEXT_PUBLIC_KAKAO_REST_API_KEY` | `xxx` | Kakao REST API Key |
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/...` | (선택) Slack 피드백 웹훅 |

**중요**:
- `NEXT_PUBLIC_APP_TYPE=main`으로 반드시 설정
- 설정하지 않으면 기본값이 `main`이지만, 명시하는 것을 권장

#### Domains
- `runningcrew.io` (또는 원하는 메인 도메인)
- `www.runningcrew.io`

---

### 3. Admin 패널 배포 설정

**프로젝트**: `runningcrew-admin`

#### Build & Development Settings
```
Framework Preset: Next.js
Build Command: npm run build:admin
Output Directory: (기본값 사용)
Install Command: npm install
Development Command: npm run dev:admin
```

#### Environment Variables

Main 서비스와 **동일한 환경 변수**를 추가하되, 다음 항목만 변경:

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `NEXT_PUBLIC_APP_TYPE` | `admin` | **Admin 앱임을 명시 (필수!)** |
| `NEXT_PUBLIC_SITE_URL` | `https://admin.runningcrew.io` | Admin 패널 URL |

**중요**:
- `NEXT_PUBLIC_APP_TYPE=admin`으로 **반드시** 설정
- 이 값이 없거나 다르면 Admin 앱으로 작동하지 않음

#### Domains
- `admin.runningcrew.io` (또는 원하는 Admin 도메인)

---

## 동작 원리

### 환경 변수 기반 분기

[next.config.ts](../next.config.ts):
```typescript
const isAdminApp = process.env.NEXT_PUBLIC_APP_TYPE === "admin";
```

### Rewrites (라우트 재작성)

**Admin 앱 전용**:
```typescript
// Admin 앱에서 루트(/)를 /admin-dashboard로 자동 이동
{ source: "/", destination: "/admin-dashboard" }
```

### Redirects (라우트 차단)

**Admin 앱**:
```typescript
// 서비스 라우트 차단
{ source: "/missions/:path*", destination: "/admin-dashboard" }
{ source: "/crews/:path*", destination: "/admin-dashboard" }
{ source: "/records/:path*", destination: "/admin-dashboard" }
{ source: "/members/:path*", destination: "/admin-dashboard" }
```

**Main 앱**:
```typescript
// Admin 라우트 차단
{ source: "/admin-dashboard/:path*", destination: "/" }
{ source: "/admin-login", destination: "/" }
```

### Middleware 런타임 보호

[src/middleware.ts](../src/middleware.ts):
- 빌드 타임 redirects를 우회하려는 시도를 런타임에서 추가 차단
- Admin 앱에서 `/auth/callback` 차단 (Kakao 로그인 불필요)

---

## 배포 확인 체크리스트

### Main 서비스 (runningcrew.io)
- [ ] 메인 페이지 접속 가능 (`/`)
- [ ] 서비스 페이지 접속 가능 (`/missions`, `/crews`, `/records`, `/members`)
- [ ] Admin 페이지 접속 시 메인으로 리다이렉트 (`/admin-dashboard` → `/`)
- [ ] Kakao 로그인 정상 동작
- [ ] 기록 업로드 정상 동작

### Admin 패널 (admin.runningcrew.io)
- [ ] 루트 접속 시 대시보드로 이동 (`/` → `/admin-dashboard`)
- [ ] Admin 로그인 페이지 접속 가능 (`/admin-login`)
- [ ] Admin 로그인 정상 동작
- [ ] 대시보드에서 기록/회원 관리 가능
- [ ] 서비스 페이지 접속 시 대시보드로 리다이렉트 (`/missions` → `/admin-dashboard`)

---

## 트러블슈팅

### 문제 1: Admin 앱에서 서비스 페이지가 보임
**원인**: `NEXT_PUBLIC_APP_TYPE=admin` 환경 변수가 설정되지 않음
**해결**: Vercel 프로젝트 설정에서 환경 변수 확인 후 재배포

### 문제 2: Main 앱에서 Admin 페이지가 보임
**원인**: `NEXT_PUBLIC_APP_TYPE` 값이 잘못 설정됨
**해결**: `main` 또는 설정하지 않음 (기본값이 main)

### 문제 3: 빌드 실패
**원인**: 필수 환경 변수 누락
**해결**: 위 Environment Variables 섹션의 모든 변수가 설정되었는지 확인

### 문제 4: API 호출 실패
**원인**: `NEXT_PUBLIC_SITE_URL`이 잘못 설정됨
**해결**:
- Main: `https://runningcrew.io`
- Admin: `https://admin.runningcrew.io`

### 문제 5: Supabase 인증 오류
**원인**: Supabase 프로젝트의 Redirect URLs 미설정
**해결**: Supabase Dashboard → Authentication → URL Configuration에 다음 추가:
- `https://runningcrew.io/auth/callback`
- `http://localhost:3000/auth/callback` (로컬 테스트용)

---

## 환경 변수 파일 참고

### Main 서비스용
`.env.local` (현재 파일 사용)

### Admin 패널용
`.env.admin.example` (템플릿 제공)

```bash
# Admin 로컬 테스트용 환경 변수 생성
cp .env.admin.example .env.admin.local
```

---

## 스크립트 요약

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | Main 앱 개발 서버 (포트 3000) |
| `npm run dev:admin` | Admin 앱 개발 서버 (포트 3001) |
| `npm run build` | Main 앱 프로덕션 빌드 |
| `npm run build:admin` | Admin 앱 프로덕션 빌드 |
| `npm start` | Main 앱 프로덕션 서버 (포트 3000) |
| `npm run start:admin` | Admin 앱 프로덕션 서버 (포트 3001) |

---

## 참고 사항

1. **코드베이스는 하나**, 배포만 두 개로 분리
2. 공통 코드 (`/lib`, `/components` 등)는 자동으로 양쪽에서 공유
3. 환경 변수로 라우트 동작을 제어하므로 **배포 전 반드시 환경 변수 확인**
4. Vercel에서 Preview 배포 시에도 환경 변수는 Production과 동일하게 설정 권장

---

## 업데이트 방법

1. GitHub에 코드 push
2. Vercel이 자동으로 Main, Admin 프로젝트 모두 재배포
3. 각 프로젝트는 설정된 빌드 명령어(`build` vs `build:admin`)에 따라 독립적으로 빌드됨

---

문의사항이 있으면 개발팀에 연락하세요.
