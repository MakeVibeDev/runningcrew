import type { Metadata } from "next";
import Link from "next/link";

import { CrewCard } from "@/components/crew/crew-card";
import { fetchCrewList } from "@/lib/supabase/rest";

export const metadata: Metadata = {
  title: "크루 탐색",
  description: "함께 달릴 러닝 크루를 찾아보세요. 다양한 지역과 목표를 가진 러닝 크루들이 활동하고 있습니다.",
  openGraph: {
    title: "크루 탐색 | RunningCrew",
    description: "함께 달릴 러닝 크루를 찾아보세요",
  },
};

export const revalidate = 0;

export default async function CrewsPage() {
  const crews = await fetchCrewList();

  return (
    <div className="min-h-screen bg-muted/40 pb-16">
      <div className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-start justify-between px-6 py-6">
          <div>
            <p className="text-sm text-muted-foreground">크루 탐색</p>
            <h1 className="text-3xl font-semibold">주요 크루 미리보기</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              실제 가입은 리더가 승인되어야 합니다.
            </p>
          </div>
          <Link
            href="/crews/create"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
          >
            + 크루 생성
          </Link>
        </div>
      </div>

      <main className="mx-auto mt-8 grid max-w-6xl gap-6 px-6 lg:grid-cols-3">
        {crews.map((crew) => (
          <CrewCard key={crew.id} crew={crew} variant="detailed" />
        ))}
      </main>
    </div>
  );
}
