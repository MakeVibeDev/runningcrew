"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { fetchCrewBySlug, fetchCrewMembers } from "@/lib/supabase/rest";

type Member = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: string;
};

type Crew = {
  id: string;
  name: string;
  slug: string;
};

export default function CrewMembersPage() {
  const params = useParams();
  const router = useRouter();
  const crewSlug = params?.crewId as string;

  const [crew, setCrew] = useState<Crew | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<"joined_date" | "name">("joined_date");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Fetch crew info
        const crewData = await fetchCrewBySlug(crewSlug);
        if (!crewData) {
          router.push("/crews");
          return;
        }
        setCrew({
          id: crewData.id,
          name: crewData.name,
          slug: crewData.slug,
        });

        // Fetch members
        const membersData = await fetchCrewMembers(crewData.id, {
          search,
          orderBy,
        });
        setMembers(membersData);
      } catch (error) {
        console.error("Failed to load crew members:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [crewSlug, search, orderBy, router]);

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-muted/40 pb-8">
      <div className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <div>
            <h1 className="text-3xl font-semibold">크루원 목록</h1>
            {crew && (
              <p className="mt-1 text-sm text-muted-foreground">{crew.name}</p>
            )}
          </div>
          <Link
            href={`/crews/${crewSlug}`}
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            크루 홈으로
          </Link>
        </div>
      </div>

      <main className="mx-auto mt-6 max-w-5xl px-6">
        {/* Search and Filter */}
        <div className="mb-6 flex items-center gap-3">
          <input
            type="text"
            placeholder="이름으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <select
            value={orderBy}
            onChange={(e) => setOrderBy(e.target.value as "joined_date" | "name")}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="joined_date">가입일자</option>
            <option value="name">이름순</option>
          </select>
        </div>

        {/* Members Count */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            총 {members.length}명의 크루원
          </p>
        </div>

        {/* Members List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-lg border border-border bg-background p-8 text-center">
            <p className="text-muted-foreground">
              {search ? "검색 결과가 없습니다." : "아직 크루원이 없습니다."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <Link
                key={member.id}
                href={`/profile/${member.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-4 transition hover:bg-muted/50"
              >
                <Avatar
                  src={member.avatarUrl}
                  alt={member.displayName}
                  size="md"
                  className="border border-border/60"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{member.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatJoinDate(member.joinedAt)} 가입
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
