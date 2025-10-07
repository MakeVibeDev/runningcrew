export interface ReleaseHighlight {
  emoji: string;
  text: string;
}

export interface ReleaseItem {
  emoji: string;
  title: string;
  description: string;
}

export interface Release {
  version: string;
  date: string;
  title: string;
  summary: string;
  highlights: ReleaseHighlight[];
  features: ReleaseItem[];
  improvements: ReleaseItem[];
  fixes: ReleaseItem[];
}

export const releases: Release[] = [
  {
    version: "v0.6.0-001",
    date: "2025-01-08",
    title: "알림 시스템 및 사용성 개선",
    summary: "실시간 알림 기능과 크루 가입 프로세스 개선, 그리고 다양한 UI/UX 개선사항이 포함되었습니다.",
    highlights: [
      { emoji: "🔔", text: "실시간 알림 시스템" },
      { emoji: "👥", text: "크루 가입 승인 시스템" },
      { emoji: "📱", text: "모바일 UX 개선" },
      { emoji: "💾", text: "빠른 기록 추가" },
    ],
    features: [
      {
        emoji: "🔔",
        title: "실시간 알림 시스템",
        description: "미션 생성, 크루 가입 요청, 좋아요, 댓글 등 주요 활동에 대한 실시간 알림을 받을 수 있습니다.",
      },
      {
        emoji: "👥",
        title: "크루 가입 승인 시스템",
        description: "크루 리더가 가입 요청을 승인하거나 거절할 수 있는 시스템이 추가되었습니다.",
      },
      {
        emoji: "💾",
        title: "기록 추가 플로팅 버튼",
        description: "화면 우측 하단의 플로팅 버튼으로 언제든지 빠르게 기록을 추가할 수 있습니다.",
      },
    ],
    improvements: [
      {
        emoji: "🏃",
        title: "크루 카드 UI 개선",
        description: "크루 리더 프로필과 별 이모지 배지가 추가되어 크루 정보를 더 명확하게 확인할 수 있습니다.",
      },
      {
        emoji: "📊",
        title: "미션 랭킹 카드 통합",
        description: "미션 랭킹 페이지와 미션 상세 페이지의 랭킹 카드를 하나의 컴포넌트로 통합했습니다.",
      },
      {
        emoji: "📱",
        title: "모바일 날짜 선택기 개선",
        description: "iOS와 Android에서 기록 등록 시 날짜 선택이 더 원활하게 동작합니다.",
      },
      {
        emoji: "🎯",
        title: "미션 참여 안내 강화",
        description: "참여 중인 미션이 없을 때 미션 페이지로 안내하는 모달이 추가되었습니다.",
      },
      {
        emoji: "💬",
        title: "버그 신고 위치 변경",
        description: "버그 및 문의하기 버튼이 페이지 하단으로 이동하여 더 깔끔한 UI를 제공합니다.",
      },
    ],
    fixes: [
      {
        emoji: "🐛",
        title: "크루 가입 거절 오류 수정",
        description: "크루 가입 요청 거절 시 발생하던 오류가 수정되었습니다.",
      },
      {
        emoji: "🔧",
        title: "중복 가입 요청 방지",
        description: "동일한 크루에 중복으로 가입 요청을 할 수 없도록 데이터베이스 제약조건을 개선했습니다.",
      },
      {
        emoji: "⚠️",
        title: "TypeScript 타입 오류 수정",
        description: "알림 시스템과 관련된 TypeScript 타입 오류들이 수정되었습니다.",
      },
    ],
  },
];

export function getLatestRelease(): Release {
  return releases[0];
}

export function getReleaseByVersion(version: string): Release | undefined {
  return releases.find((release) => release.version === version);
}
