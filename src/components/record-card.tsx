import Image from "next/image";
import Link from "next/link";

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

  return (
    <div className="relative rounded-xl border border-border/60 bg-background p-4 text-sm text-muted-foreground">
      {/* 수정 버튼 - 우측 상단 */}
      {showEditLink && isOwner && (
        <Link
          href={`/records/${record.id}/edit`}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          title="수정"
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
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-border/40">
              <Image
                src={record.imagePath}
                alt="기록 사진"
                fill
                className="object-cover"
                sizes="96px"
                unoptimized
              />
            </div>
          )}

          {/* 2컬럼: 프로필, 활동시간 */}
          <div className="flex flex-1 flex-col justify-between min-w-0">
            {showUserInfo && record.profile ? (
              <div className="flex items-center gap-2">
                <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted">
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
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {record.profile.display_name}
                  </p>
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
          <p className="text-sm text-muted-foreground line-clamp-2">{record.notes}</p>
        )}
      </div>
    </div>
  );
}
