"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { DataTable, Column } from "@/components/admin/data-table";
import { FilterBar } from "@/components/admin/filter-bar";
import { Pagination } from "@/components/admin/pagination";
import { Badge } from "@/components/admin/badge";

interface Crew {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_public: boolean;
  max_members: number | null;
  created_at: string;
  memberCount: number;
  missionCount: number;
  leader: {
    username: string;
    full_name: string | null;
  } | null;
}

export default function CrewsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [crews, setCrews] = useState<Crew[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/admin/session");
        const data = await response.json();

        if (!data.authenticated) {
          router.push("/admin-login");
          return;
        }

        setUsername(data.username);
        await loadCrews();
        setLoading(false);
      } catch (error) {
        console.error("세션 확인 오류:", error);
        router.push("/admin-login");
      }
    };

    checkSession();
  }, [router]);

  useEffect(() => {
    if (!loading) {
      loadCrews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchValue]);

  const loadCrews = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        search: searchValue,
      });

      const response = await fetch(`/api/admin/crews?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCrews(data.crews);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("크루 목록 로드 오류:", error);
    }
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchValue("");
    setCurrentPage(1);
  };

  const columns: Column<Crew>[] = [
    {
      key: "name",
      label: "크루명",
      sortable: true,
      render: (crew) => (
        <div className="flex items-center gap-3">
          {crew.avatar_url && (
            <img
              src={crew.avatar_url}
              alt={crew.name}
              className="h-10 w-10 rounded-full"
            />
          )}
          <div>
            <div className="font-medium">{crew.name}</div>
            {crew.description && (
              <div className="text-xs text-muted-foreground line-clamp-1">
                {crew.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "leader",
      label: "크루장",
      render: (crew) => (
        <span className="text-sm">
          {crew.leader?.full_name || crew.leader?.username || "-"}
        </span>
      ),
    },
    {
      key: "memberCount",
      label: "멤버",
      sortable: true,
      render: (crew) => (
        <span className="text-sm">
          {crew.memberCount}
          {crew.max_members && `/${crew.max_members}`}명
        </span>
      ),
      width: "100px",
    },
    {
      key: "missionCount",
      label: "미션",
      sortable: true,
      render: (crew) => <span className="text-sm">{crew.missionCount}개</span>,
      width: "80px",
    },
    {
      key: "is_public",
      label: "공개여부",
      render: (crew) =>
        crew.is_public ? (
          <Badge variant="success">공개</Badge>
        ) : (
          <Badge variant="default">비공개</Badge>
        ),
      width: "100px",
    },
    {
      key: "created_at",
      label: "생성일",
      sortable: true,
      render: (crew) => (
        <span className="text-sm text-muted-foreground">
          {new Date(crew.created_at).toLocaleDateString("ko-KR")}
        </span>
      ),
      width: "120px",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <AdminLayout username={username}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">크루 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            전체 크루 목록을 조회하고 관리합니다
          </p>
        </div>

        <FilterBar
          searchValue={searchValue}
          onSearchChange={handleSearch}
          searchPlaceholder="크루명 또는 설명으로 검색..."
          onClear={handleClearFilters}
        />

        <DataTable
          columns={columns}
          data={crews}
          keyExtractor={(crew) => crew.id}
          onRowClick={(crew) => router.push(`/admin-dashboard/crews/${crew.id}`)}
        />

        {pagination.totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
          />
        )}
      </div>
    </AdminLayout>
  );
}
