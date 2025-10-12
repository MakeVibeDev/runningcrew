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

    // 검색 및 필터 파라미터
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all"; // all, active, ended
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // 기본 쿼리 구성
    let query = supabase.from("missions").select("*", { count: "exact" });

    // 검색 조건 추가
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // 상태 필터
    const today = new Date().toISOString().split("T")[0];
    if (status === "active") {
      query = query.gte("end_date", today);
    } else if (status === "ended") {
      query = query.lt("end_date", today);
    }

    // 정렬
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    // 페이지네이션
    query = query.range(offset, offset + limit - 1);

    const { data: missions, error, count } = await query;

    if (error) throw error;

    // 각 미션의 추가 정보 가져오기
    const missionsWithDetails = await Promise.all(
      (missions || []).map(async (mission) => {
        // 크루 정보
        const { data: crew } = await supabase
          .from("crews")
          .select("id, name, avatar_url")
          .eq("id", mission.crew_id)
          .single();

        // 참가자 수
        const { count: participantCount } = await supabase
          .from("mission_participants")
          .select("*", { count: "exact", head: true })
          .eq("mission_id", mission.id);

        // 완료자 수
        const { count: completedCount } = await supabase
          .from("mission_participants")
          .select("*", { count: "exact", head: true })
          .eq("mission_id", mission.id)
          .eq("completed", true);

        return {
          ...mission,
          crew,
          participantCount: participantCount || 0,
          completedCount: completedCount || 0,
        };
      })
    );

    return NextResponse.json({
      missions: missionsWithDetails,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("미션 목록 로드 오류:", error);
    return NextResponse.json(
      { error: "미션 목록 로드에 실패했습니다." },
      { status: 500 }
    );
  }
}
