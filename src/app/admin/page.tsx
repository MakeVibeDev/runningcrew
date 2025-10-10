import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold">관리자 대시보드</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 기록 관리 */}
        <Link
          href="/admin/records"
          className="group rounded-lg border border-border bg-background p-6 transition hover:border-orange-500 hover:shadow-md"
        >
          <div className="mb-4 text-4xl">📊</div>
          <h2 className="mb-2 text-xl font-semibold group-hover:text-orange-500">
            기록 관리
          </h2>
          <p className="text-sm text-muted-foreground">
            러닝 기록 조회, 수정, 삭제
          </p>
        </Link>

        {/* 사용자 관리 */}
        <Link
          href="/admin/users"
          className="group rounded-lg border border-border bg-background p-6 transition hover:border-orange-500 hover:shadow-md"
        >
          <div className="mb-4 text-4xl">👥</div>
          <h2 className="mb-2 text-xl font-semibold group-hover:text-orange-500">
            사용자 관리
          </h2>
          <p className="text-sm text-muted-foreground">
            사용자 정보 조회 및 관리
          </p>
        </Link>

        {/* 크루 관리 */}
        <Link
          href="/admin/crews"
          className="group rounded-lg border border-border bg-background p-6 transition hover:border-orange-500 hover:shadow-md"
        >
          <div className="mb-4 text-4xl">🏃</div>
          <h2 className="mb-2 text-xl font-semibold group-hover:text-orange-500">
            크루 관리
          </h2>
          <p className="text-sm text-muted-foreground">
            크루 정보 조회 및 관리
          </p>
        </Link>
      </div>
    </div>
  );
}
