import Image from "next/image";
import Link from "next/link";

interface RankingCardProps {
  stat: {
    profileId: string;
    profile?: {
      display_name?: string;
      avatar_url?: string | null;
    } | null;
    totalDistanceKm: number;
    totalDurationSeconds: number;
    avgPaceSecondsPerKm: number | null;
    totalRecords: number;
  };
  index: number;
  formatDuration: (seconds: number) => string;
  formatPace: (paceSeconds?: number | null) => string;
  compact?: boolean; // 미션 상세 페이지용 작은 버전
}

export function RankingCard({
  stat,
  index,
  formatDuration,
  formatPace,
  compact = false,
}: RankingCardProps) {
  return (
    <div
      data-ranking-card
      className={`relative overflow-hidden rounded-xl border border-border/60 shadow-sm transition hover:shadow-md ${
        compact ? "p-2 text-sm" : "p-3"
      }`}
      style={{ backgroundColor: compact ? 'hsl(var(--background))' : 'hsl(var(--card))' }}
    >
      {/* 배경 이미지 (blur 효과) */}
      {stat.profile?.avatar_url && (
        <>
          <div
            className="absolute inset-0"
            style={{
              zIndex: 0,
              backgroundImage: `url("${stat.profile.avatar_url}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(20px)',
              opacity: 0.4,
              transform: 'scale(0.9)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              zIndex: 0,
              backgroundColor: compact
                ? 'hsl(var(--background) / 0.9)'
                : 'hsl(var(--card) / 0.9)'
            }}
          />
        </>
      )}

      {/* 순위 표시 - 최상단 좌측 모서리 */}
      <div
        data-rank
        className={`absolute left-0 top-0 z-10 flex items-center justify-center rounded-br-lg text-xs font-bold ${
          compact ? "h-7 w-7" : "h-8 w-8"
        } ${
          index === 0
            ? "bg-yellow-500 text-white"
            : index === 1
            ? "bg-gray-400 text-white"
            : index === 2
            ? "bg-amber-700 text-white"
            : "bg-foreground text-background"
        }`}
      >
        {index + 1}
      </div>

      {/* 1행: 프로필 이미지 | 이름 + 기록 횟수 */}
      <div
        className={`relative flex items-center gap-3 pt-1 ${
          compact ? "pl-9" : "pl-10"
        }`}
        style={{ zIndex: 1 }}
      >
        <Link
          href={`/profile/${stat.profileId}`}
          className={`relative flex-shrink-0 overflow-hidden rounded-full border-2 border-border/60 bg-muted transition hover:ring-2 hover:ring-foreground/20 ${
            compact ? "h-12 w-12" : "h-14 w-14 shadow-md"
          }`}
        >
          {stat.profile?.avatar_url ? (
            <Image
              data-avatar
              src={stat.profile.avatar_url}
              alt={stat.profile.display_name ?? "프로필"}
              fill
              className="object-cover"
              sizes={compact ? "48px" : "56px"}
              crossOrigin="anonymous"
            />
          ) : (
            <div
              className={`grid h-full w-full place-items-center font-semibold text-muted-foreground ${
                compact ? "text-lg" : "text-xl"
              }`}
            >
              {stat.profile?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <Link href={`/profile/${stat.profileId}`} className="hover:underline">
            <h3
              data-name
              className={`font-semibold text-foreground ${
                compact ? "text-sm" : "text-base"
              }`}
            >
              {stat.profile?.display_name ?? "익명"}
            </h3>
          </Link>
          {!compact && (
            <p className="text-xs text-muted-foreground">
              총 {stat.totalRecords}회 기록
            </p>
          )}
        </div>
      </div>

      {/* 2행: 통계 3개 */}
      <div
        className={`relative mt-3 grid grid-cols-3 gap-2 text-center ${
          compact ? "text-xs uppercase tracking-wide text-muted-foreground/70" : ""
        }`}
        style={{ zIndex: 1 }}
      >
        <div>
          <p className={compact ? "text-[0.65rem]" : "text-[1rem] text-muted-foreground"}>
            총 거리
          </p>
          <p data-distance className={`font-bold text-foreground ${compact ? "text-base" : "text-xl"}`}>
            {stat.totalDistanceKm.toFixed(2)}
            {compact && " KM"}
          </p>
        </div>
        <div>
          <p className={compact ? "text-[0.65rem]" : "text-[1rem] text-muted-foreground"}>
            총 시간
          </p>
          <p data-duration className={`font-bold text-foreground ${compact ? "text-base" : "text-xl"}`}>
            {formatDuration(stat.totalDurationSeconds)}
          </p>
        </div>
        <div>
          <p className={compact ? "text-[0.65rem]" : "text-[1rem] text-muted-foreground"}>
            평균 페이스
          </p>
          <p data-pace className={`font-bold text-foreground ${compact ? "text-base" : "text-xl"}`}>
            {formatPace(stat.avgPaceSecondsPerKm)}
          </p>
        </div>
      </div>
    </div>
  );
}
