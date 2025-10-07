import Image from "next/image";
import Link from "next/link";

interface CrewCardProps {
  crew: {
    id: string;
    slug: string;
    name: string;
    logoImageUrl: string | null;
    activityRegion: string;
    memberCount: number;
    owner?: {
      display_name: string;
      avatar_url: string | null;
    } | null;
    ownerProfile?: {
      display_name: string;
      avatar_url: string | null;
    } | null;
  };
  variant?: "simple" | "detailed"; // simple: 프로필 페이지용, detailed: 크루 목록용
}

export function CrewCard({ crew, variant = "simple" }: CrewCardProps) {
  const owner = crew.owner || crew.ownerProfile;

  if (variant === "simple") {
    // 프로필 페이지용 간단한 카드
    return (
      <Link
        href={`/crews/${crew.slug}`}
        className="block overflow-hidden rounded-2xl border border-border/40 bg-background shadow-sm transition hover:shadow-md"
      >
        <div className="relative h-32 w-full bg-gradient-to-br from-muted/50 to-muted">
          {crew.logoImageUrl ? (
            <Image
              src={crew.logoImageUrl}
              alt={crew.name}
              fill
              className="object-contain p-4"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="grid h-full w-full place-items-center px-4 text-center text-2xl font-bold text-foreground/70">
              {crew.name}
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{crew.name}</h3>
              <span className="text-xs text-muted-foreground">{crew.memberCount}명</span>
            </div>
            {/* 리더 정보 */}
            {owner && (
              <div className="flex items-center gap-1">
                <span className="text-xs">⭐</span>
                <div className="relative h-6 w-6 overflow-hidden rounded-full border border-border/60 bg-muted">
                  {owner.avatar_url ? (
                    <Image
                      src={owner.avatar_url}
                      alt={owner.display_name}
                      fill
                      className="object-cover"
                      sizes="24px"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[10px] font-semibold text-muted-foreground">
                      {owner.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{crew.activityRegion}</p>
        </div>
      </Link>
    );
  }

  // 크루 목록 페이지용 상세 카드
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm">
      {/* 블러 배경 */}
      {crew.logoImageUrl && (
        <div className="absolute inset-0 -z-10">
          <Image
            src={crew.logoImageUrl}
            alt=""
            fill
            className="scale-110 object-cover opacity-15 blur-3xl saturate-150"
            sizes="(min-width: 1024px) 33vw, 100vw"
          />
        </div>
      )}

      <Link href={`/crews/${crew.slug}`} className="relative block h-40 w-full bg-muted/50 backdrop-blur-sm">
        {crew.logoImageUrl ? (
          <Image
            src={crew.logoImageUrl}
            alt={`${crew.name} 로고`}
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-contain p-4"
          />
        ) : (
          <div className="grid h-full w-full place-items-center px-4 text-center text-2xl font-bold text-foreground/70">
            {crew.name}
          </div>
        )}
      </Link>

      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{crew.name}</h3>
          </div>
          {/* 리더 정보 */}
          {owner && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm">⭐</span>
              <div className="relative h-7 w-7 overflow-hidden rounded-full border border-border/60 bg-muted">
                {owner.avatar_url ? (
                  <Image
                    src={owner.avatar_url}
                    alt={owner.display_name}
                    fill
                    className="object-cover"
                    sizes="28px"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs font-semibold text-muted-foreground">
                    {owner.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">{crew.activityRegion}</p>

        <div className="rounded-xl border border-border/50 bg-muted/50 p-4 text-sm text-muted-foreground backdrop-blur-sm">
          <p>
            구성원 <span className="font-semibold text-foreground">{crew.memberCount}명</span>
          </p>
        </div>

        <div className="flex gap-2 text-sm">
          <Link
            href={`/crews/${crew.slug}`}
            className="flex-1 rounded-lg bg-foreground px-4 py-2 text-center font-semibold text-background hover:opacity-90"
          >
            상세 보기
          </Link>
          <Link
            href="/missions"
            className="flex-1 rounded-lg border border-border px-4 py-2 text-center font-semibold hover:bg-muted"
          >
            미션 둘러보기
          </Link>
        </div>
      </div>
    </div>
  );
}
