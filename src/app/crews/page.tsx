import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
              실제 가입/승인 플로우는 회원 인증이 정식 도입된 뒤 제공될 예정입니다.
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
          <Card key={crew.id} className="group relative overflow-hidden">
            {/* 블러 배경 */}
            {crew.logoImageUrl && (
              <div className="absolute inset-0 -z-10">
                <Image
                  src={crew.logoImageUrl}
                  alt=""
                  fill
                  className="scale-110 object-cover opacity-15 blur-3xl saturate-150"
                  sizes="(min-width: 1024px) 33vw, 100vw"
                />
              </div>
            )}

            <CardHeader className="gap-3 border-b-0 p-0">
              <Link href={`/crews/${crew.slug}`} className="relative block h-40 w-full bg-muted/50 backdrop-blur-sm">
                {crew.logoImageUrl ? (
                  <Image
                    src={crew.logoImageUrl}
                    alt={`${crew.name} 로고`}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-contain p-4"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center px-4 text-center text-2xl font-bold text-foreground/70">
                    {crew.name}
                  </div>
                )}
              </Link>
              <div className="px-5 pt-4">
                <CardTitle>{crew.name}</CardTitle>
                <CardDescription>{crew.activityRegion}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground/90">
                {crew.description ?? "소개가 곧 업데이트될 예정입니다."}
              </p>
              <div className="rounded-xl border border-border/50 bg-muted/50 p-4 text-sm text-muted-foreground backdrop-blur-sm">
                <p>
                  구성원 <span className="font-semibold text-foreground">{crew.memberCount}명</span>
                </p>
              </div>
              <div className="flex gap-2 text-sm">
                <Link
                  href={`/crews/${crew.slug}`}
                  className="flex-1 rounded-lg bg-foreground px-4 py-2 text-center font-semibold text-background hover:opacity-90"
                >
                  상세 보기
                </Link>
                <Link
                  href="/missions"
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-center font-semibold hover:bg-muted"
                >
                  미션 둘러보기
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
