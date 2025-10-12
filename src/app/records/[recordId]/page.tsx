"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useSupabase } from "@/components/providers/supabase-provider";
import { toggleRecordLike, checkRecordLike } from "@/lib/supabase/likes-comments";
import { ImageModal } from "@/components/ui/image-modal";
import { CommentsSection } from "@/components/comments/comments-section";

type RecordDetail = {
  id: string;
  distanceKm: number;
  durationSeconds: number;
  paceSecondsPerKm: number | null;
  recordedAt: string;
  notes: string | null;
  imagePath: string | null;
  visibility: string;
  likesCount: number;
  commentsCount: number;
  mission: {
    id: string;
    title: string;
  } | null;
  profile: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
};


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

export default function RecordDetailPage({ params }: { params: Promise<{ recordId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, client, loading } = useSupabase();
  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecord() {
      try {
        const { data, error: fetchError } = await client
          .from("records")
          .select(
            `
            id,
            distance_km,
            duration_seconds,
            pace_seconds_per_km,
            recorded_at,
            notes,
            image_path,
            visibility,
            record_likes(count),
            record_comments(count),
            mission:missions(id, title),
            profile:profiles(id, display_name, avatar_url)
          `
          )
          .eq("id", resolvedParams.recordId)
          .single();

        if (fetchError) {
          console.error("기록 조회 실패:", fetchError);
          setError("기록을 찾을 수 없습니다.");
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recordData = data as any;

        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

        const initialLikesCount = Array.isArray(recordData.record_likes)
          ? recordData.record_likes[0]?.count ?? 0
          : 0;
        const initialCommentsCount = Array.isArray(recordData.record_comments)
          ? recordData.record_comments[0]?.count ?? 0
          : 0;

        setRecord({
          id: recordData.id,
          distanceKm: recordData.distance_km,
          durationSeconds: recordData.duration_seconds,
          paceSecondsPerKm: recordData.pace_seconds_per_km,
          recordedAt: recordData.recorded_at,
          notes: recordData.notes,
          imagePath:
            recordData.image_path && SUPABASE_URL
              ? `${SUPABASE_URL}/storage/v1/object/public/records-raw/${recordData.image_path}`
              : null,
          visibility: recordData.visibility,
          likesCount: initialLikesCount,
          commentsCount: initialCommentsCount,
          mission: recordData.mission,
          profile: recordData.profile,
        });

        setLikesCount(initialLikesCount);
        setCommentsCount(initialCommentsCount);

        // Check if user has liked
        if (user) {
          const liked = await checkRecordLike(client, resolvedParams.recordId, user.id);
          setIsLiked(liked);
        }
      } catch (err) {
        console.error("기록 로딩 실패:", err);
        setError("기록을 불러오는 중 오류가 발생했습니다.");
      }
    }

    loadRecord();
  }, [client, resolvedParams.recordId, user]);

  const handleLikeToggle = async () => {
    if (!user || isLiking) return;

    setIsLiking(true);
    const previousLiked = isLiked;
    const previousCount = likesCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    const { liked, error: likeError } = await toggleRecordLike(client, resolvedParams.recordId, user.id);

    if (likeError) {
      // Revert on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      console.error("좋아요 처리 실패:", likeError);
    } else {
      setIsLiked(liked);
    }

    setIsLiking(false);
  };


  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-center text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <p className="text-center text-red-600">{error || "기록을 찾을 수 없습니다."}</p>
        <div className="text-center">
          <button
            onClick={() => router.back()}
            className="text-sm text-blue-600 hover:underline"
          >
            ← 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 pb-16">
      {/* Header */}
      <header className="border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <button
            onClick={() => router.back()}
            className="mb-2 text-sm text-muted-foreground hover:text-foreground"
          >
            ← 뒤로
          </button>
          <h1 className="text-2xl font-bold">기록 상세</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-2 px-0 py-2">
        {/* Record Card */}
        <div className="border border-border/60 bg-background p-4">
          {/* User Info */}
          <div className="mb-2 flex items-center gap-3">
            <Link
              href={`/profile/${record.profile.id}`}
              className="relative h-12 w-12 overflow-hidden rounded-full border border-border/60 bg-muted"
            >
              {record.profile.avatar_url ? (
                <Image
                  src={record.profile.avatar_url}
                  alt={record.profile.display_name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-lg font-semibold text-muted-foreground">
                  {record.profile.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
            <div>
              <Link href={`/profile/${record.profile.id}`} className="hover:underline">
                <h2 className="font-semibold text-foreground">{record.profile.display_name}</h2>
              </Link>
              <p className="text-sm text-muted-foreground">{formatDate(record.recordedAt)}</p>
            </div>
          </div>

          {/* Mission Link */}
          {record.mission && (
            <Link
              href={`/missions/${record.mission.id}`}
              className="mb-4 inline-block rounded-lg bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700 hover:bg-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:hover:bg-orange-950/50"
            >
              📍 {record.mission.title}
            </Link>
          )}

          {/* Image */}
          {record.imagePath && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="relative mb-4 h-64 w-full overflow-hidden rounded-xl border border-border/40 bg-muted transition hover:ring-2 hover:ring-foreground/20"
            >
              <Image
                src={record.imagePath}
                alt="기록 사진"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 768px"
                unoptimized
              />
            </button>
          )}

          {/* Stats */}
          <div className="mb-4 grid grid-cols-3 gap-4 rounded-lg bg-muted/40 p-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">거리</p>
              <p className="text-2xl font-bold text-foreground">{record.distanceKm.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">KM</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">시간</p>
              <p className="text-2xl font-bold text-foreground">{formatDuration(record.durationSeconds)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">평균 페이스</p>
              <p className="text-2xl font-bold text-foreground">{formatPace(record.paceSecondsPerKm)}</p>
            </div>
          </div>

          {/* Notes */}
          {record.notes && (
            <p className="mb-4 whitespace-pre-wrap text-sm text-foreground">{record.notes}</p>
          )}

          {/* Like/Comment Buttons */}
          <div className="flex items-center gap-6 border-t border-border/40 pt-4">
            <button
              type="button"
              onClick={handleLikeToggle}
              disabled={!user || isLiking}
              className="flex items-center gap-2 text-muted-foreground transition hover:text-red-500 disabled:opacity-50"
            >
              <svg
                className={`h-6 w-6 ${isLiked ? "fill-red-500 text-red-500" : "fill-none"}`}
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
              <span className="font-medium">{likesCount}</span>
            </button>

            <div className="flex items-center gap-2 text-muted-foreground">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span className="font-medium">{commentsCount}</span>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="rounded-xl border border-border/60 bg-background p-4">
          <h3 className="mb-4 text-lg font-semibold">댓글</h3>
          <CommentsSection
            entityType="record"
            entityId={resolvedParams.recordId}
            onCountChange={setCommentsCount}
          />
        </div>
      </main>

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
