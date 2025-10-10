import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin?redirect=/admin");
  }

  // 관리자 권한 확인
  const { data: profile } = await supabase
    .from("profiles")
    .select("crew_role")
    .eq("id", user.id)
    .single<{ crew_role: string }>();

  if (!profile || profile.crew_role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Admin Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="text-xl font-bold">
                🛠️ 관리자
              </Link>
              <nav className="flex gap-4">
                <Link
                  href="/admin/records"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  기록 관리
                </Link>
                <Link
                  href="/admin/users"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  사용자 관리
                </Link>
                <Link
                  href="/admin/crews"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  크루 관리
                </Link>
              </nav>
            </div>
            <Link
              href="/"
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              메인으로
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
