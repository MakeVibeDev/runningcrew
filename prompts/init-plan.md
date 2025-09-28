# 초기 개발 로드맵

## Phase 0: 프로젝트 환경 및 기반 설정
- [ ] Next.js + TypeScript 프로젝트 설정 검수 (Turbopack, App Router 구조 유지)
- [x] Supabase 프로젝트 개설 및 `supabase/config.toml`, `.env.local` 템플릿 정비 (URL, anon/service 키)
- [x] Postgres 스키마 초안 수립과 마이그레이션 파이프라인(Supabase CLI) 도입
- [x] Supabase Storage 버킷(`crew-assets`, `records-raw`) 생성 및 접근 정책 적용
- [ ] OCR Provider 후보 비용/정확도 비교표 작성 (Clova vs Vision vs Textract)
- [ ] 공통 레이아웃, 헤더/푸터, 글로벌 상태 관리 선택(Recoil / Zustand / Server Actions 등) 명확화
- [ ] 디자인 시스템 초안 수립 및 `globals.css` 토큰 정비 (다크/라이트 모드 고려)
- [ ] 인증/데이터 연동 대비 로컬-원격 환경 분리 가이드 작성

## Phase 1: 인증 및 회원 관리 핵심 기능
- [ ] Supabase Auth 연동 구조 정의 (세션 저장, RLS 정책 초안)
- [ ] Naver/Kakao OAuth 커스텀 Provider 구현 후 Supabase Auth와 세션 동기화
- [ ] 기본 프로필 테이블(`profiles`) 스키마 설계 및 마이그레이션 적용
- [ ] 회원 가입/로그인/로그아웃 UI 구축 및 Supabase Client 훅 정리
- [ ] 크루 가입 신청 테이블(`crew_join_requests`) 설계 및 신청 흐름 구현
- [ ] 회원 대시보드 기본 틀 구축 (기록 요약 placeholder + Supabase 쿼리 훅)

## Phase 2: 회원 대시보드 경험 강화
- [ ] 기록 요약용 뷰/스토어(`records_view`) 설계로 거리·시간·페이스 집계 제공
- [ ] 대시보드 이모지 반응 기능 MVP 구현 (Supabase `dashboard_reactions` 테이블)
- [ ] 댓글 + @멘션 기능 데이터 모델 정의 및 Supabase Realtime 구독 전략 수립
- [ ] 접근 제어(본인/크루 관리자) 정책을 RLS 기반으로 문서화

## Phase 3: 기록 등록 및 관리 (1차 출시 핵심)
- [ ] 미션별 기록 업로드 플로우 정의 (Supabase Storage 서명 URL + 진행 상태 토스트)
- [ ] Edge Function `ocr-ingest` 구현 및 `record_ocr_results` 테이블 연동
- [ ] OCR API 연동(선정 Provider) + 정규식 파서 작성, 실패 시 수동 입력 fallback 처리
- [ ] 기록 폼 UI에서 OCR 자동 채움 → 사용자 검증/수정 → `records.ocr_result_id` 연결 로직 구현
- [ ] 공개 범위(public/private) 로직 및 통계 제외 규칙을 RLS/뷰로 적용
- [ ] 기본 관리자 알림(로그/슬랙 Webhook 등)으로 OCR 실패 모니터링

## Phase 4: 크루 관리 백오피스
- [ ] 크루 테이블 및 권한 모델(`crews`, `crew_members`) 설계, 관리자 롤 플래그 지정
- [ ] 가입 신청 승인/거절 UI와 Supabase RPC 또는 Edge Function으로 상태 업데이트
- [ ] 기록 변환 데이터 검토 화면과 신고 테이블(`record_reports`) 흐름 구현
- [ ] 이벤트 생성/수정 기능과 크루 미션 연계 정책을 DB 관계로 정의

## Phase 5: 이벤트 및 통계 대시보드
- [ ] 이벤트 템플릿 테이블(`events`) 설계 (기간, 업로드 설정, 목표)
- [ ] 이벤트별 기록 업로드 + OCR 데이터 필드(Postgres JSONB/정규화) 확정
- [ ] 이벤트 종료 후 종합 분석 뷰/머티리얼라이즈드 뷰로 마일리지·시간·평균 페이스 순위 제공
- [ ] 크루별 미션 현황 및 순위(거리/시간/횟수/주간) Supabase SQL 쿼리/차트 컴포넌트 구현
- [ ] private 기록 제외 규칙을 집계 뷰와 Edge Function 검증으로 보강

## Phase 6: 차후 확장 및 통합 계획
- [ ] 추가 소셜 로그인 및 이메일/비밀번호 가입 로드맵(Supabase Auth Provider 확장) 수립
- [ ] Garmin/순토/코로스/애플/갤럭시 API 연동 우선순위 및 Supabase ETL 전략 결정
- [ ] 크루 미션 중복 제한 정책 재검토 및 복수 미션 허용 시나리오 DB 설계
- [ ] 실시간 알림/푸시 전략 (Supabase Realtime, Edge Functions, 외부 Push 서비스) 수립
- [ ] QA 시나리오, 로깅/모니터링, 장애 대응 가이드 정리 (Supabase Logs/Sentry 연계)
