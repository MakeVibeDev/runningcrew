"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useSupabase } from "@/components/providers/supabase-provider";
import { KakaoLoginButton } from "@/components/ui/oauth-button";

const initialState = {
  crewId: "",
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  targetDistance: "",
};

export default function MissionCreatePage() {
  const router = useRouter();
  const { user, client, loading, signInWithOAuth } = useSupabase();
  const [form, setForm] = useState(initialState);
  const [crews, setCrews] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isFetchingCrews, setFetchingCrews] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!user) return;
    setFetchingCrews(true);
    void client
      .from("crews")
      .select("id,name")
      .eq("owner_id", user.id)
      .order("name")
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          console.error("크루 목록을 불러오지 못했습니다.", fetchError);
          setError("크루 목록을 불러오지 못했습니다.");
        } else {
          setCrews(data ?? []);
          if ((data?.length ?? 0) > 0) {
            setForm((prev) => ({ ...prev, crewId: (data?.[0] as { id: string } | undefined)?.id ?? "" }));
          }
        }
        setFetchingCrews(false);
      });
  }, [client, user]);

  const canSubmit = useMemo(() => {
    return (
      !!user &&
      !!form.crewId &&
      form.title.trim().length > 1 &&
      form.startDate !== "" &&
      form.endDate !== ""
    );
  }, [form, user]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setSuccess(null);

    startTransition(() => {
      void client
        .from("missions")
        .insert({
          crew_id: form.crewId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          start_date: form.startDate,
          end_date: form.endDate,
          target_distance_km: form.targetDistance ? Number(form.targetDistance) : null,
        } as never)
        .select("id, crew_id")
        .single()
        .then(({ data, error: insertError }) => {
          if (insertError) {
            console.error("미션 생성 실패", insertError);
            setError(insertError.message ?? "미션을 생성하는 중 오류가 발생했습니다.");
            return;
          }
          setSuccess("미션이 생성되었습니다.");
          setForm((prev) => ({ ...prev, title: "", description: "", targetDistance: "" }));
          if (data) {
            setTimeout(() => {
              router.replace(`/crews/${form.crewId}`);
            }, 800);
          }
        });
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-14">
        <h1 className="text-3xl font-semibold">미션 생성</h1>
        <p className="rounded-2xl border border-border/60 bg-muted/40 p-6 text-sm text-muted-foreground">
          로그인 상태를 확인하는 중입니다...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-14">
        <h1 className="text-3xl font-semibold">미션 생성</h1>
        <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/40 p-6 text-sm text-muted-foreground">
          <p>미션을 만들기 위해서는 먼저 로그인해야 합니다.</p>
          <KakaoLoginButton onClick={() => void signInWithOAuth("kakao")} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-14">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">신규 미션 등록</p>
        <h1 className="text-3xl font-semibold">미션 생성</h1>
        <p className="text-sm text-muted-foreground">
          크루를 선택하고 미션 정보를 입력하면 바로 Supabase에 저장됩니다.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
          <h2 className="text-lg font-semibold">기본 정보</h2>
          <p className="mt-1 text-sm text-muted-foreground">필수 항목을 모두 채워주세요.</p>

          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="crewId">
                대상 크루
              </label>
              <select
                id="crewId"
                name="crewId"
                value={form.crewId}
                onChange={handleChange}
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                disabled={isFetchingCrews}
              >
                {crews.length === 0 ? (
                  <option value="">등록된 크루가 없습니다</option>
                ) : (
                  crews.map((crew) => (
                    <option key={crew.id} value={crew.id}>
                      {crew.name}
                    </option>
                  ))
                )}
              </select>
              <p className="text-xs text-muted-foreground">
                미션은 현재 로그인한 계정이 오너로 등록된 크루에만 생성할 수 있습니다.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="title">
                미션 이름
              </label>
              <input
                id="title"
                name="title"
                type="text"
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="예: 10월 장거리 빌드업"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="description">
                미션 설명 (선택)
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="미션 목표, 참여 조건 등을 간단히 적어주세요."
                value={form.description}
                onChange={handleChange}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="startDate">
                  시작일
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  className="w-full rounded-xl border border-border/60 bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={form.startDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="endDate">
                  종료일
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  className="w-full rounded-xl border border-border/60 bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={form.endDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="targetDistance">
                목표 거리 (km, 선택)
              </label>
              <input
                id="targetDistance"
                name="targetDistance"
                type="number"
                min="0"
                step="0.1"
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="예: 150"
                value={form.targetDistance}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-100/40 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-100/40 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">미션 생성 후 크루 상세 페이지에서 곧바로 확인할 수 있습니다.</p>
          <button
            type="submit"
            disabled={!canSubmit || isPending}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "생성 중..." : "미션 생성"}
          </button>
        </div>
      </form>
    </div>
  );
}
