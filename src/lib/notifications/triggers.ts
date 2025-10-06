/**
 * Notification Trigger Functions
 * Functions to create notifications for various events
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createNotification, createNotifications } from './service';
import { NotificationType } from './types';

/**
 * 크루 가입 신청 알림 - 크루 리더에게
 */
export async function notifyCrewJoinRequest(
  supabase: SupabaseClient,
  {
    crewId,
    crewName,
    ownerId,
    applicantId,
    applicantName,
  }: {
    crewId: string;
    crewName: string;
    ownerId: string;
    applicantId: string;
    applicantName: string;
  }
) {
  return createNotification(supabase, {
    recipientId: ownerId,
    type: NotificationType.CREW_JOIN_REQUEST,
    title: '새로운 크루 가입 신청',
    message: `${applicantName}님이 ${crewName} 크루 가입을 신청했습니다.`,
    data: {
      crewId,
      crewName,
      actorId: applicantId,
      actorName: applicantName,
    },
    link: `/crews/${crewId}`,
  });
}

/**
 * 크루 가입 승인 알림 - 신청자에게
 */
export async function notifyCrewJoinApproved(
  supabase: SupabaseClient,
  {
    crewId,
    crewName,
    crewSlug,
    applicantId,
  }: {
    crewId: string;
    crewName: string;
    crewSlug: string;
    applicantId: string;
  }
) {
  return createNotification(supabase, {
    recipientId: applicantId,
    type: NotificationType.CREW_JOIN_APPROVED,
    title: '크루 가입 승인',
    message: `${crewName} 크루 가입이 승인되었습니다! 환영합니다! 🎉`,
    data: {
      crewId,
      crewName,
    },
    link: `/crews/${crewSlug}`,
  });
}

/**
 * 크루 가입 거절 알림 - 신청자에게
 */
export async function notifyCrewJoinRejected(
  supabase: SupabaseClient,
  {
    crewId,
    crewName,
    applicantId,
  }: {
    crewId: string;
    crewName: string;
    applicantId: string;
  }
) {
  return createNotification(supabase, {
    recipientId: applicantId,
    type: NotificationType.CREW_JOIN_REJECTED,
    title: '크루 가입 신청 결과',
    message: `${crewName} 크루 가입 신청이 거절되었습니다.`,
    data: {
      crewId,
      crewName,
    },
    link: '/crews',
  });
}

/**
 * 새 멤버 가입 알림 - 기존 크루원들에게
 */
export async function notifyNewMemberJoined(
  supabase: SupabaseClient,
  {
    crewId,
    crewName,
    crewSlug,
    newMemberId,
    newMemberName,
    existingMemberIds,
  }: {
    crewId: string;
    crewName: string;
    crewSlug: string;
    newMemberId: string;
    newMemberName: string;
    existingMemberIds: string[];
  }
) {
  const notifications = existingMemberIds
    .filter((id) => id !== newMemberId) // 신규 멤버 본인은 제외
    .map((recipientId) => ({
      recipientId,
      type: NotificationType.CREW_NEW_MEMBER,
      title: '새로운 크루원',
      message: `${newMemberName}님이 ${crewName} 크루에 가입했습니다!`,
      data: {
        crewId,
        crewName,
        actorId: newMemberId,
        actorName: newMemberName,
      },
      link: `/crews/${crewSlug}`,
    }));

  if (notifications.length === 0) return { count: 0, error: null };

  return createNotifications(supabase, notifications);
}

/**
 * 미션 생성 알림 - 크루원들에게
 */
export async function notifyMissionCreated(
  supabase: SupabaseClient,
  {
    missionId,
    missionTitle,
    crewId,
    crewName,
    memberIds,
  }: {
    missionId: string;
    missionTitle: string;
    crewId: string;
    crewName: string;
    memberIds: string[];
  }
) {
  const notifications = memberIds.map((recipientId) => ({
    recipientId,
    type: NotificationType.MISSION_CREATED,
    title: '새로운 미션',
    message: `${crewName} 크루에 새로운 미션 "${missionTitle}"이(가) 생성되었습니다!`,
    data: {
      missionId,
      missionTitle,
      crewId,
      crewName,
    },
    link: `/missions/${missionId}`,
  }));

  if (notifications.length === 0) return { count: 0, error: null };

  return createNotifications(supabase, notifications);
}

/**
 * 좋아요 알림 - 기록 오너에게
 */
export async function notifyRecordLiked(
  supabase: SupabaseClient,
  {
    recordId,
    recordOwnerId,
    likerId,
    likerName,
  }: {
    recordId: string;
    recordOwnerId: string;
    likerId: string;
    likerName: string;
  }
) {
  // 본인이 본인 기록에 좋아요하면 알림 안 보냄
  if (recordOwnerId === likerId) {
    return { data: null, error: null };
  }

  return createNotification(supabase, {
    recipientId: recordOwnerId,
    type: NotificationType.RECORD_LIKED,
    title: '좋아요',
    message: `${likerName}님이 회원님의 기록을 좋아합니다.`,
    data: {
      recordId,
      actorId: likerId,
      actorName: likerName,
    },
    link: `/records/${recordId}`,
  });
}

/**
 * 댓글 알림 - 기록 오너에게
 */
export async function notifyRecordCommented(
  supabase: SupabaseClient,
  {
    recordId,
    recordOwnerId,
    commenterId,
    commenterName,
    commentPreview,
  }: {
    recordId: string;
    recordOwnerId: string;
    commenterId: string;
    commenterName: string;
    commentPreview: string;
  }
) {
  // 본인이 본인 기록에 댓글 달면 알림 안 보냄
  if (recordOwnerId === commenterId) {
    return { data: null, error: null };
  }

  return createNotification(supabase, {
    recipientId: recordOwnerId,
    type: NotificationType.RECORD_COMMENTED,
    title: '새 댓글',
    message: `${commenterName}님이 댓글을 남겼습니다: "${commentPreview}"`,
    data: {
      recordId,
      actorId: commenterId,
      actorName: commenterName,
      commentContent: commentPreview,
    },
    link: `/records/${recordId}`,
  });
}

/**
 * 순위 TOP3 진입 알림
 */
export async function notifyRankingTop3(
  supabase: SupabaseClient,
  {
    missionId,
    missionTitle,
    userId,
    rank,
    previousRank,
  }: {
    missionId: string;
    missionTitle: string;
    userId: string;
    rank: number;
    previousRank?: number;
  }
) {
  const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
  const message = previousRank
    ? `${missionTitle} 미션에서 ${previousRank}위에서 ${rank}위로 올랐습니다! ${rankEmoji}`
    : `${missionTitle} 미션에서 ${rank}위를 달성했습니다! ${rankEmoji}`;

  return createNotification(supabase, {
    recipientId: userId,
    type: NotificationType.RANKING_TOP3,
    title: 'TOP 3 진입!',
    message,
    data: {
      missionId,
      missionTitle,
      rank,
      previousRank,
    },
    link: `/missions/${missionId}`,
  });
}
