"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { ImageModal } from "@/components/ui/image-modal";
import { useSupabase } from "@/components/providers/supabase-provider";
import { toggleRecordLike, checkRecordLike } from "@/lib/supabase/likes-comments";

interface RecordCardProps {
  record: {
    id: string;
    distanceKm: number;
    durationSeconds: number;
    paceSecondsPerKm: number | null;
    recordedAt: string;
    notes?: string | null;
    imagePath?: string | null;
    visibility?: string;
    likesCount?: number;
    commentsCount?: number;
    profile?: {
      id: string;
      display_name: string;
      avatar_url?: string | null;
    } | null;
  };
  userStat?: {
    totalDistanceKm: number;
    totalDurationSeconds: number;
  };
  showUserInfo?: boolean;
  showEditLink?: boolean;
  currentUserId?: string;
}

function formatDuration(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts = [hrs, mins, secs].map((value) => value.toString().padStart(2, "0"));
  return `${parts[0]}:${parts[1]}:${parts[2]}`;
}

function formatPace(paceSeconds?: number | null) {
  if (!paceSeconds || paceSeconds <= 0) return "-";
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}'${secs.toString().padStart(2, "0")}"`;
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ko", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

export function RecordCard({ record, userStat, showUserInfo = true, showEditLink = false, currentUserId }: RecordCardProps) {
  // 프로필 정보가 없으면 본인 기록으로 간주 (대시보드의 경우)
  const isOwner = currentUserId && (!record.profile || record.profile.id === currentUserId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, client } = useSupabase();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(record.likesCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      checkRecordLike(client, record.id, user.id).then(setIsLiked);
    }
  }, [client, record.id, user]);

  const handleLikeToggle = async () => {
    if (!user || isLiking) return;

    setIsLiking(true);
    const previousLiked = isLiked;
    const previousCount = likesCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    const { liked, error } = await toggleRecordLike(client, record.id, user.id);

    if (error) {
      // Revert on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      console.error("좋아요 처리 실패:", error);
    } else {
      setIsLiked(liked);
    }

    setIsLiking(false);
  };

  const handleCardClick = () => {
    router.push(`/records/${record.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="relative block cursor-pointer rounded-xl border border-border/60 bg-background pb-4 text-sm text-muted-foreground transition hover:shadow-md"
    >
      {/* 수정 버튼 - 우측 상단 */}
      {showEditLink && isOwner && (
        <Link
          href={`/records/${record.id}/edit`}
          className="absolute right-3 top-3 z-20 text-muted-foreground hover:text-foreground"
          title="수정"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </Link>
      )}

      {/* 비공개 라벨 - 좌측 상단 */}
      {record.visibility === 'private' && (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-muted/90 px-2 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
          🔒 비공개
        </div>
      )}

      <div className="space-y-3">
        {/* 1행: 2컬럼 - 업로드 이미지 | 프로필, 활동시간 */}
        <div className="flex gap-3">
          {/* 1컬럼: 업로드 이미지 */}
          {record.imagePath && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg  border-border/40 transition hover:ring-2 hover:ring-foreground/20"
            >
              <Image
                src={record.imagePath}
                alt="기록 사진"
                fill
                className="object-contain"
                sizes="96px"
                unoptimized
              />
            </button>
          )}

          {/* 2컬럼: 프로필, 활동시간 */}
          <div className="flex flex-1 flex-col justify-between min-w-0 pt-2">
            {showUserInfo && record.profile ? (
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${record.profile.id}`}
                  className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted hover:ring-2 hover:ring-foreground/20 transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  {record.profile.avatar_url ? (
                    <Image
                      src={record.profile.avatar_url}
                      alt={record.profile.display_name}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs font-semibold text-muted-foreground">
                      {record.profile.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/profile/${record.profile.id}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-sm font-medium text-foreground truncate">
                      {record.profile.display_name}
                    </p>
                  </Link>
                  {userStat && (
                    <p className="text-xs text-muted-foreground">
                      누적: {userStat.totalDistanceKm.toFixed(1)}km · {formatDuration(userStat.totalDurationSeconds)}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div />
            )}
            <p className="text-xs text-muted-foreground">
              {formatDate(record.recordedAt)}
            </p>
          </div>
        </div>

        {/* 2행: 1컬럼 - 거리, 시간, 페이스 */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[0.65rem] text-muted-foreground">거리</p>
            <p className="text-sm font-semibold text-foreground">
              {record.distanceKm.toFixed(1)} KM
            </p>
          </div>
          <div>
            <p className="text-[0.65rem] text-muted-foreground">시간</p>
            <p className="text-sm font-semibold text-foreground">
              {formatDuration(record.durationSeconds)}
            </p>
          </div>
          <div>
            <p className="text-[0.65rem] text-muted-foreground">페이스</p>
            <p className="text-sm font-semibold text-foreground">
              {formatPace(record.paceSecondsPerKm)}
            </p>
          </div>
        </div>

        {/* 3행: 1컬럼 - 메모 */}
        {record.notes && (
          <p className="px-4 text-sm text-muted-foreground line-clamp-2">{record.notes}</p>
        )}

        {/* 4행: 좋아요/댓글 버튼 */}
        <div className="flex items-center gap-4 border-t border-border/40 px-4 pt-3">
          {/* 좋아요 버튼 */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleLikeToggle();
            }}
            disabled={!user || isLiking}
            className="flex items-center gap-1 text-muted-foreground transition hover:text-red-500 disabled:opacity-50"
            title={user ? (isLiked ? "좋아요 취소" : "좋아요") : "로그인이 필요합니다"}
          >
            <svg
              className={`h-5 w-5 ${isLiked ? "fill-red-500 text-red-500" : "fill-none"}`}
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span className="text-sm font-medium">{likesCount}</span>
          </button>

          {/* 댓글 아이콘 */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <svg
              className="h-5 w-5 fill-none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="text-sm font-medium">{record.commentsCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {record.imagePath && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          imageSrc={record.imagePath}
          alt="기록 사진"
        />
      )}
    </div>
  );
}
