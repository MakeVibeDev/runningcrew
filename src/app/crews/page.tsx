import Image from "next/image";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const crewList = [
  {
    id: "crew-1",
    name: "잠실 새벽 크루",
    intro: "평일 새벽 한강에서 빌드업과 인터벌을 함께하는 러너 모임",
    members: 64,
    location: "서울 송파구 잠실동",
    logo: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=120&q=80",
    missions: 3,
  },
  {
    id: "crew-2",
    name: "분당 스프린터즈",
    intro: "탄천 트랙 기반 스피드 세션. 5K·10K 기록 갱신을 목표로 합니다.",
    members: 48,
    location: "경기 성남시 분당구",
    logo: "https://images.unsplash.com/photo-1526406915894-7bcd65f60845?auto=format&fit=crop&w=120&q=80",
    missions: 2,
  },
  {
    id: "crew-3",
    name: "일요 러닝 클럽",
    intro: "매주 일요일 양재천·탄천에서 15~25K 롱런을 진행합니다.",
    members: 92,
    location: "서울 강남/서초 일대",
    logo: "https://images.unsplash.com/photo-1518611012118-fc3cf89fd77e?auto=format&fit=crop&w=120&q=80",
    missions: 4,
  },
];

export default function CrewsPage() {
  return (
    <div className="min-h-screen bg-muted/40 pb-16">
      <div className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-start justify-between px-6 py-6">
          <div>
            <p className="text-sm text-muted-foreground">크루 탐색</p>
            <h1 className="text-3xl font-semibold">주요 크루 미리보기</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              실제 가입/승인 플로우는 Supabase Auth 연동 이후 제공될 예정입니다.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </div>

      <main className="mx-auto mt-8 grid max-w-6xl gap-6 px-6 lg:grid-cols-3">
        {crewList.map((crew) => (
          <Card key={crew.id} className="overflow-hidden">
            <CardHeader className="gap-3 border-b-0 p-0">
              <div className="relative h-40 w-full bg-muted">
                <Image
                  src={crew.logo}
                  alt={`${crew.name} logo`}
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="px-5 pt-4">
                <CardTitle>{crew.name}</CardTitle>
                <CardDescription>{crew.location}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground/90">{crew.intro}</p>
              <div className="rounded-xl border border-border/50 bg-muted/50 p-4 text-sm text-muted-foreground">
                <p>
                  구성원 <span className="font-semibold text-foreground">{crew.members}명</span>
                </p>
                <p className="mt-1">
                  진행 중인 미션 <span className="font-semibold text-foreground">{crew.missions}개</span>
                </p>
              </div>
              <div className="flex gap-2 text-sm">
                <button className="flex-1 rounded-lg bg-foreground px-4 py-2 font-semibold text-background hover:opacity-90">
                  가입 신청(모의)
                </button>
                <button className="flex-1 rounded-lg border border-border px-4 py-2 font-semibold hover:bg-muted">
                  미션 보기
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
