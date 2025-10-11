import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "fallback-secret-key";

export async function GET(request: NextRequest) {
  try {
    // 관리자 토큰 검증
    const token = request.cookies.get("admin-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "인증되지 않았습니다." },
        { status: 401 }
      );
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.admin) {
      return NextResponse.json(
        { error: "관리자 권한이 없습니다." },
        { status: 403 }
      );
    }

    // URL 파라미터 가져오기
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";
    const offset = (page - 1) * pageSize;

    // Supabase 클라이언트 생성
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // 기록 조회 쿼리
    let query = supabase
      .from("records")
      .select(
        `
        id, recorded_at, distance_km, duration_seconds, pace_seconds_per_km,
        visibility, notes, image_path, created_at,
        profile:profiles!records_profile_id_fkey(id, display_name, avatar_url),
        mission:missions(id, title, crew_id, crew:crews(id, name, slug))
      `,
        { count: "exact" }
      )
      .order("recorded_at", { ascending: false });

    // 검색 필터 적용
    if (search) {
      query = query.ilike("profiles.display_name", `%${search}%`);
    }

    // 페이지네이션
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("기록 조회 오류:", error);
      return NextResponse.json(
        { error: "기록 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      records: data,
      totalCount: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("관리자 기록 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
