import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";

// 간단한 시간 포맷 함수
function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 30) return `${diffDays}일 전`;
  return `${Math.floor(diffDays / 30)}개월 전`;
}

type Record = {
  id: string;
  recorded_at: string;
  distance_km: number;
  duration_seconds: number;
  pace_seconds_per_km: number | null;
  visibility: string;
  notes: string | null;
  image_path: string | null;
  created_at: string;
  profile: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  mission: {
    id: string;
    title: string;
    crew_id: string;
    crew: {
      id: string;
      name: string;
      slug: string;
    } | null;
  } | null;
};

export default async function AdminRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const search = params.search ?? "";
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  // 기록 조회 with 프로필, 미션, 크루 정보
  const query = supabase
    .from("records")
    .select(
      `
      id,
      recorded_at,
      distance_km,
      duration_seconds,
      pace_seconds_per_km,
      visibility,
      notes,
      image_path,
      created_at,
      profile:profiles!records_profile_id_fkey(id, display_name, avatar_url),
      mission:missions(
        id,
        title,
        crew_id,
        crew:crews(id, name, slug)
      )
    `,
      { count: "exact" }
    )
    .order("recorded_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  // 검색 필터 (사용자 이름으로 검색)
  if (search) {
    // PostgREST는 중첩된 필터를 지원하지 않으므로 클라이언트에서 필터링
  }

  const { data: records, count, error } = await query;

  if (error) {
    console.error("기록 조회 에러:", error);
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 1;

  // 검색어로 필터링 (클라이언트 사이드)
  const filteredRecords = search
    ? (records as Record[])?.filter((record) =>
        record.profile?.display_name.toLowerCase().includes(search.toLowerCase())
      ) ?? []
    : (records as Record[]) ?? [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">기록 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            전체 {count?.toLocaleString()}개 기록
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <form action="/admin/records" method="get">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="사용자 이름으로 검색..."
            className="w-full max-w-md rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </form>
      </div>

      {/* Records Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                사용자
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                크루/미션
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                기록일시
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                거리
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                시간
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                페이스
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                공개
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  {search ? "검색 결과가 없습니다." : "기록이 없습니다."}
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => {
                const durationMinutes = Math.floor(record.duration_seconds / 60);
                const durationSeconds = record.duration_seconds % 60;
                const pace = record.pace_seconds_per_km
                  ? `${Math.floor(record.pace_seconds_per_km / 60)}'${(record.pace_seconds_per_km % 60).toString().padStart(2, "0")}"`
                  : "-";

                return (
                  <tr key={record.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {record.profile?.avatar_url ? (
                          <Image
                            src={record.profile.avatar_url}
                            alt={record.profile.display_name}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-pink-500" />
                        )}
                        <div>
                          <Link
                            href={`/profile/${record.profile?.id}`}
                            className="font-medium hover:text-orange-500"
                          >
                            {record.profile?.display_name ?? "Unknown"}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {record.mission?.crew ? (
                          <>
                            <Link
                              href={`/crews/${record.mission.crew.slug}`}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {record.mission.crew.name}
                            </Link>
                            <div className="text-xs text-muted-foreground">
                              {record.mission.title}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {new Date(record.recorded_at).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {timeAgo(new Date(record.created_at))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {record.distance_km.toFixed(2)}km
                    </td>
                    <td className="px-4 py-3 text-right">
                      {durationMinutes}:{durationSeconds.toString().padStart(2, "0")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {pace}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          record.visibility === "public"
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {record.visibility === "public" ? "공개" : "비공개"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/admin/records/${record.id}/edit`}
                        className="text-sm text-orange-600 hover:text-orange-500 dark:text-orange-400"
                      >
                        수정
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/admin/records?page=${page - 1}${search ? `&search=${search}` : ""}`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              이전
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/records?page=${page + 1}${search ? `&search=${search}` : ""}`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              다음
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
