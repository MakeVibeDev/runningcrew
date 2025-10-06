/**
 * Notification Types and Interfaces
 */

export enum NotificationType {
  // 크루 가입 관련
  CREW_JOIN_REQUEST = 'crew_join_request',     // 크루 리더에게: 새로운 가입 신청
  CREW_JOIN_APPROVED = 'crew_join_approved',   // 신청자에게: 가입 승인됨
  CREW_JOIN_REJECTED = 'crew_join_rejected',   // 신청자에게: 가입 거절됨
  CREW_NEW_MEMBER = 'crew_new_member',         // 기존 크루원들에게: 새 멤버 가입

  // 미션 관련
  MISSION_CREATED = 'mission_created',         // 크루원들에게: 새 미션 생성됨

  // 기록 관련
  RECORD_LIKED = 'record_liked',               // 기록 오너에게: 좋아요 받음
  RECORD_COMMENTED = 'record_commented',       // 기록 오너에게: 댓글 받음

  // 순위 관련
  RANKING_TOP3 = 'ranking_top3',               // 1~3위 달성자에게: 순위권 진입
}

export interface NotificationData {
  // 크루 관련
  crewId?: string;
  crewName?: string;

  // 미션 관련
  missionId?: string;
  missionTitle?: string;

  // 기록 관련
  recordId?: string;

  // 댓글 관련
  commentId?: string;
  commentContent?: string;

  // 프로필 관련 (알림 발생시킨 사용자)
  actorId?: string;
  actorName?: string;
  actorAvatarUrl?: string;

  // 순위 관련
  rank?: number;
  previousRank?: number;

  // 기타
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface CreateNotificationParams {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
  link?: string;
}
