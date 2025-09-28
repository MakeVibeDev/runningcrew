# 지도 연동 가이드 (v1)

## 1. 목표
- 크루 주요 활동 위치를 지도에 마커로 표시하고, 상세 페이지에서 교통/집결 정보를 함께 제공.
- 1차 릴리즈에서는 단일 좌표만 지원.

## 2. 라이브러리 선택
| 후보 | 장점 | 단점 | 비고 |
| --- | --- | --- | --- |
| **네이버 지도 JS v3** | 국내 지명/POI 강점, 한국 사용자 친숙 UI | 해외에서 타일 로딩 느릴 수 있음 | **1차 릴리즈 권장** |
| Mapbox GL JS | 글로벌 커버리지, 커스텀 스타일 | 국내 지명 검색 약함, 비용 | 2차 글로벌 확장 시 고려 |
| Google Maps JS | 스트리트뷰, 풍부한 API | 요금제 복잡, 한글 POI 일부 미흡 | 백업 옵션 |

→ 1차 범위에서는 네이버 지도 JS v3 SDK 사용.

## 3. 구현 체크리스트
- [ ] 네이버 클라우드 지도 API 키 발급 후 `.env.local`에 `NAVER_MAP_CLIENT_ID`, `NAVER_MAP_CLIENT_SECRET` 정의.
- [ ] 공용 맵 컴포넌트 생성 (`src/components/Map/NaverSingleMarkerMap.tsx`).
- [ ] `next/script`로 네이버 지도 SDK 비동기 로드 (`https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=...`).
- [ ] 초기 중심 좌표: `new naver.maps.LatLng(location_lat, location_lng)` + 줌 레벨 14.
- [ ] 마커: 로고 이미지 존재 시 `naver.maps.MarkerImage` 활용, 없으면 기본 마커.
- [ ] 모바일 드래그 허용, 줌 컨트롤 최소화, 지도 높이 240px 고정.
- [ ] 배포 도메인을 Referer 화이트리스트에 추가했는지 확인.

## 4. 퍼포먼스 및 비용
- 네이버 지도 SDK는 클라이언트 컴포넌트에서만 로드하며 SSR 시 빈 컨테이너 렌더.
- 로딩 스켈레톤 표시(지도 대신 회색 박스 + 위치 텍스트).
- 월 200,000건까지 무료(2024 기준). 호출량은 네이버 클라우드 콘솔에서 모니터링하고 임계치 알림 설정.

## 5. 에러 처리
- 좌표 없음: 지도 영역 미표시, “활동 위치 업데이트 예정” 메시지 노출.
- API 키 오류: `naver.maps.Event.addListener`로 `mapError` 이벤트 감지, fallback 메시지 출력.

## 6. 향후 확장
- 다중 마커 + 경로 표시를 위한 `crew_routes` 테이블과 GeoJSON 저장 고려.
- 미션별 집결 장소를 표시할 경우 `missions`에 위치 컬럼 추가.

## 7. 서비스 신청 및 키 발급 가이드
1. **서비스 활성화**: NAVER Cloud Platform 콘솔에서 `Application Service > Maps` 이용 신청. 신청 시 서비스명, 사용 도메인, 활용 목적을 작성한다.
2. **프로젝트 생성**: Console 상단 Project 메뉴에서 신규 프로젝트를 만들고 Maps를 활성화한다.
3. **애플리케이션 등록**: `Maps > Manage Application`에서 Web 애플리케이션 등록. 허용 도메인(예: `http://localhost:3000`, `https://runningcrew.vercel.app`)을 Referer로 입력.
4. **인증 정보 발급**: 등록 승인을 받으면 `Client ID`(JavaScript SDK용)와 `Client Secret`(REST API용)이 발급된다. 클라이언트 공개 변수에는 Client ID만 노출한다.
5. **요금/제한 확인**: 2024년 12월 기준 기본 제공량은 Dynamic Map 월 200,000건, Static Map 월 200,000건, Geocode/Reverse Geocode 각 월 200,000건. 최신 수치는 [NAVER Cloud Maps 페이지](https://www.ncloud.com/product/applicationService/maps#detail)에서 반드시 확인한다.
6. **모니터링**: 콘솔 Usage 대시보드에서 API별 호출량을 확인하고 Threshold 알림을 설정해 과금 리스크를 줄인다.

## 8. 제공 API 활용 요약
- **Dynamic Map (JS v3)**: 지도 렌더링, 마커, 오버레이, 이벤트 핸들링.
- **Static Map**: 공유용 썸네일 이미지를 서버에서 생성 가능.
- **Geocode / Reverse Geocode**: 주소 ↔ 좌표 변환. 크루/미션 등록 시 활용.
- **Directions (길찾기)**: 향후 러닝 코스 안내 기능에 사용.
- **Place Search**: 주변 장소 탐색, 활동 거점 추천 UX에 활용.
