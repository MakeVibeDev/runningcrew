"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        setLoading(false);
        return;
      }

      // 로그인 성공
      router.push("/admin-dashboard");
      router.refresh();
    } catch {
      setError("서버 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-border bg-background p-8 shadow-lg">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">🛠️ 관리자 로그인</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              RunningCrew 관리자 페이지
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium"
              >
                사용자 이름
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-orange-500 px-4 py-3 font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push("/")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← 메인으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
