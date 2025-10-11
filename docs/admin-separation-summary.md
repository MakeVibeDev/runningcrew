# Admin/Main 분리 작업 완료 보고서

## 작업 개요

하나의 코드베이스에서 **Main 서비스**와 **Admin 패널**을 완전히 분리하여 독립적으로 배포할 수 있도록 구현했습니다.

## 완료된 작업

### 1. 환경 변수 기반 앱 분리
- `.env.admin.example` 파일 생성
- `NEXT_PUBLIC_APP_TYPE` 환경 변수로 앱 타입 제어

### 2. Next.js 설정 수정
- [next.config.ts](../next.config.ts): rewrites/redirects 추가
  - Admin 앱: `/` → `/admin-dashboard` 자동 이동
  - 각 앱에서 반대편 라우트 차단

### 3. Middleware 강화
- [src/middleware.ts](../src/middleware.ts): 런타임 라우트 보호 추가
  - Admin 앱: 서비스 라우트 차단
  - Main 앱: Admin 라우트 차단

### 4. 빌드 스크립트 추가
- [package.json](../package.json): 새로운 npm scripts
  - `npm run dev:admin` - Admin 개발 서버 (포트 3001)
  - `npm run build:admin` - Admin 프로덕션 빌드
  - `npm run start:admin` - Admin 프로덕션 서버

### 5. TypeScript 오류 수정
- Admin records API 타입 오류 해결
- useSearchParams Suspense boundary 문제 해결

## 테스트 결과

### 로컬 테스트 ✅
```
Main 앱 (포트 3000):
✅ / → 200 (서비스 홈)
✅ /admin-dashboard → 307 redirect to /

Admin 앱 (포트 3001):
✅ / → 200 (admin-dashboard로 rewrite)
✅ /admin-login → 200
✅ /missions → 307 redirect to /admin-dashboard
```

### 프로덕션 빌드 테스트 ✅
```bash
✅ npm run build - 성공 (Main 앱)
✅ npm run build:admin - 성공 (Admin 앱)
```

## 배포 가이드

상세한 배포 가이드는 [vercel-deployment-guide.md](./vercel-deployment-guide.md)를 참고하세요.

### 빠른 시작

#### Vercel에서 두 개의 프로젝트 생성

1. **runningcrew** (Main 서비스)
   - Build Command: `npm run build`
   - Environment Variables: `NEXT_PUBLIC_APP_TYPE=main` 또는 미설정 (기본값 main)
   - Domain: `runningcrew.io`

2. **runningcrew-admin** (Admin 패널)
   - Build Command: `npm run build:admin`
   - Environment Variables: `NEXT_PUBLIC_APP_TYPE=admin` **(필수!)**
   - Domain: `admin.runningcrew.io`

## 주의사항

### ⚠️ 중요: Environment Variables

**Admin 프로젝트**에서는 반드시 다음 환경 변수를 설정해야 합니다:
```
NEXT_PUBLIC_APP_TYPE=admin
```

이 값이 없거나 다르면 Admin 앱이 정상 작동하지 않습니다.

### 📝 환경 변수 전체 목록

Main과 Admin 모두 다음 환경 변수가 필요합니다:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `NEXT_PUBLIC_SITE_URL` (각 프로젝트에 맞게 설정)
- `NEXT_PUBLIC_KAKAO_JS_KEY`
- `NEXT_PUBLIC_KAKAO_REST_API_KEY`
- `SLACK_WEBHOOK_URL` (선택)

## 로컬 개발 명령어

### Main 서비스
```bash
npm run dev              # 개발 서버 (포트 3000)
npm run build            # 프로덕션 빌드
npm start                # 프로덕션 서버 실행
```

### Admin 패널
```bash
npm run dev:admin        # 개발 서버 (포트 3001)
npm run build:admin      # 프로덕션 빌드
npm run start:admin      # 프로덕션 서버 실행
```

### 동시 실행
```bash
# 터미널 1
npm run dev

# 터미널 2
npm run dev:admin
```

## 배포 체크리스트

배포 전 다음을 확인하세요:

### Main 서비스 (runningcrew.io)
- [ ] Vercel 프로젝트 생성 완료
- [ ] GitHub 저장소 연결 완료
- [ ] Build Command: `npm run build`
- [ ] 모든 환경 변수 설정 완료
- [ ] `NEXT_PUBLIC_APP_TYPE=main` 설정 (또는 미설정)
- [ ] `NEXT_PUBLIC_SITE_URL=https://runningcrew.io` 설정
- [ ] 도메인 연결 완료
- [ ] Supabase Redirect URLs에 `https://runningcrew.io/auth/callback` 추가

### Admin 패널 (admin.runningcrew.io)
- [ ] Vercel 프로젝트 생성 완료
- [ ] GitHub 저장소 연결 완료 (Main과 동일 repo)
- [ ] Build Command: `npm run build:admin`
- [ ] 모든 환경 변수 설정 완료
- [ ] `NEXT_PUBLIC_APP_TYPE=admin` 설정 **(필수!)**
- [ ] `NEXT_PUBLIC_SITE_URL=https://admin.runningcrew.io` 설정
- [ ] 도메인 연결 완료

### 배포 후 확인
- [ ] Main: 홈 페이지 정상 로드
- [ ] Main: 서비스 페이지 접근 가능
- [ ] Main: Admin 페이지 접근 차단 확인
- [ ] Main: Kakao 로그인 정상 동작
- [ ] Admin: 루트 접속 시 대시보드로 이동
- [ ] Admin: Admin 로그인 정상 동작
- [ ] Admin: 대시보드/기록/회원 관리 정상 동작
- [ ] Admin: 서비스 페이지 접근 차단 확인

## 파일 변경 내역

### 새로 생성된 파일
- `.env.admin.example` - Admin 환경 변수 템플릿
- `docs/vercel-deployment-guide.md` - 상세 배포 가이드
- `docs/admin-separation-summary.md` - 이 문서

### 수정된 파일
- `next.config.ts` - rewrites/redirects 추가
- `package.json` - admin 관련 스크립트 추가
- `src/middleware.ts` - 런타임 라우트 보호 추가
- `src/app/api/admin/records/[recordId]/route.ts` - TypeScript 타입 수정
- `src/app/admin-dashboard/records/page.tsx` - Suspense 추가

## 장점

1. **단일 코드베이스**: 공통 로직 재사용, 유지보수 용이
2. **독립적 배포**: Main/Admin 각각 독립적으로 스케일링 가능
3. **보안 강화**: 라우트 수준에서 완전히 분리
4. **명확한 도메인**: 사용자용/관리자용 URL 분리
5. **동시 개발**: 로컬에서 두 앱 동시 실행 가능

## 다음 단계

1. Vercel 프로젝트 생성 및 환경 변수 설정
2. 도메인 연결 (runningcrew.io, admin.runningcrew.io)
3. 배포 후 체크리스트 확인
4. Supabase Redirect URLs 업데이트
5. 프로덕션 환경에서 전체 기능 테스트

## 문제 발생 시

[vercel-deployment-guide.md](./vercel-deployment-guide.md)의 "트러블슈팅" 섹션을 참고하세요.

---

작업 완료일: 2025-10-11
개발자: Claude Code
