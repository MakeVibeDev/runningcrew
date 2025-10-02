# Naver OAuth + Supabase Auth 통합 가이드 (v1)

## 1. 준비 사항
- Supabase 프로젝트에서 **Kakao OAuth Provider** 활성화 (`Authentication > Providers > Kakao`).
- Kakao Developers 콘솔에 Redirect URI 등록: `https://<PROJECT>.supabase.co/auth/v1/callback` 및 로컬 개발용 `http://localhost:3000/auth/callback`.
- `.env.local`에 Supabase URL, anon/service 키를 저장하고 Kakao REST API 키/Secret은 Supabase 대시보드에 입력.
- (향후) Naver 커스텀 Provider는 Self-host 또는 별도 Auth 계층 도입 후 추가 예정.

## 2. Next.js 앱 설정
1. `@supabase/supabase-js`로 클라이언트 생성: `/lib/supabaseBrowser.ts`.
2. 로그인 버튼에서 `supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: <post-login URL> } })` 호출.
3. OAuth 콜백 페이지(`/app/auth/callback`)에서 `exchangeCodeForSession`으로 세션을 교환하고 홈으로 리다이렉트.

## 3. 세션 유지 로직
- 서버 컴포넌트: `cookies()`를 이용해 Supabase 서버 클라이언트 생성.
- 클라이언트 컴포넌트: `SessionContextProvider`로 세션 공유.
- 세션 만료 시 `supabase.auth.refreshSession()` 호출.

## 4. 오류 처리
| 에러 시나리오 | 처리 방식 |
| --- | --- |
| 사용자 동의 거부 | `error=access_denied` 확인 후 안내 모달 노출 |
| Kakao 토큰 교환 실패 | Supabase 로그 확인, 사용자에게 재시도 권장 |
| RLS 거부 (프로필 없음) | 로그인 직후 `profiles` upsert 수행 |

## 5. 프로필 동기화
- 로그인 성공 후 `profiles` 테이블에 `upsert` (display_name = Naver 닉네임, avatar_url).
- 앱 최초 진입 시 `GET /api/profile` 호출로 기본 정보를 리턴.

## 6. 추후 확장
- Kakao OAuth 추가 시 동일 패턴으로 provider만 변경.
- 이메일/비밀번호 흐름은 Supabase 기본 UI 또는 커스텀 폼 구축.
