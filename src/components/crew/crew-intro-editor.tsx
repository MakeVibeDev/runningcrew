"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useSupabase } from "@/components/providers/supabase-provider";

type CrewIntroEditorProps = {
  crewId: string;
  ownerId: string;
  defaultDescription: string | null;
  defaultIntro: string | null;
};

export function CrewIntroEditor({ crewId, ownerId, defaultDescription, defaultIntro }: CrewIntroEditorProps) {
  const router = useRouter();
  const { user, client } = useSupabase();
  const [description, setDescription] = useState(defaultDescription ?? "");
  const [intro, setIntro] = useState(defaultIntro ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!user || user.id !== ownerId) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(() => {
      client
        .from("crews")
        .update({
          description: description.trim() || null,
          intro: intro.trim() || null,
        })
        .eq("id", crewId)
        .then(({ error: updateError }) => {
          if (updateError) {
            console.error("크루 소개 업데이트 실패", updateError);
            setError("크루 소개를 저장하는 중 문제가 발생했습니다.");
            return;
          }
          setMessage("크루 소개가 저장되었습니다.");
          setTimeout(() => {
            router.refresh();
          }, 400);
        });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="crew-description">
          한 줄 설명
        </label>
        <input
          id="crew-description"
          type="text"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="크루 운영 방식, 핵심 키워드를 간단히 적어주세요."
          className="w-full rounded-xl border border-border/60 bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="crew-intro">
          상세 소개 (마크다운 지원)
        </label>
        <textarea
          id="crew-intro"
          rows={6}
          value={intro}
          onChange={(event) => setIntro(event.target.value)}
          placeholder={"예)\n- 주간/야간 모임 시간\n- 주요 코스\n- 가입 조건"}
          className="w-full rounded-xl border border-border/60 bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-muted-foreground">줄바꿈은 자동으로 단락으로 변환됩니다.</p>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-100/40 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-100/40 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
        >
          {isPending ? "저장 중..." : "소개 저장"}
        </button>
      </div>
    </form>
  );
}
