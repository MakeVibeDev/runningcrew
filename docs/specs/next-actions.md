# 다음 작업 메모 (2025-09-28)

## 1. 인증 / 세션 연동
- Supabase Auth 도입 후 레이아웃 네비게이션에 사용자 상태 노출.
- 로그인/로그아웃 버튼과 보호된 페이지 라우팅 패턴 결정.

## 2. OCR 파이프라인 구현
- YOLOv8 학습 데이터 라벨링(샘플 최소 50장 수집) 및 학습 스크립트 준비.
- Supabase Edge Function `ocr-ingest`에 YOLO → CLOVA → Google Vision fallback 흐름 POC.
- 업로드 페이지에 실제 Storage 업로드 & 결과 검증 로직 연결.

## 3. 지도/크루 상세 확장
- 네이버 지도 SDK 적용한 `NaverSingleMarkerMap` 컴포넌트 작성.
- 크루 상세 페이지 라우트 생성 및 지도 + 미션 + 피드 구성.

## 4. 테스트/품질
- ESLint/Prettier 유지, Vitest or Playwright 도입 여부 검토.
- 목업 데이터와 Supabase 실제 데이터 전환 전략 문서화.

> 위 순서로 진행하면 내일 작업 시 바로 OCR/지도 연동 개발에 착수할 수 있습니다.
