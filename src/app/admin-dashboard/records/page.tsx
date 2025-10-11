"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type Crew = {
  id: string;
  name: string;
  slug: string;
};

type Mission = {
  id: string;
  title: string;
  crew_id: string;
  crew: Crew | null;
};

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
  profile: Profile | null;
  mission: Mission | null;
};

function AdminRecordsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<Record[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState(searchParams?.get("search") || "");

  const page = parseInt(searchParams?.get("page") || "1");
  const pageSize = 20;

  useEffect(() => {
    // 세션 확인
    const checkSession = async () => {
      try {
        const response = await fetch("/api/admin/session");
        const data = await response.json();

        if (!data.authenticated) {
          router.push("/admin-login");
          return;
        }

        await loadRecords();
      } catch (error) {
        console.error("세션 확인 오류:", error);
        router.push("/admin-login");
      }
    };

    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, router]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search: search,
      });

      const response = await fetch(`/api/admin/records?${params}`);
      const data = await response.json();

      if (response.ok) {
        setRecords(data.records);
        setTotalCount(data.totalCount);
      } else {
        console.error("기록 로드 실패:", data.error);
      }
    } catch (error) {
      console.error("기록 로드 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", "1");
    router.push(`/admin-dashboard/records?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", newPage.toString());
    router.push(`/admin-dashboard/records?${params.toString()}`);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs}초`;
  };

  const formatPace = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}'${secs.toString().padStart(2, "0")}"`;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      {/* 헤더 */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">📊 기록 관리</h1>
            <button
              onClick={() => router.push("/admin-dashboard")}
              className="rounded-lg bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80"
            >
              ← 대시보드로
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* 검색 */}
        <form onSubmit={handleSearch} className="mb-6 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="사용자 이름으로 검색..."
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-orange-500 px-6 py-2 font-medium text-white hover:bg-orange-600"
          >
            검색
          </button>
        </form>

        {/* 통계 */}
        <div className="mb-4 text-sm text-muted-foreground">
          전체 {totalCount}개 기록 (페이지 {page}/{totalPages})
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  사용자
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  기록 일시
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  미션/크루
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold">
                  거리
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold">
                  시간
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold">
                  페이스
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold">
                  공개
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold">
                  작업
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {record.profile?.avatar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={record.profile.avatar_url}
                          alt=""
                          className="h-8 w-8 rounded-full"
                        />
                      )}
                      <span className="text-sm">
                        {record.profile?.display_name || "알 수 없음"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(record.recorded_at).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {record.mission ? (
                      <div>
                        <div className="font-medium">{record.mission.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {record.mission.crew?.name || "-"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {record.distance_km.toFixed(2)} km
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatDuration(record.duration_seconds)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatPace(record.pace_seconds_per_km)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {record.visibility === "public" ? "공개" : "비공개"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() =>
                        router.push(`/admin-dashboard/records/${record.id}/edit`)
                      }
                      className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
                    >
                      수정
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm disabled:opacity-50"
            >
              이전
            </button>
            <span className="flex items-center px-4 text-sm">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminRecordsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminRecordsPageContent />
    </Suspense>
  );
}
