# Claude Code 사용 지침

## 커뮤니케이션 언어

**중요: 모든 커뮤니케이션은 한글로 진행합니다.**

- 사용자와의 모든 대화는 한국어로 작성
- 코드 설명, 에러 메시지 해석, 작업 진행 상황 등 모든 피드백을 한글로 제공
- 커밋 메시지, 문서 업데이트 등도 한글 우선 (필요시 영문 병기)
- 예외: 코드 자체(변수명, 함수명, 주석 등)는 영어 사용 가능

## 개발 워크플로우

### Git 브랜치 전략
1. **dev 브랜치**에서 개발 진행
2. **npm run build** 테스트 완료 후 커밋
3. **main 브랜치**에 merge
4. **origin에 push**

**절대 지켜야 할 규칙:**
- main 브랜치에 직접 push 금지
- build 테스트 없이 커밋 금지
- dev → test → main → push 순서 준수

### 빌드 전 체크리스트
- [ ] TypeScript 에러 없음
- [ ] ESLint 경고 해결
- [ ] npm run build 성공
- [ ] 기능 테스트 완료

## 프로젝트 특성

### 데이터베이스 스키마 주의사항
- `profiles` 테이블: `display_name` 사용 (username, full_name 아님)
- `crew_members`, `records`: `profile_id` 사용 (user_id 아님)
- `records`: `distance_km` 사용 (distance 아님)
- `crews`: `owner_id` 사용 (leader_id 아님)

### Next.js 15 패턴
- **API Routes 인증 이슈**: 쿠키 기반 인증이 제대로 작동하지 않음
- **해결 방법**: 클라이언트 컴포넌트에서 `useSupabase` 훅으로 직접 Supabase 클라이언트 사용
- **권장 패턴**:
  - 단순 CRUD: 클라이언트 컴포넌트 + useSupabase 훅
  - 복잡한 로직/인증: Server Actions
  - 외부 API: API Routes

### 코드 스타일
- TypeScript `any` 타입 사용 금지
- ESLint 규칙 준수
- 타입 안정성 우선

## 문서화
- 주요 기능 추가/수정 시 `docs/development-log.md` 업데이트
- 버그 수정 내용, 원인, 해결 방법 상세히 기록
- 배운 점(Lessons Learned) 섹션에 반복 방지를 위한 인사이트 추가
