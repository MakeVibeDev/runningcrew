import { NextResponse, NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;

    // 페이지네이션 파라미터
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // 검색 파라미터
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // 기본 쿼리 구성
    let query = supabase.from("crews").select("*", { count: "exact" });

    // 검색 조건 추가
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // 정렬
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    // 페이지네이션
    query = query.range(offset, offset + limit - 1);

    const { data: crews, error, count } = await query;

    if (error) throw error;

    // 각 크루의 추가 정보 가져오기 (멤버 수, 미션 수)
    const crewsWithStats = await Promise.all(
      (crews || []).map(async (crew) => {
        // 멤버 수
        const { count: memberCount } = await supabase
          .from("crew_members")
          .select("*", { count: "exact", head: true })
          .eq("crew_id", crew.id);

        // 미션 수
        const { count: missionCount } = await supabase
          .from("missions")
          .select("*", { count: "exact", head: true })
          .eq("crew_id", crew.id);

        // 크루장 정보
        const { data: leader } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", crew.owner_id)
          .single();

        return {
          ...crew,
          memberCount: memberCount || 0,
          missionCount: missionCount || 0,
          leader: leader || null,
        };
      })
    );

    return NextResponse.json({
      crews: crewsWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("크루 목록 로드 오류:", error);
    return NextResponse.json(
      { error: "크루 목록 로드에 실패했습니다." },
      { status: 500 }
    );
  }
}
