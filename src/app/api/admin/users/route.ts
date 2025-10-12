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
    let query = supabase.from("profiles").select("*", { count: "exact" });

    // 검색 조건 추가
    if (search) {
      query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    // 정렬
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    // 페이지네이션
    query = query.range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) throw error;

    // 각 사용자의 추가 정보 가져오기 (크루 수, 기록 수)
    const usersWithStats = await Promise.all(
      (users || []).map(async (user) => {
        // 가입한 크루 수
        const { count: crewCount } = await supabase
          .from("crew_members")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        // 등록한 기록 수
        const { count: recordCount } = await supabase
          .from("records")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        // 활성 제재 여부 확인
        const { data: activeSanction } = await supabase
          .from("sanctions")
          .select("type, end_at")
          .eq("profile_id", user.id)
          .eq("is_active", true)
          .single();

        return {
          ...user,
          crewCount: crewCount || 0,
          recordCount: recordCount || 0,
          activeSanction: activeSanction
            ? {
                type: activeSanction.type,
                endAt: activeSanction.end_at,
              }
            : null,
        };
      })
    );

    return NextResponse.json({
      users: usersWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("사용자 목록 로드 오류:", error);
    return NextResponse.json(
      { error: "사용자 목록 로드에 실패했습니다." },
      { status: 500 }
    );
  }
}
