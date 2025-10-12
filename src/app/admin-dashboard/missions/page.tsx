"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { DataTable, Column } from "@/components/admin/data-table";
import { FilterBar } from "@/components/admin/filter-bar";
import { Pagination } from "@/components/admin/pagination";
import { Badge } from "@/components/admin/badge";

interface Mission {
  id: string;
  title: string;
  description: string | null;
  crew_id: string;
  start_date: string;
  end_date: string;
  goal_type: string;
  goal_value: number;
  created_at: string;
  crew: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  participantCount: number;
  completedCount: number;
}

export default function MissionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
        await loadMissions();
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
      loadMissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchValue, statusFilter]);

  const loadMissions = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        search: searchValue,
        status: statusFilter,
      });

      const response = await fetch(`/api/admin/missions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMissions(data.missions);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("미션 목록 로드 오류:", error);
    }
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchValue("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const getMissionStatus = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();

    if (end >= now) {
      return <Badge variant="success">진행중</Badge>;
    }
    return <Badge variant="default">종료</Badge>;
  };

  const columns: Column<Mission>[] = [
    {
      key: "title",
      label: "미션명",
      sortable: true,
      render: (mission) => (
        <div>
          <div className="font-medium">{mission.title}</div>
          {mission.description && (
            <div className="text-xs text-muted-foreground line-clamp-1">
              {mission.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "crew",
      label: "크루",
      render: (mission) => (
        <div className="flex items-center gap-2">
          {mission.crew?.avatar_url && (
            <img
              src={mission.crew.avatar_url}
              alt={mission.crew.name}
              className="h-6 w-6 rounded-full"
            />
          )}
          <span className="text-sm">{mission.crew?.name || "-"}</span>
        </div>
      ),
    },
    {
      key: "goal",
      label: "목표",
      render: (mission) => (
        <span className="text-sm">
          {mission.goal_type === "distance"
            ? `${mission.goal_value}km`
            : `${mission.goal_value}회`}
        </span>
      ),
      width: "100px",
    },
    {
      key: "participants",
      label: "참가자",
      render: (mission) => (
        <span className="text-sm">
          {mission.participantCount}명
          <span className="text-muted-foreground">
            {" "}
            ({mission.completedCount}명 완료)
          </span>
        </span>
      ),
      width: "150px",
    },
    {
      key: "period",
      label: "기간",
      render: (mission) => (
        <div className="text-xs text-muted-foreground">
          {new Date(mission.start_date).toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
          })}{" "}
          ~{" "}
          {new Date(mission.end_date).toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
          })}
        </div>
      ),
      width: "120px",
    },
    {
      key: "status",
      label: "상태",
      render: (mission) => getMissionStatus(mission.end_date),
      width: "100px",
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
          <h1 className="text-2xl font-bold">미션 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            전체 미션 목록을 조회하고 관리합니다
          </p>
        </div>

        <FilterBar
          searchValue={searchValue}
          onSearchChange={handleSearch}
          searchPlaceholder="미션명 또는 설명으로 검색..."
          filters={[
            {
              key: "status",
              label: "상태",
              options: [
                { label: "진행중", value: "active" },
                { label: "종료", value: "ended" },
              ],
              value: statusFilter,
              onChange: handleStatusFilter,
            },
          ]}
          onClear={handleClearFilters}
        />

        <DataTable
          columns={columns}
          data={missions}
          keyExtractor={(mission) => mission.id}
          onRowClick={(mission) =>
            router.push(`/admin-dashboard/missions/${mission.id}`)
          }
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
