"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { DataTable, Column } from "@/components/admin/data-table";
import { FilterBar } from "@/components/admin/filter-bar";
import { Pagination } from "@/components/admin/pagination";
import { Badge } from "@/components/admin/badge";

interface User {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  crewCount: number;
  recordCount: number;
  activeSanction: {
    type: string;
    endAt: string | null;
  } | null;
}

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [users, setUsers] = useState<User[]>([]);
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
        await loadUsers();
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
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchValue]);

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        search: searchValue,
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("사용자 목록 로드 오류:", error);
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

  const columns: Column<User>[] = [
    {
      key: "username",
      label: "사용자명",
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-2">
          {user.avatar_url && (
            <img
              src={user.avatar_url}
              alt={user.username}
              className="h-8 w-8 rounded-full"
            />
          )}
          <div>
            <div className="font-medium">{user.username}</div>
            {user.full_name && (
              <div className="text-xs text-muted-foreground">{user.full_name}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "이메일",
      render: (user) => (
        <span className="text-sm">{user.email || "-"}</span>
      ),
    },
    {
      key: "crewCount",
      label: "크루",
      sortable: true,
      render: (user) => (
        <span className="text-sm">{user.crewCount}개</span>
      ),
      width: "80px",
    },
    {
      key: "recordCount",
      label: "기록",
      sortable: true,
      render: (user) => (
        <span className="text-sm">{user.recordCount}건</span>
      ),
      width: "80px",
    },
    {
      key: "status",
      label: "상태",
      render: (user) => {
        if (user.activeSanction) {
          const sanctionType = user.activeSanction.type;
          if (sanctionType === "ban") {
            return <Badge variant="danger">영구정지</Badge>;
          } else if (sanctionType === "suspension") {
            return <Badge variant="warning">일시정지</Badge>;
          } else if (sanctionType === "warning") {
            return <Badge variant="info">경고</Badge>;
          }
        }
        return <Badge variant="success">정상</Badge>;
      },
      width: "100px",
    },
    {
      key: "created_at",
      label: "가입일",
      sortable: true,
      render: (user) => (
        <span className="text-sm text-muted-foreground">
          {new Date(user.created_at).toLocaleDateString("ko-KR")}
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
          <h1 className="text-2xl font-bold">사용자 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            전체 사용자 목록을 조회하고 관리합니다
          </p>
        </div>

        <FilterBar
          searchValue={searchValue}
          onSearchChange={handleSearch}
          searchPlaceholder="사용자명 또는 이름으로 검색..."
          onClear={handleClearFilters}
        />

        <DataTable
          columns={columns}
          data={users}
          keyExtractor={(user) => user.id}
          onRowClick={(user) => router.push(`/admin-dashboard/users/${user.id}`)}
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
